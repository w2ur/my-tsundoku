-- 008_hardening.sql — close what a stranger with a free account could reach.
--
-- 1. Length limits on the text a user (and, through the contribution trigger,
--    the shared catalogue) stores: title, author, ISBN. Before this, any signed-in
--    user could push a multi-megabyte title that the first-writer-wins
--    community_books table then kept for everyone.
-- 2. The three SECURITY DEFINER functions of migrations 001/002 get a pinned
--    search_path (007's two already have one), so a hostile object created in a
--    schema earlier on the caller's path can never shadow what they call.
-- 3. delete_own_account() is no longer executable by anon (PUBLIC's default
--    EXECUTE is revoked; signed-in users keep it).
-- 4. The covers bucket's write rules, which until now existed only as dashboard
--    clicks, are written down here: a user may read, write and delete only under
--    '<own auth uuid>/' (the key src/lib/covers.ts uploadCover builds).
-- 5. owner_delete_community_book(p_id): the one way to remove a bad row from the
--    first-writer-wins community_books table without the dashboard. Gated on
--    public.site_owner (006); anyone else is refused.
--
-- NOT APPLIED BY ANY TOOL: paste it into the dashboard SQL editor, in order,
-- after 007 (the repo has no migration CLI).
--
-- BEFORE APPLYING — read-only checks, in the SQL editor:
--   -- (1) Rows that would violate the new limits. Expect 0 and 0. The CHECKs are
--   --     validated against existing rows, so a non-zero count makes this file
--   --     fail as a whole (it is one transaction) rather than strand those books.
--   SELECT count(*) FROM books
--    WHERE char_length(title) > 500 OR char_length(author) > 300 OR char_length(isbn) > 20;
--   SELECT count(*) FROM community_books
--    WHERE char_length(title) > 500 OR char_length(author) > 300 OR char_length(isbn) > 20;
--   -- (4) Every current policy on storage.objects. Section 4 drops the ones that
--   --     mention the covers bucket (the dashboard's names are unknown) and
--   --     replaces them; a policy that names no bucket at all (e.g. USING (true))
--   --     is NOT touched and would still let anyone write anywhere: drop it by hand.
--   SELECT policyname, cmd, roles, qual, with_check
--     FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';
--
--   -- If section 4's DROP POLICY reports "must be owner of table objects", the SQL
--   -- editor role does not own storage.objects here. The script rolls back as a
--   -- whole; apply sections 1 to 3 and 5 alone, then recreate the four covers
--   -- policies of section 4 in Dashboard > Storage > Policies, same expressions.
--
-- AFTER APPLYING, with two test accounts: an upload under the second account's own
-- folder succeeds, an upsert into the first account's folder is refused.
--
-- The limits are generous on purpose (the longest real title in the catalogue is
-- well under 200 characters).

-- 1. Length limits -----------------------------------------------------------
ALTER TABLE public.books
  ADD CONSTRAINT books_title_length  CHECK (char_length(title)  <= 500),
  ADD CONSTRAINT books_author_length CHECK (char_length(author) <= 300),
  ADD CONSTRAINT books_isbn_length   CHECK (isbn IS NULL OR char_length(isbn) <= 20);

ALTER TABLE public.community_books
  ADD CONSTRAINT community_books_title_length  CHECK (char_length(title)  <= 500),
  ADD CONSTRAINT community_books_author_length CHECK (char_length(author) <= 300),
  ADD CONSTRAINT community_books_isbn_length   CHECK (isbn IS NULL OR char_length(isbn) <= 20);

-- 2. Pinned search_path on every SECURITY DEFINER function -------------------
ALTER FUNCTION public.handle_new_user()        SET search_path = public, pg_temp;
ALTER FUNCTION public.contribute_to_catalog()  SET search_path = public, pg_temp;
ALTER FUNCTION public.delete_own_account()     SET search_path = public, pg_temp;

-- 3. Account deletion needs a signed-in caller ---------------------------------
REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;

-- 4. Covers bucket: each user owns one folder ---------------------------------
-- Reads of a public file go through the public URL and need no policy; the
-- SELECT policy is for the signed-in user's own listing (account deletion lists
-- '<uid>/' before removing) and for upsert. Service-role calls (the purge cron)
-- bypass these.
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (coalesce(qual, '') ILIKE '%covers%' OR coalesce(with_check, '') ILIKE '%covers%')
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', p.policyname);
  END LOOP;
END
$$;

CREATE POLICY "covers: read own folder" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "covers: insert into own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "covers: update own folder" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "covers: delete from own folder" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 5. Owner can delete a bad community row -------------------------------------
-- community_books has no delete policy for anyone, and first-writer-wins means a
-- wrong title stays for everybody. The owner (a row in public.site_owner, see 006)
-- may remove one by id; every other caller, anon included, is refused.
CREATE OR REPLACE FUNCTION public.owner_delete_community_book(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.site_owner WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'not the site owner' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.community_books WHERE id = p_id;
END
$$;

REVOKE ALL ON FUNCTION public.owner_delete_community_book(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_delete_community_book(uuid) TO authenticated;

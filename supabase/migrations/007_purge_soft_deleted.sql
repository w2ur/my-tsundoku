-- Retention: books soft-deleted for longer than the grace period are stripped
-- of everything the user wrote (title, author, notes, cover, ...) and the cover
-- files they leave behind are queued for deletion from Storage.
--
-- Why a stripped tombstone and not a DELETE: sync is incremental (updated_at >
-- cursor) and a device that was offline for more than the grace period must
-- still learn that the book is gone, otherwise it would push its local copy
-- back and resurrect it. The row therefore stays, with id, user_id, stage,
-- position, created_at, updated_at and deleted_at (what pullRemoteChanges and
-- reconcileLocalBooks read, src/lib/sync.ts), and `purged_at` marks it done.
--
-- BEFORE THE FIRST PURGE (stripping cannot be undone): count and export the
-- tombstones that will be stripped, in the dashboard SQL editor:
--   SELECT count(*) FROM books WHERE deleted_at < now() - interval '30 days' AND purged_at IS NULL;
--   then export  SELECT * FROM books WHERE deleted_at < now() - interval '30 days' AND purged_at IS NULL;  as CSV.
-- Applying this file schedules the first run at 03:30 UTC; do the export first.
--
-- RETENTION: the one place the grace period lives is the default of
-- `purge_soft_deleted_books(retention_days)` below. Change it there.
--
-- Why a queue and not a DELETE on storage.objects: deleting rows from
-- storage.objects leaves the files in the underlying object store. Files can
-- only be removed through the Storage API, so the SQL side records the paths
-- and the daily /api/purge-covers cron (service-role key) deletes the files.
-- Failed account-deletion cleanups land in the same queue.

-- 1. Queue of cover files awaiting deletion. No policy, no grants: only
--    SECURITY DEFINER functions and the service role touch it.
CREATE TABLE IF NOT EXISTS cover_cleanup_queue (
  path       text PRIMARY KEY,   -- 'user/book.jpg', or 'user/' for a whole prefix
  queued_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cover_cleanup_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON cover_cleanup_queue FROM anon, authenticated;

-- 2. Marks a tombstone whose content has been stripped.
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS purged_at timestamptz;

-- A restored book (deleted_at back to NULL) is no longer purged, so it can be
-- purged again if it is deleted later. A tombstone that is already purged stays
-- stripped even if a stale device pushes its old content back onto it.
CREATE OR REPLACE FUNCTION keep_purge_state_consistent()
RETURNS trigger AS $$
BEGIN
  IF NEW.deleted_at IS NULL THEN
    NEW.purged_at := NULL;
  ELSIF TG_OP = 'UPDATE' AND OLD.purged_at IS NOT NULL THEN
    NEW.purged_at := OLD.purged_at;
    NEW.title := '';
    NEW.author := '';
    NEW.cover_url := '';
    NEW.stage := 'tsundoku';
    NEW.position := 0;
    NEW.is_reading := false;
    NEW.notes := NULL;
    NEW.store_url := NULL;
    NEW.isbn := NULL;
    NEW.ol_work_id := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_keep_purge_state_consistent ON public.books;
CREATE TRIGGER trg_keep_purge_state_consistent
  BEFORE INSERT OR UPDATE ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION keep_purge_state_consistent();

-- 3. The purge, one statement: strip the tombstones and queue their covers
--    together, so a book can never lose its cover_url without its file being
--    queued. Cover files are keyed '<user_id>/<book_id>.jpg' (see
--    src/lib/covers.ts uploadCover); only books whose cover_url points at the
--    covers bucket have one. A book id containing '/' would build a path that
--    leaves the user's folder, so it is never queued.
CREATE OR REPLACE FUNCTION purge_soft_deleted_books(retention_days integer DEFAULT 30)
RETURNS integer AS $$
DECLARE
  purged integer;
BEGIN
  WITH victims AS (
    SELECT id, user_id, cover_url
    FROM public.books
    WHERE deleted_at < now() - make_interval(days => retention_days)
      AND purged_at IS NULL
    FOR UPDATE
  ),
  stripped AS (
    UPDATE public.books b
    SET title = '', author = '', cover_url = '', stage = 'tsundoku',
        position = 0, is_reading = false, notes = NULL, store_url = NULL,
        isbn = NULL, ol_work_id = NULL, purged_at = now()
    FROM victims v
    WHERE b.id = v.id
    RETURNING v.id, v.user_id, v.cover_url
  ),
  queued AS (
    INSERT INTO public.cover_cleanup_queue (path)
    SELECT user_id::text || '/' || id || '.jpg'
    FROM stripped
    WHERE cover_url LIKE '%/storage/v1/object/public/covers/%'
      AND id !~ '/'
    ON CONFLICT DO NOTHING
  )
  SELECT count(*) INTO purged FROM stripped;

  RETURN purged;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION purge_soft_deleted_books(integer) FROM PUBLIC, anon, authenticated;

-- 4. Called by the client before account deletion when its own storage cleanup
--    failed. A user may only queue '<own uuid>/' (a whole prefix) or
--    '<own uuid>/<file>.jpg' (no further '/', so no '..' traversal), and at
--    most 1000 paths per call (what a listing page returns): a bigger array is
--    refused with an error rather than silently truncated.
CREATE OR REPLACE FUNCTION record_cover_leftovers(paths text[])
RETURNS void AS $$
DECLARE
  uid text := auth.uid()::text;
BEGIN
  IF uid IS NULL THEN
    RETURN;
  END IF;
  IF cardinality(paths) > 1000 THEN
    RAISE EXCEPTION 'record_cover_leftovers: at most 1000 paths per call'
      USING ERRCODE = '54000';
  END IF;

  INSERT INTO public.cover_cleanup_queue (path)
  SELECT DISTINCT p FROM unnest(paths) AS p
  WHERE p = uid || '/'
     OR p ~ ('^' || uid || '/[^/]+\.jpg$')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION record_cover_leftovers(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION record_cover_leftovers(text[]) TO authenticated;

-- 5. Schedule. pg_cron is not used by earlier migrations; it is available on
--    Supabase (including the free tier). If CREATE EXTENSION is refused, enable
--    "pg_cron" under Database > Extensions in the dashboard and re-run this file.
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'purge-soft-deleted-books',
  '30 3 * * *',
  $$SELECT public.purge_soft_deleted_books()$$
);

-- Manual verification (dashboard SQL editor):
--   SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'purge-soft-deleted-books';
--   SELECT count(*) FROM books WHERE deleted_at < now() - interval '30 days' AND purged_at IS NULL;  -- expect 0 after the first run
--   SELECT status, return_message, start_time FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
--   SELECT * FROM cover_cleanup_queue;  -- drained to empty by /api/purge-covers

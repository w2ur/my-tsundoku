-- 005_public_shelf.sql — an opt-in public shelf.
-- A user who sets profiles.share_shelf = true exposes title/author/cover/stage/is_reading
-- of their books to anonymous readers through the public_shelf view. Nothing else leaves
-- the books table. The view runs as its owner (security_invoker = false, the default), which
-- is what lets anon read past the per-user RLS policy — the WHERE clause is the whole gate,
-- so it must never be widened without a review.
--
-- b.deleted_at IS NULL matters: the app soft-deletes by setting deleted_at (and stamping
-- updated_at = deleted_at at the same time — src/lib/sync.test.ts), so a shelf ordered by
-- updated_at.desc would otherwise put a just-deleted book first.
--
-- cover_url is sanitised rather than passed through: it can hold a Supabase Storage path
-- under the owner's auth uuid (src/lib/covers.ts, uploadCover) or a raw base64 data: URL
-- (resolveCoverUrl's offline fallback), neither of which should reach an anonymous reader.
-- Only a plain https:// URL that is not a Storage covers/ path survives; anything else comes
-- through as '' and the hub renders the paper-rectangle-plus-initial fallback instead.
-- 'https://%' and not 'http%': the looser pattern also matched 'http://' — an insecure cover
-- on an https page is a mixed-content block, so it would render as a broken image rather than
-- as the fallback — and matched anything merely STARTING with those four letters, 'httpfoo' included.
ALTER TABLE public.profiles ADD COLUMN share_shelf boolean NOT NULL DEFAULT false;

CREATE VIEW public.public_shelf AS
  SELECT
    b.title,
    b.author,
    CASE
      WHEN b.cover_url LIKE 'https://%' AND b.cover_url NOT LIKE '%/storage/v1/object/public/covers/%'
        THEN b.cover_url
      ELSE ''
    END AS cover_url,
    b.stage,
    b.is_reading,
    b.updated_at
  FROM public.books b
  JOIN public.profiles p ON p.id = b.user_id
  WHERE p.share_shelf AND b.deleted_at IS NULL;

GRANT SELECT ON public.public_shelf TO anon, authenticated;

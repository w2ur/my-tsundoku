-- Retention: soft-deleted books (and their notes, which are a column of
-- `books`) are purged for good after a grace period, and the cover files they
-- leave behind are queued for deletion from Storage.
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

-- 2. The purge. Cover files are keyed '<user_id>/<book_id>.jpg' (see
--    src/lib/covers.ts uploadCover); only books whose cover_url points at the
--    covers bucket have one.
CREATE OR REPLACE FUNCTION purge_soft_deleted_books(retention_days integer DEFAULT 30)
RETURNS integer AS $$
DECLARE
  purged integer;
BEGIN
  INSERT INTO public.cover_cleanup_queue (path)
  SELECT user_id::text || '/' || id || '.jpg'
  FROM public.books
  WHERE deleted_at < now() - make_interval(days => retention_days)
    AND cover_url LIKE '%/covers/%'
  ON CONFLICT DO NOTHING;

  DELETE FROM public.books
  WHERE deleted_at < now() - make_interval(days => retention_days);
  GET DIAGNOSTICS purged = ROW_COUNT;

  RETURN purged;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION purge_soft_deleted_books(integer) FROM PUBLIC, anon, authenticated;

-- 3. Called by the client before account deletion when its own storage cleanup
--    failed. A user may only queue paths under their own uuid.
CREATE OR REPLACE FUNCTION record_cover_leftovers(paths text[])
RETURNS void AS $$
BEGIN
  INSERT INTO public.cover_cleanup_queue (path)
  SELECT p FROM unnest(paths) AS p
  WHERE auth.uid() IS NOT NULL
    AND p LIKE auth.uid()::text || '/%'
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION record_cover_leftovers(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION record_cover_leftovers(text[]) TO authenticated;

-- 4. Schedule. pg_cron is not used by earlier migrations; it is available on
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
--   SELECT count(*) FROM books WHERE deleted_at < now() - interval '30 days';  -- expect 0 after the first run
--   SELECT status, return_message, start_time FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
--   SELECT * FROM cover_cleanup_queue;  -- drained to empty by /api/purge-covers

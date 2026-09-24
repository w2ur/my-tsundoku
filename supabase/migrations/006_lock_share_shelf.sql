-- 006_lock_share_shelf.sql — share_shelf and the public shelf become owner-controlled.
-- site_owner is created empty by this migration and public_shelf is gated on it, so the
-- shelf is empty until it is seeded. Immediately after applying this file, run in the
-- dashboard SQL editor: INSERT INTO public.site_owner (id) VALUES ('<owner auth uuid>');
-- (the uuid is never committed).
-- Layer 1: users may write only what the app writes (settings/page.tsx updates
-- contribute_to_catalog; handle_new_user() and delete_own_account are SECURITY DEFINER).
REVOKE UPDATE, INSERT ON public.profiles FROM anon, authenticated;
GRANT UPDATE (contribute_to_catalog) ON public.profiles TO authenticated;
-- Layer 2: the view can only ever show the site owner, whoever sets share_shelf.
CREATE TABLE public.site_owner (id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE);
ALTER TABLE public.site_owner ENABLE ROW LEVEL SECURITY;  -- no policy: unreadable to anon/authenticated
REVOKE ALL ON public.site_owner FROM anon, authenticated;
CREATE OR REPLACE VIEW public.public_shelf AS
  SELECT b.title, b.author,
    CASE WHEN b.cover_url LIKE 'https://%' AND b.cover_url NOT LIKE '%/storage/v1/object/public/covers/%'
      THEN b.cover_url ELSE '' END AS cover_url,
    b.stage, b.is_reading, b.updated_at
  FROM public.books b
  JOIN public.profiles p ON p.id = b.user_id
  WHERE p.share_shelf AND b.deleted_at IS NULL
    AND p.id IN (SELECT id FROM public.site_owner);
GRANT SELECT ON public.public_shelf TO anon, authenticated;

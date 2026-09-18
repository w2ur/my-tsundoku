-- 005_public_shelf.sql — an opt-in public shelf.
-- A user who sets profiles.share_shelf = true exposes title/author/cover/stage/is_reading
-- of their books to anonymous readers through the public_shelf view. Nothing else leaves
-- the books table. The view runs as its owner (security_invoker = false, the default), which
-- is what lets anon read past the per-user RLS policy — the WHERE clause is the whole gate,
-- so it must never be widened without a review.
ALTER TABLE public.profiles ADD COLUMN share_shelf boolean NOT NULL DEFAULT false;

CREATE VIEW public.public_shelf AS
  SELECT b.title, b.author, b.cover_url, b.stage, b.is_reading, b.updated_at
  FROM public.books b
  JOIN public.profiles p ON p.id = b.user_id
  WHERE p.share_shelf;

GRANT SELECT ON public.public_shelf TO anon, authenticated;

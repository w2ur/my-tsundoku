-- Fix: explicit WITH CHECK so INSERT/UPSERT passes RLS.
-- FOR ALL USING(...) without WITH CHECK should fall back,
-- but Supabase/PostgREST requires it explicitly.
DROP POLICY "users crud own books" ON books;
CREATE POLICY "users crud own books" ON books
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

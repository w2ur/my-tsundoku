-- ============================================
-- Tsundoku Cloud — Initial Schema
-- ============================================

-- 1. Profiles (one per auth user)
CREATE TABLE profiles (
  id                     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                  text NOT NULL,
  contribute_to_catalog  boolean NOT NULL DEFAULT true,
  created_at             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 2. Books (user's personal library)
CREATE TABLE books (
  id           uuid PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        text NOT NULL,
  author       text NOT NULL,
  cover_url    text NOT NULL DEFAULT '',
  stage        text NOT NULL CHECK (stage IN ('a_acheter', 'tsundoku', 'bibliotheque', 'revendre')),
  position     integer NOT NULL DEFAULT 0,
  is_reading   boolean NOT NULL DEFAULT false,
  notes        text,
  store_url    text,
  isbn         text,
  ol_work_id   text,
  created_at   timestamptz NOT NULL,
  updated_at   timestamptz NOT NULL,
  deleted_at   timestamptz
);

CREATE INDEX idx_books_user_updated ON books(user_id, updated_at);
CREATE INDEX idx_books_user_stage ON books(user_id, stage);

ALTER TABLE books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users crud own books" ON books FOR ALL USING (auth.uid() = user_id);

-- 3. Community books (shared catalog, anonymous)
CREATE TABLE community_books (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text NOT NULL,
  author           text NOT NULL,
  isbn             text,
  contributed_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_community_books_title_author
  ON community_books (lower(title), lower(author));
CREATE UNIQUE INDEX idx_community_books_isbn
  ON community_books (isbn) WHERE isbn IS NOT NULL;

ALTER TABLE community_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read community books" ON community_books FOR SELECT USING (true);
CREATE POLICY "no direct inserts" ON community_books FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct updates" ON community_books FOR UPDATE USING (false);
CREATE POLICY "no direct deletes" ON community_books FOR DELETE USING (false);

-- 4. Sync metadata
CREATE TABLE sync_metadata (
  user_id        uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  last_synced_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sync_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users crud own sync metadata" ON sync_metadata FOR ALL USING (auth.uid() = user_id);

-- 5. Community contribution trigger
CREATE OR REPLACE FUNCTION contribute_to_catalog()
RETURNS trigger AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.ol_work_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NOT (SELECT contribute_to_catalog FROM public.profiles WHERE id = NEW.user_id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.community_books (title, author, isbn)
  VALUES (NEW.title, NEW.author, NEW.isbn)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_contribute_to_catalog
  AFTER INSERT OR UPDATE ON books
  FOR EACH ROW
  EXECUTE FUNCTION contribute_to_catalog();

-- 6. Soft delete cleanup (run manually or via pg_cron)
-- DELETE FROM books WHERE deleted_at < now() - interval '30 days';

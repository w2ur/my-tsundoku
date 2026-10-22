// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

// Runs migrations 001-008 on a real Postgres (PGlite, in-process WASM) behind
// minimal stand-ins for what Supabase provides: the anon/authenticated roles,
// auth.uid() / auth.users, and storage.objects with storage.foldername().
// Each behaviour is first shown to hold on the pre-008 schema (the control), so
// a green result cannot come from a harness that refuses everything.

const dir = join(process.cwd(), "supabase/migrations");
const migration = (file: string) => readFileSync(join(dir, file), "utf8");

// pg_cron is a Supabase extension PGlite does not ship; the schedule is the only
// thing in 007 that needs it, and the purge itself is not under test here.
const withoutCron = (sql: string) =>
  sql.replace(/CREATE EXTENSION IF NOT EXISTS pg_cron;/, "").replace(/SELECT cron\.schedule\([\s\S]*?\);\n/, "");

const SUPABASE_STANDINS = `
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  CREATE SCHEMA storage;
  CREATE TABLE storage.objects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id text NOT NULL,
    name text NOT NULL,
    body text NOT NULL DEFAULT '',
    UNIQUE (bucket_id, name)
  );
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS
    $$ SELECT (string_to_array(name, '/'))[1:cardinality(string_to_array(name, '/')) - 1] $$;
  GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated;
  GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
  GRANT EXECUTE ON FUNCTION storage.foldername(text) TO anon, authenticated;
  GRANT ALL ON storage.objects TO anon, authenticated;
  -- Supabase grants every new public table to both roles; the migrations then revoke.
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
  -- ...and every new public function too, so a REVOKE from PUBLIC alone leaves anon able to execute.
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;
`;

const ALICE = "11111111-1111-4111-8111-111111111111";
const BOB = "22222222-2222-4222-8222-222222222222";

let db: PGlite;

async function as<T>(role: "anon" | "authenticated", uid: string | null, run: () => Promise<T>): Promise<T> {
  await db.exec(`SELECT set_config('request.jwt.claim.sub', '${uid ?? ""}', false); SET ROLE ${role};`);
  try {
    return await run();
  } finally {
    await db.exec("RESET ROLE");
  }
}

const insertBook = (id: string, uid: string, over: { title?: string; author?: string; isbn?: string | null } = {}) =>
  db.query(
    `INSERT INTO books (id, user_id, title, author, isbn, stage, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'tsundoku', now(), now())`,
    [id, uid, over.title ?? "Dune", over.author ?? "Frank Herbert", over.isbn ?? null],
  );

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STANDINS);
  for (const file of [
    "001_initial_schema.sql",
    "002_delete_own_account.sql",
    "003_fix_books_rls_insert.sql",
    "004_books_id_text.sql",
    "005_public_shelf.sql",
    "006_lock_share_shelf.sql",
    "007_purge_soft_deleted.sql",
  ]) {
    await db.exec(withoutCron(migration(file)));
  }
  await db.exec(`INSERT INTO auth.users (id, email) VALUES ('${ALICE}', 'a@example.test'), ('${BOB}', 'b@example.test')`);
  // What the dashboard may have left behind: a broad write policy on the covers
  // bucket (the migration must replace it) and an unrelated bucket's policy
  // (the migration must leave it alone).
  await db.exec(`
    CREATE POLICY "Allow authenticated uploads" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'covers');
    CREATE POLICY "Anyone can update covers" ON storage.objects
      FOR UPDATE TO authenticated USING (bucket_id = 'covers');
    CREATE POLICY "avatars: authenticated insert" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
  `);
}, 60_000);

afterAll(() => db.close());

describe("before 008 (controls)", () => {
  it("accepts a 10,000-character title, so the limit is not the harness's doing", async () => {
    await as("authenticated", ALICE, () => insertBook("ctl-long", ALICE, { title: "x".repeat(10_000) }));
    const { rows } = await db.query<{ n: number }>("SELECT char_length(title) AS n FROM books WHERE id = 'ctl-long'");
    expect(rows[0].n).toBe(10_000);
    await db.exec("DELETE FROM community_books; DELETE FROM books WHERE id = 'ctl-long'");
  });

  it("lets anon execute delete_own_account", async () => {
    const { rows } = await db.query<{ ok: boolean }>(
      "SELECT has_function_privilege('anon', 'delete_own_account()', 'EXECUTE') AS ok",
    );
    expect(rows[0].ok).toBe(true);
  });

  it("lets any signed-in user write into another user's covers folder", async () => {
    await as("authenticated", ALICE, () =>
      db.query("INSERT INTO storage.objects (bucket_id, name, body) VALUES ('covers', $1, 'planted')", [`${BOB}/planted.jpg`]),
    );
    const { rows } = await db.query("SELECT 1 FROM storage.objects WHERE name = $1", [`${BOB}/planted.jpg`]);
    expect(rows).toHaveLength(1);
    await db.exec("DELETE FROM storage.objects");
  });

  it("has no search_path pinned on the 001/002 definer functions", async () => {
    const { rows } = await db.query<{ proname: string; proconfig: string[] | null }>(
      "SELECT proname, proconfig FROM pg_proc WHERE proname IN ('handle_new_user','contribute_to_catalog','delete_own_account')",
    );
    expect(rows).toHaveLength(3);
    for (const r of rows) expect(r.proconfig).toBeNull();
  });
});

describe("008_hardening.sql", () => {
  beforeAll(async () => {
    await db.exec(migration("008_hardening.sql"));
  });

  describe("length limits", () => {
    it("refuses a 10,000-character title from a signed-in user", async () => {
      await expect(
        as("authenticated", ALICE, () => insertBook("long-title", ALICE, { title: "x".repeat(10_000) })),
      ).rejects.toThrow(/books_title_length/);
    });

    it("refuses an over-long author and an over-long ISBN", async () => {
      await expect(
        as("authenticated", ALICE, () => insertBook("long-author", ALICE, { author: "x".repeat(301) })),
      ).rejects.toThrow(/books_author_length/);
      await expect(
        as("authenticated", ALICE, () => insertBook("long-isbn", ALICE, { isbn: "9".repeat(21) })),
      ).rejects.toThrow(/books_isbn_length/);
    });

    it("refuses the same text on an update, not only an insert", async () => {
      await as("authenticated", ALICE, () => insertBook("edit-me", ALICE));
      await expect(
        as("authenticated", ALICE, () => db.query("UPDATE books SET title = $1 WHERE id = 'edit-me'", ["x".repeat(501)])),
      ).rejects.toThrow(/books_title_length/);
    });

    it("accepts values exactly at the limits and a book without an ISBN", async () => {
      await as("authenticated", ALICE, () =>
        insertBook("at-limits", ALICE, { title: "t".repeat(500), author: "a".repeat(300), isbn: "9".repeat(20) }),
      );
      await as("authenticated", ALICE, () => insertBook("no-isbn", ALICE));
      const { rows } = await db.query("SELECT 1 FROM books WHERE id IN ('at-limits', 'no-isbn')");
      expect(rows).toHaveLength(2);
    });

    it("limits the shared catalogue too, whoever writes it", async () => {
      await expect(
        db.query("INSERT INTO community_books (title, author) VALUES ($1, 'x')", ["x".repeat(501)]),
      ).rejects.toThrow(/community_books_title_length/);
    });

    it("still contributes a normal book to the catalogue through the trigger", async () => {
      const { rows } = await db.query("SELECT title FROM community_books WHERE title = 'Dune'");
      expect(rows).toHaveLength(1);
    });
  });

  describe("SECURITY DEFINER functions", () => {
    it("pins a search_path on every one of them, 007's included", async () => {
      const { rows } = await db.query<{ proname: string; proconfig: string[] | null }>(
        "SELECT proname, proconfig FROM pg_proc WHERE prosecdef AND pronamespace = 'public'::regnamespace",
      );
      expect(rows.map((r) => r.proname).sort()).toEqual([
        "contribute_to_catalog",
        "delete_own_account",
        "handle_new_user",
        "owner_delete_community_book",
        "purge_soft_deleted_books",
        "record_cover_leftovers",
      ]);
      for (const r of rows) {
        expect(r.proconfig?.some((c) => c.startsWith("search_path=")), r.proname).toBe(true);
      }
    });

    it("keeps the signup trigger working under the pinned path", async () => {
      await db.exec("INSERT INTO auth.users (id, email) VALUES ('33333333-3333-4333-8333-333333333333', 'c@example.test')");
      const { rows } = await db.query("SELECT 1 FROM profiles WHERE id = '33333333-3333-4333-8333-333333333333'");
      expect(rows).toHaveLength(1);
    });
  });

  describe("delete_own_account", () => {
    it("is no longer executable by anon, and still is by a signed-in user", async () => {
      await expect(as("anon", null, () => db.query("SELECT delete_own_account()"))).rejects.toThrow(/permission denied/);
      await as("authenticated", BOB, () => db.query("SELECT delete_own_account()"));
      const { rows } = await db.query("SELECT 1 FROM auth.users WHERE id = $1", [BOB]);
      expect(rows).toHaveLength(0);
      await db.exec(`INSERT INTO auth.users (id, email) VALUES ('${BOB}', 'b@example.test')`);
    });
  });

  describe("owner_delete_community_book", () => {
    const ROW = "44444444-4444-4444-8444-444444444444";
    const seed = () =>
      db.query("INSERT INTO community_books (id, title, author) VALUES ($1, 'Bad row', 'Nobody')", [ROW]);
    const remaining = async () =>
      (await db.query("SELECT 1 FROM community_books WHERE id = $1", [ROW])).rows.length;
    const call = () => db.query("SELECT owner_delete_community_book($1)", [ROW]);

    beforeAll(() => db.exec(`INSERT INTO site_owner (id) VALUES ('${ALICE}')`));
    afterAll(() => db.exec("DELETE FROM site_owner"));

    it("lets the site owner delete a community row", async () => {
      await seed();
      await as("authenticated", ALICE, call);
      expect(await remaining()).toBe(0);
    });

    it("refuses a signed-in user who is not the owner, and leaves the row", async () => {
      await seed();
      await expect(as("authenticated", BOB, call)).rejects.toThrow(/not the site owner/);
      expect(await remaining()).toBe(1);
    });

    it("refuses anon at the privilege level, and leaves the row", async () => {
      await expect(as("anon", null, call)).rejects.toThrow(/permission denied/);
      expect(await remaining()).toBe(1);
      await db.query("DELETE FROM community_books WHERE id = $1", [ROW]);
    });
  });

  describe("covers bucket", () => {
    const put = (uid: string, folder: string, file = "book.jpg", bucket = "covers") =>
      as("authenticated", uid, () =>
        db.query("INSERT INTO storage.objects (bucket_id, name, body) VALUES ($1, $2, 'mine')", [bucket, `${folder}/${file}`]),
      );

    it("lets a user upload under their own folder (the control)", async () => {
      await put(BOB, BOB);
      const { rows } = await db.query("SELECT 1 FROM storage.objects WHERE name = $1", [`${BOB}/book.jpg`]);
      expect(rows).toHaveLength(1);
    });

    it("refuses an upload into another user's folder", async () => {
      await expect(put(ALICE, BOB, "planted.jpg")).rejects.toThrow(/row-level security/);
    });

    it("refuses an upsert over another user's file and leaves it untouched", async () => {
      await expect(
        as("authenticated", ALICE, () =>
          db.query(
            `INSERT INTO storage.objects (bucket_id, name, body) VALUES ('covers', $1, 'overwritten')
             ON CONFLICT (bucket_id, name) DO UPDATE SET body = EXCLUDED.body`,
            [`${BOB}/book.jpg`],
          ),
        ),
      ).rejects.toThrow(/row-level security/);
      const { rows } = await db.query<{ body: string }>("SELECT body FROM storage.objects WHERE name = $1", [`${BOB}/book.jpg`]);
      expect(rows[0].body).toBe("mine");
    });

    it("does not let a user list, update or delete another user's files", async () => {
      const seen = await as("authenticated", ALICE, () => db.query("SELECT name FROM storage.objects WHERE bucket_id = 'covers'"));
      expect(seen.rows).toHaveLength(0);
      const upd = await as("authenticated", ALICE, () =>
        db.query("UPDATE storage.objects SET body = 'x' WHERE name = $1", [`${BOB}/book.jpg`]),
      );
      expect(upd.affectedRows).toBe(0);
      const del = await as("authenticated", ALICE, () =>
        db.query("DELETE FROM storage.objects WHERE name = $1", [`${BOB}/book.jpg`]),
      );
      expect(del.affectedRows).toBe(0);
    });

    it("lets a user list, replace and delete their own files", async () => {
      const seen = await as("authenticated", BOB, () => db.query("SELECT name FROM storage.objects WHERE bucket_id = 'covers'"));
      expect(seen.rows).toHaveLength(1);
      const upd = await as("authenticated", BOB, () =>
        db.query("UPDATE storage.objects SET body = 'v2' WHERE name = $1", [`${BOB}/book.jpg`]),
      );
      expect(upd.affectedRows).toBe(1);
      const del = await as("authenticated", BOB, () =>
        db.query("DELETE FROM storage.objects WHERE name = $1", [`${BOB}/book.jpg`]),
      );
      expect(del.affectedRows).toBe(1);
    });

    it("refuses anon any write", async () => {
      await expect(
        as("anon", null, () => db.query("INSERT INTO storage.objects (bucket_id, name) VALUES ('covers', 'anon/x.jpg')")),
      ).rejects.toThrow(/row-level security/);
    });

    it("leaves another bucket's policies alone", async () => {
      await put(ALICE, "anything", "avatar.png", "avatars");
      const { rows } = await db.query("SELECT 1 FROM storage.objects WHERE bucket_id = 'avatars'");
      expect(rows).toHaveLength(1);
    });

    it("can be applied twice (it replaces its own policies)", async () => {
      await db.exec(migration("008_hardening.sql").replace(/ALTER TABLE[\s\S]*?;\n\nALTER TABLE[\s\S]*?;\n/, ""));
      const { rows } = await db.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM pg_policies WHERE schemaname = 'storage' AND policyname LIKE 'covers:%'",
      );
      expect(rows[0].n).toBe(4);
    });
  });

  it("mentions CHECK, REVOKE and storage.objects, as the plan's done-when asks", () => {
    const sql = migration("008_hardening.sql");
    expect(sql).toContain("CHECK");
    expect(sql).toContain("REVOKE");
    expect(sql).toContain("storage.objects");
  });
});

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/007_purge_soft_deleted.sql"),
  "utf8",
);

// Script-level guard: the repo has no database harness, so these pin the
// properties of the migration that are easy to break by a careless edit.
describe("007_purge_soft_deleted.sql", () => {
  it("keeps the retention period in a single place", () => {
    const literals = sql.match(/retention_days integer DEFAULT (\d+)/g) ?? [];
    expect(literals).toHaveLength(1);
    expect(sql).toContain("$$SELECT public.purge_soft_deleted_books()$$");
  });

  it("strips tombstones and queues their covers in a single statement", () => {
    // One WITH ... INSERT statement: no window in which a cover is queued but
    // its book survives, or the book is stripped but its cover never queued.
    const body = sql.slice(sql.indexOf("CREATE OR REPLACE FUNCTION purge_soft_deleted_books"));
    expect(body).toMatch(/WITH victims AS[\s\S]*stripped AS \(\s*UPDATE public\.books[\s\S]*queued AS \(\s*INSERT INTO public\.cover_cleanup_queue/);
    expect(sql).not.toMatch(/DELETE FROM public\.books/);
  });

  it("keeps a tombstone (never hard-deletes) and marks it purged", () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS purged_at");
    expect(sql).toContain("AND purged_at IS NULL");
    expect(sql).toContain("purged_at = now()");
  });

  it("only queues covers that point at the covers bucket", () => {
    expect(sql).toContain("LIKE '%/storage/v1/object/public/covers/%'");
  });

  it("locks the queue and the purge away from client roles", () => {
    expect(sql).toContain("REVOKE ALL ON cover_cleanup_queue FROM anon, authenticated");
    expect(sql).toContain("REVOKE ALL ON FUNCTION purge_soft_deleted_books(integer) FROM PUBLIC, anon, authenticated");
  });

  it("restricts record_cover_leftovers to the caller's own prefix and plain files", () => {
    expect(sql).toContain("p = uid || '/'");
    expect(sql).toContain("p ~ ('^' || uid || '/[^/]+\\.jpg$')");
  });

  it("caps record_cover_leftovers at 1000 paths and refuses more", () => {
    expect(sql).toContain("cardinality(paths) > 1000");
    expect(sql).toContain("RAISE EXCEPTION");
  });

  describe("keep_purge_state_consistent trigger", () => {
    const start = sql.indexOf("CREATE OR REPLACE FUNCTION keep_purge_state_consistent");
    const trigger = sql.slice(start, sql.indexOf("DROP TRIGGER IF EXISTS", start));

    it("stops client roles from setting or clearing purged_at, before any other logic", () => {
      const guard = trigger.indexOf("IF current_user IN ('anon', 'authenticated') THEN");
      expect(guard).toBeGreaterThan(-1);
      expect(trigger).toContain(
        "NEW.purged_at := CASE WHEN TG_OP = 'UPDATE' THEN OLD.purged_at ELSE NULL END;",
      );
      expect(guard).toBeLessThan(trigger.indexOf("IF NEW.deleted_at IS NULL THEN"));
    });

    it("keeps a purged row deleted when a stale edit (not newer than the delete) arrives", () => {
      const stale = trigger.indexOf(
        "OLD.purged_at IS NOT NULL AND NEW.deleted_at IS NULL\n     AND NEW.updated_at <= OLD.deleted_at",
      );
      expect(stale).toBeGreaterThan(-1);
      expect(trigger).toContain("NEW.deleted_at := OLD.deleted_at;");
      expect(trigger).toContain("NEW.updated_at := OLD.updated_at;");
      // Must run before the restore branch that clears purged_at.
      expect(stale).toBeLessThan(trigger.indexOf("IF NEW.deleted_at IS NULL THEN"));
    });

    it("still restores on a newer edit and never writes the cleanup queue", () => {
      expect(trigger).toContain("IF NEW.deleted_at IS NULL THEN\n    NEW.purged_at := NULL;");
      expect(trigger).not.toContain("cover_cleanup_queue");
    });
  });
});

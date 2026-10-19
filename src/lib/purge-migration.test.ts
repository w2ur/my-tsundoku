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

  it("queues covers before deleting the books that reference them", () => {
    expect(sql.indexOf("INSERT INTO public.cover_cleanup_queue")).toBeGreaterThan(-1);
    expect(sql.indexOf("INSERT INTO public.cover_cleanup_queue")).toBeLessThan(
      sql.indexOf("DELETE FROM public.books"),
    );
  });

  it("locks the queue and the purge away from client roles", () => {
    expect(sql).toContain("REVOKE ALL ON cover_cleanup_queue FROM anon, authenticated");
    expect(sql).toContain("REVOKE ALL ON FUNCTION purge_soft_deleted_books(integer) FROM PUBLIC, anon, authenticated");
  });

  it("restricts record_cover_leftovers to the caller's own prefix", () => {
    expect(sql).toContain("p LIKE auth.uid()::text || '/%'");
  });
});

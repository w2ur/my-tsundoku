import { describe, it, expect, vi } from "vitest";
import fc from "fast-check";
import { validateBookRecord } from "./book-validation";
import { mapBookToSupabase } from "./sync";
import { STAGES } from "./constants";

// mapBookToSupabase is a pure transform; the mocks only satisfy sync.ts's
// module graph, which constructs a Supabase client at import time.
vi.mock("./db", () => ({ db: {} }));
vi.mock("./supabase", () => ({ supabase: null }));

/** Deliberately messy records: the shapes a hand-edited backup file produces. */
const looseRecord = fc.record(
  {
    id: fc.oneof(fc.string(), fc.constant(undefined), fc.integer()),
    title: fc.oneof(fc.string(), fc.constant(undefined), fc.constant(null)),
    author: fc.oneof(fc.string(), fc.constant(undefined), fc.constant(null)),
    stage: fc.oneof(fc.constantFrom(...STAGES), fc.string(), fc.constant(undefined)),
    coverUrl: fc.oneof(fc.string(), fc.constant(undefined)),
    position: fc.oneof(fc.integer(), fc.constant(undefined), fc.constant(NaN)),
    isReading: fc.oneof(fc.boolean(), fc.constant(undefined)),
    createdAt: fc.oneof(
      fc.integer({ min: 0, max: 4102444800000 }),
      fc.constant(undefined),
      fc.constant(NaN),
      fc.constant(Infinity),
      fc.double(),
      fc.string(),
    ),
    updatedAt: fc.oneof(
      fc.integer({ min: 0, max: 4102444800000 }),
      fc.constant(undefined),
      fc.constant(NaN),
      fc.double(),
    ),
    notes: fc.oneof(fc.string(), fc.constant(undefined), fc.constant(null)),
    deletedAt: fc.oneof(fc.integer({ min: 0, max: 4102444800000 }), fc.constant(undefined), fc.constant(NaN)),
  },
  { requiredKeys: [] },
);

describe("validateBookRecord properties", () => {
  it("anything it accepts can be serialized for the cloud without throwing", () => {
    // This is the guarantee that closes the import gap: a record that passes
    // validation can never be the book that throws inside mapBookToSupabase and
    // gets retried forever, nor the one Postgres refuses with a NOT NULL or
    // CHECK violation.
    fc.assert(
      fc.property(looseRecord, (record) => {
        const result = validateBookRecord(record);
        if (!result.ok) return;

        const row = mapBookToSupabase(result.book, "00000000-0000-4000-8000-000000000000");

        expect(STAGES).toContain(row.stage);
        // Present and a string is exactly what the NOT NULL columns require.
        expect(typeof row.title).toBe("string");
        expect(typeof row.author).toBe("string");
        expect(typeof row.cover_url).toBe("string");
        expect(Number.isInteger(row.position) || Number.isFinite(row.position)).toBe(true);
        expect(typeof row.is_reading).toBe("boolean");
        for (const iso of [row.created_at, row.updated_at]) {
          expect(Number.isNaN(new Date(iso).getTime())).toBe(false);
        }
        if (row.deleted_at !== null) {
          expect(Number.isNaN(new Date(row.deleted_at).getTime())).toBe(false);
        }
      }),
      { numRuns: 1000 },
    );
  });

  it("is idempotent — revalidating an accepted book accepts it unchanged", () => {
    fc.assert(
      fc.property(looseRecord, (record) => {
        const first = validateBookRecord(record);
        if (!first.ok) return;
        const second = validateBookRecord(first.book);
        expect(second.ok).toBe(true);
        if (second.ok) expect(second.book).toEqual(first.book);
      }),
      { numRuns: 1000 },
    );
  });

  it("never throws, whatever it is handed", () => {
    fc.assert(
      fc.property(fc.anything(), (value) => {
        expect(() => validateBookRecord(value)).not.toThrow();
      }),
      { numRuns: 1000 },
    );
  });
});

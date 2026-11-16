import { describe, it, expect, vi } from "vitest";
import * as fc from "fast-check";
import { chunkBySize, coalesceQueue, mapBookToSupabase, mapSupabaseToBook } from "./sync";
import type { SyncQueueEntry } from "./db";
import type { Book, Stage } from "./types";

// mapBookToSupabase and mapSupabaseToBook are pure transforms that do not call
// db or supabase at module level. Mocks are provided only to satisfy the module
// graph when sync.ts is imported.
vi.mock("./db", () => ({ db: {} }));
vi.mock("./supabase", () => ({ supabase: null }));

const STAGES: Stage[] = ["a_acheter", "tsundoku", "bibliotheque", "revendre"];

// Optional string fields: round-trip only holds for non-empty strings because
// mapBookToSupabase maps undefined to null, and mapSupabaseToBook uses a
// truthiness guard (`if (row.notes)`) to restore them. An empty-string value
// would round-trip as undefined — that is intentional behaviour, not a bug.
const arbNonEmptyString = fc.string({ minLength: 1 });
const arbOptionalString = fc.option(arbNonEmptyString, { nil: undefined });
const arbOptionalTimestamp = fc.option(
  fc.integer({ min: 1, max: 2_000_000_000_000 }),
  { nil: undefined },
);

// Generate realistic Book values. Timestamps are positive integers so the
// `book.createdAt ?` guard in mapBookToSupabase always takes the ISO branch.
const arbBook: fc.Arbitrary<Book> = fc.record<Book>({
  id: fc.uuid(),
  title: arbNonEmptyString,
  author: arbNonEmptyString,
  coverUrl: fc.string(),
  stage: fc.constantFrom(...STAGES),
  position: fc.integer({ min: 0, max: 10_000 }),
  createdAt: fc.integer({ min: 1, max: 2_000_000_000_000 }),
  updatedAt: fc.integer({ min: 1, max: 2_000_000_000_000 }),
  isReading: fc.boolean(),
  notes: arbOptionalString,
  storeUrl: arbOptionalString,
  isbn: arbOptionalString,
  olWorkId: arbOptionalString,
  deletedAt: arbOptionalTimestamp,
});

describe("sync field-mapping property tests (round-trip)", () => {
  it("mapBookToSupabase → mapSupabaseToBook preserves all Book fields", () => {
    fc.assert(
      fc.property(arbBook, fc.uuid(), (book, userId) => {
        const row = mapBookToSupabase(book, userId);
        const restored = mapSupabaseToBook(row);

        expect(restored.id).toBe(book.id);
        expect(restored.title).toBe(book.title);
        expect(restored.author).toBe(book.author);
        expect(restored.coverUrl).toBe(book.coverUrl);
        expect(restored.stage).toBe(book.stage);
        expect(restored.position).toBe(book.position);
        expect(restored.isReading).toBe(book.isReading);

        // Timestamps: integer ms → ISO string → integer ms (exact round-trip)
        expect(restored.createdAt).toBe(book.createdAt);
        expect(restored.updatedAt).toBe(book.updatedAt);

        // Optional string fields: only present when non-empty (see note above)
        expect(restored.notes).toBe(book.notes);
        expect(restored.storeUrl).toBe(book.storeUrl);
        expect(restored.isbn).toBe(book.isbn);
        expect(restored.olWorkId).toBe(book.olWorkId);

        // deletedAt: undefined round-trips as undefined; set value round-trips exact
        if (book.deletedAt === undefined) {
          expect(restored.deletedAt).toBeUndefined();
        } else {
          expect(restored.deletedAt).toBe(book.deletedAt);
        }
      }),
      { numRuns: 500 },
    );
  });

  it("mapBookToSupabase always sets user_id to the provided userId", () => {
    fc.assert(
      fc.property(arbBook, fc.uuid(), (book, userId) => {
        const row = mapBookToSupabase(book, userId);
        expect(row.user_id).toBe(userId);
      }),
      { numRuns: 500 },
    );
  });

  it("mapBookToSupabase always emits valid ISO date strings", () => {
    fc.assert(
      fc.property(arbBook, fc.uuid(), (book, userId) => {
        const row = mapBookToSupabase(book, userId);
        expect(new Date(row.created_at).getTime()).not.toBeNaN();
        expect(new Date(row.updated_at).getTime()).not.toBeNaN();
      }),
      { numRuns: 500 },
    );
  });
});

describe("coalesceQueue property tests", () => {
  // Few distinct ids, so most runs contain several entries for the same book.
  const arbEntries: fc.Arbitrary<SyncQueueEntry[]> = fc
    .array(
      fc.record({
        bookId: fc.constantFrom("a", "b", "c", "d"),
        operation: fc.constantFrom<"upsert" | "delete">("upsert", "delete"),
        position: fc.integer({ min: 0, max: 1000 }),
      }),
      { maxLength: 40 },
    )
    .map((items) =>
      items.map((item, index) => ({
        id: index + 1,
        bookId: item.bookId,
        operation: item.operation,
        payload: { id: item.bookId, position: item.position },
        createdAt: index,
      })),
    );

  it("keeps exactly one group per book, holding that book's newest entry", () => {
    fc.assert(
      fc.property(arbEntries, (entries) => {
        const groups = coalesceQueue(entries);
        const bookIds = [...new Set(entries.map((e) => e.bookId))];

        expect(groups.map((g) => g.bookId).sort()).toEqual(bookIds.sort());
        for (const group of groups) {
          const own = entries.filter((e) => e.bookId === group.bookId);
          expect(group.latest).toBe(own[own.length - 1]);
        }
      }),
      { numRuns: 500 },
    );
  });

  it("accounts for every queue entry id exactly once", () => {
    fc.assert(
      fc.property(arbEntries, (entries) => {
        const ids = coalesceQueue(entries).flatMap((g) => g.ids);

        expect(ids.sort((x, y) => x - y)).toEqual(entries.map((e) => e.id));
      }),
      { numRuns: 500 },
    );
  });
});

describe("chunkBySize property tests", () => {
  const arbSizes = fc.array(fc.integer({ min: 0, max: 50 }), { maxLength: 60 });
  const arbMaxItems = fc.integer({ min: 1, max: 10 });
  const arbMaxSize = fc.integer({ min: 1, max: 80 });
  const size = (n: number) => n;

  it("preserves every item, in order", () => {
    fc.assert(
      fc.property(arbSizes, arbMaxItems, arbMaxSize, (sizes, maxItems, maxSize) => {
        expect(chunkBySize(sizes, maxItems, maxSize, size).flat()).toEqual(sizes);
      }),
      { numRuns: 500 },
    );
  });

  it("never emits an empty batch nor one over the item cap", () => {
    fc.assert(
      fc.property(arbSizes, arbMaxItems, arbMaxSize, (sizes, maxItems, maxSize) => {
        for (const chunk of chunkBySize(sizes, maxItems, maxSize, size)) {
          expect(chunk.length).toBeGreaterThan(0);
          expect(chunk.length).toBeLessThanOrEqual(maxItems);
        }
      }),
      { numRuns: 500 },
    );
  });

  it("keeps a batch under the size cap unless it is a single oversized item", () => {
    fc.assert(
      fc.property(arbSizes, arbMaxItems, arbMaxSize, (sizes, maxItems, maxSize) => {
        for (const chunk of chunkBySize(sizes, maxItems, maxSize, size)) {
          const total = chunk.reduce((sum, n) => sum + n, 0);
          if (chunk.length > 1) expect(total).toBeLessThanOrEqual(maxSize);
        }
      }),
      { numRuns: 500 },
    );
  });
});

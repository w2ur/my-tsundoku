import { describe, it } from "vitest";
import * as fc from "fast-check";
import { expect } from "vitest";
import { computeReorder } from "./books";

// computeReorder is a pure transform — no db or sync dependencies needed.
// We mock these modules only to satisfy the module graph when books.ts is
// imported; the functions under test never call them.
vi.mock("./db", () => ({ db: {} }));
vi.mock("./supabase", () => ({ supabase: null }));
vi.mock("./sync", () => ({ enqueueUpsert: vi.fn(), enqueueDelete: vi.fn() }));
vi.mock("./storage-persist", () => ({ requestStoragePersistOnce: vi.fn() }));

import { vi } from "vitest";

// Arbitrary: array of unique non-empty strings (IDs), length 1–10
const arbUniqueIds = fc
  .array(fc.string({ minLength: 1, maxLength: 8 }), { minLength: 1, maxLength: 10 })
  .filter((ids) => new Set(ids).size === ids.length);

// Scenario: (ids, movedId in ids, targetIndex in [0, ids.length-1])
// Constraining targetIndex to ids.length-1 ensures the splice always places
// movedId exactly at targetIndex (unconstrained targetIndex ≥ ids.length would
// cause the splice to append, landing at ids.length-1, not targetIndex).
const arbScenario = arbUniqueIds.chain((ids) =>
  fc.tuple(
    fc.constant(ids),
    fc.integer({ min: 0, max: ids.length - 1 }).map((i) => ids[i]),
    fc.integer({ min: 0, max: ids.length - 1 }),
  ),
);

describe("computeReorder property tests", () => {
  it("result is a permutation of the input ids (same multiset)", () => {
    fc.assert(
      fc.property(arbScenario, ([ids, movedId, targetIndex]) => {
        const result = computeReorder(ids, movedId, targetIndex);
        expect([...result].sort()).toEqual([...ids].sort());
      }),
      { numRuns: 1000 },
    );
  });

  it("moved id lands at the target index", () => {
    fc.assert(
      fc.property(arbScenario, ([ids, movedId, targetIndex]) => {
        const result = computeReorder(ids, movedId, targetIndex);
        expect(result[targetIndex]).toBe(movedId);
      }),
      { numRuns: 1000 },
    );
  });

  it("all other ids appear exactly once in the result", () => {
    fc.assert(
      fc.property(arbScenario, ([ids, movedId, targetIndex]) => {
        const result = computeReorder(ids, movedId, targetIndex);
        for (const id of ids) {
          expect(result.filter((r) => r === id)).toHaveLength(1);
        }
      }),
      { numRuns: 1000 },
    );
  });
});

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { findDuplicate, normalizeForCompare } from "./duplicates";
import type { Book, Stage } from "./types";

const arbStage: fc.Arbitrary<Stage> = fc.constantFrom(
  "a_acheter",
  "tsundoku",
  "bibliotheque",
  "revendre",
);

const arbBook: fc.Arbitrary<Book> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 12 }),
  title: fc.string({ minLength: 1, maxLength: 30 }),
  author: fc.string({ minLength: 1, maxLength: 30 }),
  coverUrl: fc.constant(""),
  stage: arbStage,
  position: fc.integer({ min: 0, max: 500 }),
  createdAt: fc.integer({ min: 0, max: 2_000_000_000_000 }),
  updatedAt: fc.integer({ min: 0, max: 2_000_000_000_000 }),
});

describe("findDuplicate properties", () => {
  it("always finds a live book when asked about that book's own fields", () => {
    fc.assert(
      fc.property(arbBook, (candidate) => {
        // Only meaningful when the book has comparable text at all.
        fc.pre(
          normalizeForCompare(candidate.title) !== "" &&
            normalizeForCompare(candidate.author) !== "",
        );
        const match = findDuplicate(
          { title: candidate.title, author: candidate.author },
          [candidate],
        );
        expect(match).not.toBeNull();
      }),
      { numRuns: 1000 },
    );
  });

  it("never matches inside a library where every book is soft-deleted", () => {
    fc.assert(
      fc.property(fc.array(arbBook, { maxLength: 10 }), arbBook, (library, candidate) => {
        const deleted = library.map((b) => ({ ...b, deletedAt: 1 }));
        expect(findDuplicate(candidate, deleted)).toBeNull();
      }),
      { numRuns: 1000 },
    );
  });
});

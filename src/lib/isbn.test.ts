import { describe, it, expect } from "vitest";
import {
  isValidISBN10,
  isValidISBN13,
  isValidISBN,
  normalizeIsbn,
  isbn10To13,
  toComparableIsbn,
} from "./isbn";

describe("ISBN validation", () => {
  describe("ISBN-10", () => {
    it("validates correct ISBN-10", () => {
      expect(isValidISBN10("0306406152")).toBe(true);
    });
    it("validates ISBN-10 with X check digit", () => {
      expect(isValidISBN10("080442957X")).toBe(true);
    });
    it("rejects invalid ISBN-10", () => {
      expect(isValidISBN10("0306406153")).toBe(false);
    });
    it("rejects wrong length", () => {
      expect(isValidISBN10("123")).toBe(false);
    });
  });

  describe("ISBN-13", () => {
    it("validates correct ISBN-13", () => {
      expect(isValidISBN13("9780306406157")).toBe(true);
    });
    it("rejects invalid ISBN-13", () => {
      expect(isValidISBN13("9780306406158")).toBe(false);
    });
    it("rejects wrong length", () => {
      expect(isValidISBN13("978030640615")).toBe(false);
    });
  });

  describe("isValidISBN", () => {
    it("routes to ISBN-10 for 10-digit strings", () => {
      expect(isValidISBN("0306406152")).toBe(true);
    });
    it("routes to ISBN-13 for 13-digit strings", () => {
      expect(isValidISBN("9780306406157")).toBe(true);
    });
    it("returns false for other lengths", () => {
      expect(isValidISBN("12345")).toBe(false);
    });
    it("returns false for empty string", () => {
      expect(isValidISBN("")).toBe(false);
    });
  });
});

describe("normalizeIsbn", () => {
  it("strips hyphens and spaces and uppercases the check char", () => {
    expect(normalizeIsbn("978-2-37828-867-9")).toBe("9782378288679");
    expect(normalizeIsbn(" 2 07041 331 x ")).toBe("207041331X");
  });
});

describe("isbn10To13", () => {
  it("converts a valid ISBN-10 to its 978-prefixed ISBN-13", () => {
    // 0306406152 is the canonical worked example from the ISBN spec.
    expect(isbn10To13("0306406152")).toBe("9780306406157");
  });

  it("returns null for an invalid ISBN-10", () => {
    expect(isbn10To13("0306406153")).toBeNull();
  });
});

describe("toComparableIsbn", () => {
  it("returns a valid ISBN-13 unchanged apart from formatting", () => {
    expect(toComparableIsbn("978-2-37828-867-9")).toBe("9782378288679");
  });

  it("upgrades an ISBN-10 so both forms of the same book compare equal", () => {
    expect(toComparableIsbn("0306406152")).toBe(toComparableIsbn("9780306406157"));
  });

  it("returns null when neither form validates", () => {
    expect(toComparableIsbn("not-an-isbn")).toBeNull();
    expect(toComparableIsbn("")).toBeNull();
  });
});

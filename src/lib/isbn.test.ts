import { describe, it, expect } from "vitest";
import { isValidISBN10, isValidISBN13, isValidISBN } from "./isbn";

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

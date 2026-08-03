import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { isValidISBN10, isValidISBN13, isbn10To13, toComparableIsbn } from "./isbn";

// Builds a valid ISBN-10 from 9 arbitrary digits by computing the check digit.
// The check digit c satisfies: (Σ d_i*(10-i) for i=0..8) + c ≡ 0 (mod 11)
// c may be 10, represented as 'X'.
function buildValidISBN10(digits9: number[]): string {
  const partial = digits9.reduce((sum, d, i) => sum + d * (10 - i), 0);
  const checkValue = (11 - (partial % 11)) % 11;
  const checkChar = checkValue === 10 ? "X" : String(checkValue);
  return digits9.join("") + checkChar;
}

// Builds a valid ISBN-13 from 12 arbitrary digits by computing the check digit.
// The check digit c satisfies: (Σ d_i * (i%2===0 ? 1 : 3) for i=0..12) ≡ 0 (mod 10)
function buildValidISBN13(digits12: number[]): string {
  const partial = digits12.reduce((sum, d, i) => sum + d * (i % 2 === 0 ? 1 : 3), 0);
  const checkValue = (10 - (partial % 10)) % 10;
  return digits12.join("") + String(checkValue);
}

const arbDigit = fc.integer({ min: 0, max: 9 });
const arbNineDigits = fc.array(arbDigit, { minLength: 9, maxLength: 9 });
const arbTwelveDigits = fc.array(arbDigit, { minLength: 12, maxLength: 12 });

describe("ISBN property tests (checksum round-trip)", () => {
  it("isValidISBN10 accepts any string built with the correct check digit", () => {
    fc.assert(
      fc.property(arbNineDigits, (digits9) => {
        const isbn = buildValidISBN10(digits9);
        expect(isValidISBN10(isbn)).toBe(true);
      }),
      { numRuns: 1000 },
    );
  });

  it("isValidISBN13 accepts any string built with the correct check digit", () => {
    fc.assert(
      fc.property(arbTwelveDigits, (digits12) => {
        const isbn = buildValidISBN13(digits12);
        expect(isValidISBN13(isbn)).toBe(true);
      }),
      { numRuns: 1000 },
    );
  });

  it("isValidISBN10 rejects strings with a corrupted last digit", () => {
    fc.assert(
      fc.property(arbNineDigits, (digits9) => {
        const validIsbn = buildValidISBN10(digits9);
        // Flip the last digit by +1 (mod 10); if last char is X (=10), use '0'
        const lastChar = validIsbn[9];
        const corruptLast =
          lastChar === "X" ? "0" : String((parseInt(lastChar, 10) + 1) % 10);
        // Only test corruption when the flipped digit differs from the original
        if (corruptLast === lastChar) return;
        const corrupt = validIsbn.slice(0, 9) + corruptLast;
        expect(isValidISBN10(corrupt)).toBe(false);
      }),
      { numRuns: 1000 },
    );
  });

  it("isValidISBN13 rejects strings with a corrupted last digit", () => {
    fc.assert(
      fc.property(arbTwelveDigits, (digits12) => {
        const validIsbn = buildValidISBN13(digits12);
        const lastDigit = parseInt(validIsbn[12], 10);
        const corruptLast = String((lastDigit + 1) % 10);
        // Only test when the corruption actually changes the digit
        if (corruptLast === validIsbn[12]) return;
        const corrupt = validIsbn.slice(0, 12) + corruptLast;
        expect(isValidISBN13(corrupt)).toBe(false);
      }),
      { numRuns: 1000 },
    );
  });
});

describe("ISBN-10 to ISBN-13 conversion properties", () => {
  it("produces a valid ISBN-13 for every valid ISBN-10", () => {
    fc.assert(
      fc.property(arbNineDigits, (digits9) => {
        const converted = isbn10To13(buildValidISBN10(digits9));
        expect(converted).not.toBeNull();
        expect(isValidISBN13(converted as string)).toBe(true);
      }),
      { numRuns: 1000 },
    );
  });

  it("gives both forms of the same book the same comparable value", () => {
    fc.assert(
      fc.property(arbNineDigits, (digits9) => {
        const isbn10 = buildValidISBN10(digits9);
        const isbn13 = isbn10To13(isbn10) as string;
        expect(toComparableIsbn(isbn10)).toBe(toComparableIsbn(isbn13));
      }),
      { numRuns: 1000 },
    );
  });
});

export function isValidISBN10(isbn: string): boolean {
  if (isbn.length !== 10) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const digit = parseInt(isbn[i], 10);
    if (isNaN(digit)) return false;
    sum += digit * (10 - i);
  }
  const last = isbn[9].toUpperCase();
  sum += last === "X" ? 10 : parseInt(last, 10);
  if (isNaN(sum)) return false;
  return sum % 11 === 0;
}

export function isValidISBN13(isbn: string): boolean {
  if (isbn.length !== 13) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const digit = parseInt(isbn[i], 10);
    if (isNaN(digit)) return false;
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  return sum % 10 === 0;
}

export function isValidISBN(isbn: string): boolean {
  if (isbn.length === 10) return isValidISBN10(isbn);
  if (isbn.length === 13) return isValidISBN13(isbn);
  return false;
}

/** Formatting-insensitive form: no hyphens or spaces, uppercase X check digit. */
export function normalizeIsbn(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

/**
 * Converts a valid ISBN-10 to its ISBN-13 equivalent by prefixing 978 and
 * recomputing the check digit. Returns null if the input is not a valid ISBN-10.
 */
export function isbn10To13(isbn10: string): string | null {
  const normalized = normalizeIsbn(isbn10);
  if (!isValidISBN10(normalized)) return null;
  const body = `978${normalized.slice(0, 9)}`;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(body[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  return body + String((10 - (sum % 10)) % 10);
}

/**
 * Canonical ISBN-13 form for equality comparison, so an ISBN-10 recorded years
 * ago and a scanned EAN-13 for the same book compare equal. Null when the input
 * is not a valid ISBN in either form.
 */
export function toComparableIsbn(raw: string): string | null {
  const normalized = normalizeIsbn(raw);
  if (isValidISBN13(normalized)) return normalized;
  if (isValidISBN10(normalized)) return isbn10To13(normalized);
  return null;
}

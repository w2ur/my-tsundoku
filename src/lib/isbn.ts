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

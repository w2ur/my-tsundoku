import type { Book } from "./types";
import { toComparableIsbn } from "./isbn";

export type DuplicateReason = "isbn" | "title-author";

export interface DuplicateMatch {
  book: Book;
  reason: DuplicateReason;
}

export interface DuplicateCandidate {
  isbn?: string;
  title: string;
  author: string;
}

/**
 * Comparison form for free text: lowercase, accent-stripped, punctuation-free.
 * "L'Anomalie" and "l anomalie" must compare equal, because catalogue records
 * disagree about apostrophes and diacritics far more often than about words.
 */
export function normalizeForCompare(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Finds a book the user already owns that the candidate duplicates.
 *
 * Deliberately exact, not fuzzy: this feature is advisory and the user can
 * always add anyway, so a false positive ("you already own this" when they do
 * not) is worse than a miss. An ISBN match always wins over a title match, and
 * the whole library is scanned so the answer does not depend on array order.
 */
export function findDuplicate(
  candidate: DuplicateCandidate,
  library: Book[],
): DuplicateMatch | null {
  const candidateIsbn = candidate.isbn ? toComparableIsbn(candidate.isbn) : null;
  const candidateTitle = normalizeForCompare(candidate.title);
  const candidateAuthor = normalizeForCompare(candidate.author);

  let titleMatch: DuplicateMatch | null = null;

  for (const book of library) {
    if (book.deletedAt) continue;

    if (candidateIsbn && book.isbn) {
      const ownedIsbn = toComparableIsbn(book.isbn);
      if (ownedIsbn && ownedIsbn === candidateIsbn) {
        return { book, reason: "isbn" };
      }
    }

    if (
      !titleMatch &&
      candidateTitle &&
      candidateAuthor &&
      normalizeForCompare(book.title) === candidateTitle &&
      normalizeForCompare(book.author) === candidateAuthor
    ) {
      titleMatch = { book, reason: "title-author" };
    }
  }

  return titleMatch;
}

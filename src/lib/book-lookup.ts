import { getBookByISBN, type OpenLibraryResult } from "./open-library";
import { lookupIsbn as lookupBnfIsbn } from "./bnf";

export interface BookMetadata extends OpenLibraryResult {
  source: "openlibrary" | "bnf";
}

/**
 * Resolves an ISBN to book metadata, preferring Open Library and falling back
 * to the BnF catalogue.
 *
 * Open Library first because it returns JSON and cover images. BnF second
 * because its legal-deposit coverage catches French editions Open Library has
 * no record of — measured 2026-08-03, it resolved every French ISBN Open
 * Library missed — at the cost of no covers and metadata needing cleanup.
 *
 * Each source owns its own module; this function owns only the order.
 */
export async function lookupByISBN(isbn: string): Promise<BookMetadata | null> {
  try {
    const fromOpenLibrary = await getBookByISBN(isbn);
    if (fromOpenLibrary) return { ...fromOpenLibrary, source: "openlibrary" };
  } catch {
    // Fall through: a failing Open Library must not stop us asking BnF.
  }

  const fromBnf = await lookupBnfIsbn(isbn);
  if (fromBnf) return { ...fromBnf, source: "bnf" };

  return null;
}

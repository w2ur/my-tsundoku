export interface OpenLibraryResult {
  title: string;
  author: string;
  coverUrl: string;
  isbn?: string;
  olWorkId?: string;
}

interface OLSearchDoc {
  title: string;
  author_name?: string[];
  cover_i?: number;
  isbn?: string[];
  key?: string;
}

export async function searchBooks(
  query: string,
  author?: string,
  limit: number = 5
): Promise<OpenLibraryResult[]> {
  if (!query || query.length < 2) return [];
  const fullQuery = author ? `${query} ${author}` : query;
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(fullQuery)}&limit=${limit}&fields=title,author_name,cover_i,isbn,key`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.docs as OLSearchDoc[])
    .filter((doc) => doc.title)
    .map((doc) => ({
      title: doc.title,
      author: doc.author_name?.[0] ?? "",
      coverUrl: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
        : "",
      isbn: doc.isbn?.[0],
      olWorkId: doc.key,
    }));
}

export async function getBookByISBN(isbn: string): Promise<OpenLibraryResult | null> {
  // Try the Books API first
  try {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json();
      const entry = data[`ISBN:${isbn}`];
      if (entry) {
        return {
          title: entry.title ?? "",
          author: entry.authors?.[0]?.name ?? "",
          coverUrl: entry.cover?.medium ?? "",
          isbn,
        };
      }
    }
  } catch {}

  // Fallback to Search API (broader coverage)
  try {
    const url = `https://openlibrary.org/search.json?isbn=${isbn}&limit=1&fields=title,author_name,cover_i,isbn,key`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const doc = (data.docs as OLSearchDoc[])?.[0];
    if (!doc) return null;
    return {
      title: doc.title,
      author: doc.author_name?.[0] ?? "",
      coverUrl: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
        : "",
      isbn,
      olWorkId: doc.key,
    };
  } catch {
    return null;
  }
}

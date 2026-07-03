import { supabase } from "./supabase";
import type { OpenLibraryResult } from "./open-library";

export interface CommunityBook {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  contributed_at: string;
}

/**
 * Strips characters that break the PostgREST .or() filter syntax or act as
 * SQL LIKE wildcards. This prevents injection of unbalanced parens or commas
 * that would corrupt the query, and stops % / _ from being interpreted as
 * wildcard patterns when the user types them literally.
 */
export function sanitizeCommunitySearchTerm(term: string): string {
  return term.replace(/[,()%_]/g, "").trim();
}

export async function searchCommunityBooks(query: string): Promise<CommunityBook[]> {
  if (!supabase || !query || query.length < 2) return [];

  const sanitized = sanitizeCommunitySearchTerm(query);
  if (sanitized.length < 2) return [];

  const [titleRes, authorRes] = await Promise.all([
    supabase
      .from("community_books")
      .select("*")
      .ilike("title", `%${sanitized}%`)
      .limit(10),
    supabase
      .from("community_books")
      .select("*")
      .ilike("author", `%${sanitized}%`)
      .limit(10),
  ]);

  // Merge and deduplicate by id; cap at 10 results
  const seen = new Set<string>();
  const results: CommunityBook[] = [];
  for (const row of [...(titleRes.data ?? []), ...(authorRes.data ?? [])]) {
    const book = row as CommunityBook;
    if (!seen.has(book.id)) {
      seen.add(book.id);
      results.push(book);
    }
  }
  return results.slice(0, 10);
}

export function deduplicateResults(
  olResults: OpenLibraryResult[],
  communityResults: CommunityBook[]
): { ol: OpenLibraryResult[]; community: CommunityBook[] } {
  const olIsbns = new Set(olResults.map((r) => r.isbn).filter(Boolean));
  const olTitleAuthors = new Set(
    olResults.map((r) => `${r.title.toLowerCase()}|${r.author.toLowerCase()}`)
  );

  const filtered = communityResults.filter((c) => {
    if (c.isbn && olIsbns.has(c.isbn)) return false;
    if (olTitleAuthors.has(`${c.title.toLowerCase()}|${c.author.toLowerCase()}`)) return false;
    return true;
  });

  return { ol: olResults, community: filtered };
}

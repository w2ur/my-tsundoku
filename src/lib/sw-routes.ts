/**
 * Service worker routing predicates.
 *
 * Kept out of sw.ts so they can be unit-tested: sw.ts is excluded from
 * tsconfig and compiled separately by the Serwist CLI.
 */

/**
 * True for Supabase REST and auth calls, which must never be answered from cache.
 *
 * Serwist's defaultCache ends with a rule matching *any* cross-origin GET and
 * handling it with NetworkFirst (1-hour cache). That silently covers every
 * Supabase read. A cached pull response is worse than a failed one: the pull
 * would see fewer rows than exist, then advance the local cursor past rows it
 * never applied, so those books would never be pulled again.
 *
 * Storage is deliberately excluded — cover images are static, and caching them
 * is what makes the library usable offline.
 */
export function isSupabaseApiRequest(url: URL): boolean {
  if (url.hostname !== "supabase.co" && !url.hostname.endsWith(".supabase.co")) {
    return false;
  }
  return url.pathname.startsWith("/rest/") || url.pathname.startsWith("/auth/");
}

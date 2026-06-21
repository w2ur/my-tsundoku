import { redirect } from "next/navigation";

/**
 * Web Share Target handler.
 *
 * The OS invokes this route via GET when the user shares a URL or title to
 * the app. We forward the shared data as search params to /add/manual so the
 * BookForm can be pre-filled. The stage defaults to "tsundoku" (unread pile),
 * the most common intent when sharing a book from another app.
 *
 * Manifest declaration: src/app/manifest.ts → share_target
 */
export default async function ShareTargetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const title = typeof params.title === "string" ? params.title.trim() : "";
  const text = typeof params.text === "string" ? params.text.trim() : "";
  const url = typeof params.url === "string" ? params.url.trim() : "";

  // Prefer title param; fall back to text (some apps send the title in text)
  const bookTitle = title || text;
  const storeUrl = url;

  const dest = new URL("/add/manual", "http://localhost");
  dest.searchParams.set("stage", "tsundoku");
  if (bookTitle) dest.searchParams.set("title", bookTitle);
  if (storeUrl) dest.searchParams.set("storeUrl", storeUrl);

  redirect(dest.pathname + dest.search);
}

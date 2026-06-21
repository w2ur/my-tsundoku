import { supabase } from "./supabase";

export async function uploadCover(
  dataUrl: string,
  userId: string,
  bookId: string
): Promise<string> {
  if (!supabase) throw new Error("Supabase not available");

  const res = await fetch(dataUrl);
  const blob = await res.blob();

  const path = `${userId}/${bookId}.jpg`;

  const { error } = await supabase.storage
    .from("covers")
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from("covers").getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Attempts to upload a cropped cover dataURL to Supabase Storage and returns
 * the public URL. Falls back to the raw dataURL when:
 * - the user is not authenticated (userId is null)
 * - the device is offline (navigator.onLine === false)
 * - the upload fails with a transient/network error
 *
 * This prevents raw base64 strings from being written into IndexedDB, which
 * would bloat the local database significantly for each cropped cover image.
 */
export async function resolveCoverUrl(
  dataUrl: string,
  userId: string | null,
  bookId: string
): Promise<string> {
  if (!userId || (typeof navigator !== "undefined" && !navigator.onLine)) {
    return dataUrl;
  }

  try {
    return await uploadCover(dataUrl, userId, bookId);
  } catch {
    // Transient / network failure — keep base64 as offline fallback
    return dataUrl;
  }
}

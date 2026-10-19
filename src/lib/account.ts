import { supabase } from "./supabase";
import { db } from "./db";

export interface DeleteAccountResult {
  error: string | null;
  /** True when some cover photos could not be removed and were queued for the scheduled purge. */
  coversNotRemoved: boolean;
}

async function removeCovers(userId: string): Promise<boolean> {
  if (!supabase) return false;
  // A listing failure means the paths are unknown: queue the whole prefix.
  let leftovers: string[] = [];
  try {
    const bucket = supabase.storage.from("covers");
    const { data: files, error: listError } = await bucket.list(userId, {
      limit: 1000,
    });
    if (listError) {
      console.error("Cover listing failed during account deletion", listError);
      leftovers = [`${userId}/`];
    } else if (files && files.length > 0) {
      const paths = files.map((f) => `${userId}/${f.name}`);
      const { error: removeError } = await bucket.remove(paths);
      if (removeError) {
        console.error("Cover removal failed during account deletion", removeError);
        leftovers = paths;
      }
    }
  } catch (err) {
    console.error("Cover cleanup threw during account deletion", err);
    leftovers = [`${userId}/`];
  }

  if (leftovers.length === 0) return false;

  const { error: recordError } = await supabase.rpc("record_cover_leftovers", {
    paths: leftovers,
  });
  if (recordError) {
    console.error("Could not queue leftover covers for purge", recordError);
  }
  return true;
}

export async function deleteAccount(): Promise<DeleteAccountResult> {
  if (!supabase) return { error: "Not available", coversNotRemoved: false };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: "Not signed in", coversNotRemoved: false };

  const userId = session.user.id;

  // 1. Delete covers from storage. A failure never blocks the deletion, but it
  // is never silent either: it is logged, the leftover paths are queued for the
  // scheduled purge (migration 007), and the caller is told.
  const coversNotRemoved = await removeCovers(userId);

  // 2. Explicitly delete public-schema data (cascade from auth.users is unreliable)
  await supabase.from("books").delete().eq("user_id", userId);
  await supabase.from("sync_metadata").delete().eq("user_id", userId);
  await supabase.from("profiles").delete().eq("id", userId);

  // 3. Delete auth user via RPC
  const { error: rpcError } = await supabase.rpc("delete_own_account");
  if (rpcError) {
    return { error: rpcError.message, coversNotRemoved };
  }

  // 3. Clear sync queue (stale without an account) but keep local books
  if (db) {
    await db.sync_queue.clear();
  }

  // 4. Clear localStorage sync cursor
  try {
    localStorage.removeItem(`tsundoku_last_synced_${userId}`);
  } catch {
    // localStorage may be unavailable
  }

  // 5. Sign out (clears client session, triggers onAuthStateChange)
  await supabase.auth.signOut();

  return { error: null, coversNotRemoved };
}

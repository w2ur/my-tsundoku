import { supabase } from "./supabase";
import { db } from "./db";

export type CoversCleanup =
  /** Every cover photo was removed from Storage. */
  | "removed"
  /** Some could not be removed; they are queued for the scheduled purge (migration 007). */
  | "queued"
  /** Some could not be removed and could not be queued either: nothing will remove them. */
  | "unqueued";

export interface DeleteAccountResult {
  error: string | null;
  coversCleanup: CoversCleanup;
}

// A listing page, and the most paths record_cover_leftovers accepts per call.
const LIST_LIMIT = 1000;

async function removeCovers(userId: string): Promise<CoversCleanup> {
  if (!supabase) return "removed";
  const prefix = `${userId}/`;
  // A listing failure means the paths are unknown: queue the whole prefix.
  let leftovers: string[] = [];
  try {
    const bucket = supabase.storage.from("covers");
    const { data: files, error: listError } = await bucket.list(userId, {
      limit: LIST_LIMIT,
    });
    if (listError) {
      console.error("Cover listing failed during account deletion", listError);
      leftovers = [prefix];
    } else if (files && files.length > 0) {
      // A full page means more files may exist: the drainer pages a prefix.
      if (files.length >= LIST_LIMIT) leftovers.push(prefix);
      const paths = files.map((f) => `${userId}/${f.name}`);
      const { data: removed, error: removeError } = await bucket.remove(paths);
      if (removeError) {
        console.error("Cover removal failed during account deletion", removeError);
        leftovers.push(...paths);
      } else if ((removed?.length ?? 0) < paths.length) {
        // Storage answers 200 with only the objects it actually deleted
        // (RLS-refused ones are silently skipped): queue the difference.
        const deleted = new Set((removed ?? []).map((f) => f.name));
        const missing = paths.filter((p) => !deleted.has(p));
        console.error("Cover removal was partial during account deletion", missing.length);
        leftovers.push(...missing);
      }
    }
  } catch (err) {
    console.error("Cover cleanup threw during account deletion", err);
    leftovers = [prefix];
  }

  if (leftovers.length === 0) return "removed";
  // The prefix covers every file under it and keeps the call within the cap.
  if (leftovers.includes(prefix)) leftovers = [prefix];

  const { error: recordError } = await supabase.rpc("record_cover_leftovers", {
    paths: leftovers,
  });
  if (recordError) {
    console.error("Could not queue leftover covers for purge", recordError);
    return "unqueued";
  }
  return "queued";
}

export async function deleteAccount(): Promise<DeleteAccountResult> {
  if (!supabase) return { error: "Not available", coversCleanup: "removed" };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: "Not signed in", coversCleanup: "removed" };

  const userId = session.user.id;

  // 1. Delete covers from storage. A failure never blocks the deletion, but it
  // is never silent either: it is logged, the leftover paths are queued for the
  // scheduled purge (migration 007), and the caller is told whether the queueing
  // itself worked.
  const coversCleanup = await removeCovers(userId);

  // 2. Explicitly delete public-schema data (cascade from auth.users is unreliable)
  await supabase.from("books").delete().eq("user_id", userId);
  await supabase.from("sync_metadata").delete().eq("user_id", userId);
  await supabase.from("profiles").delete().eq("id", userId);

  // 3. Delete auth user via RPC
  const { error: rpcError } = await supabase.rpc("delete_own_account");
  if (rpcError) {
    return { error: rpcError.message, coversCleanup };
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

  return { error: null, coversCleanup };
}

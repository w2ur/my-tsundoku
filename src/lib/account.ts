import { supabase } from "./supabase";
import { db } from "./db";

export async function deleteAccount(): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Not available" };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: "Not signed in" };

  const userId = session.user.id;

  // 1. Delete covers from storage (best-effort — don't block deletion)
  try {
    const { data: files } = await supabase.storage.from("covers").list(userId);
    if (files && files.length > 0) {
      await supabase.storage
        .from("covers")
        .remove(files.map((f) => `${userId}/${f.name}`));
    }
  } catch {
    // Storage failure is non-blocking
  }

  // 2. Delete auth user via RPC (cascades all cloud data)
  const { error: rpcError } = await supabase.rpc("delete_own_account");
  if (rpcError) {
    return { error: rpcError.message };
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

  return { error: null };
}

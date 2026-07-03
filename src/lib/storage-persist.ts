// ---- Persistent Storage Request ----
//
// Browsers (especially Safari after 7 days of inactivity) can evict IndexedDB
// data for signed-out users. Calling navigator.storage.persist() asks the
// browser to treat this origin's storage as persistent. We request this once
// after the first book is added, and surface a gentle nudge if it's denied.

const PERSIST_REQUESTED_KEY = "tsundoku_storage_persist_requested";
const PERSIST_NUDGE_KEY = "tsundoku_storage_persist_nudge";

export async function requestStoragePersistOnce(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!navigator.storage?.persist) return;

  try {
    const alreadyRequested = localStorage.getItem(PERSIST_REQUESTED_KEY);
    if (alreadyRequested) return;

    localStorage.setItem(PERSIST_REQUESTED_KEY, "1");
    const granted = await navigator.storage.persist();

    if (!granted) {
      localStorage.setItem(PERSIST_NUDGE_KEY, "1");
    }
  } catch {
    // Storage API unavailable — continue silently
  }
}

export function isStoragePersistNudgePending(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(PERSIST_NUDGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissStoragePersistNudge(): void {
  try {
    localStorage.removeItem(PERSIST_NUDGE_KEY);
  } catch {
    // localStorage unavailable
  }
}

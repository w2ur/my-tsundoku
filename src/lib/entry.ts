import { db } from "@/lib/db";

import { ENTRY_HINT_KEY, ENTRY_HINT_SCRIPT } from "./entry-hint";

export { ENTRY_HINT_KEY, ENTRY_HINT_SCRIPT };

/** db.settings key meaning "this device has entered the app". Dexie is the source of truth. */
export const ENTERED_APP_SETTING = "enteredApp";

export type Entry = "landing" | "app" | "unknown";

/**
 * A non-empty shelf decides "app" on its own, even while the setting is still
 * loading or was never written (a profile that predates the setting). Otherwise
 * both reads must have resolved: "unknown" never shows either surface by choice.
 */
export function resolveEntry(
  books: unknown[] | undefined,
  enteredApp: boolean | undefined,
): Entry {
  if (books && books.length > 0) return "app";
  if (books === undefined || enteredApp === undefined) return "unknown";
  return enteredApp ? "app" : "landing";
}

/**
 * Live-query reader for the setting. A missing row is `false`, not `undefined`:
 * only the hook's own `undefined` may mean "loading", otherwise a first visit
 * would never resolve to "landing".
 */
export async function readEnteredApp(): Promise<boolean> {
  if (!db) return false;
  return (await db.settings.get(ENTERED_APP_SETTING))?.value === true;
}

export function markEntryHint(): void {
  try {
    localStorage.setItem(ENTRY_HINT_KEY, "app");
  } catch {
    // Storage blocked: the hint only saves a landing flash, Dexie still decides.
  }
  document.documentElement.dataset.entry = "app";
}

export function clearEntryHint(): void {
  try {
    localStorage.removeItem(ENTRY_HINT_KEY);
  } catch {
    // See markEntryHint.
  }
  delete document.documentElement.dataset.entry;
}

export async function persistEnteredApp(): Promise<void> {
  try {
    await db.settings.put({ key: ENTERED_APP_SETTING, value: true });
  } catch {
    // The hint and attribute below still carry this session; the next load re-derives from books.
  }
}

/** The explicit "enter the app" action (landing call to action). */
export async function enterApp(): Promise<void> {
  markEntryHint();
  await persistEnteredApp();
}

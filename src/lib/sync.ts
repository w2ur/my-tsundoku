import { validateBookRecord } from "./book-validation";
import { db, type SyncFailure } from "./db";
import { supabase } from "./supabase";
import type { Book, Stage } from "./types";

// ---- Field Mapping ----

export function mapBookToSupabase(book: Book, userId: string) {
  const now = new Date().toISOString();
  return {
    id: book.id,
    user_id: userId,
    title: book.title,
    author: book.author,
    cover_url: book.coverUrl ?? "",
    stage: book.stage,
    position: book.position ?? 0,
    is_reading: book.isReading ?? false,
    notes: book.notes ?? null,
    store_url: book.storeUrl ?? null,
    isbn: book.isbn ?? null,
    ol_work_id: book.olWorkId ?? null,
    created_at: book.createdAt ? new Date(book.createdAt).toISOString() : now,
    updated_at: book.updatedAt ? new Date(book.updatedAt).toISOString() : now,
    deleted_at: book.deletedAt ? new Date(book.deletedAt).toISOString() : null,
  };
}

export function mapSupabaseToBook(row: Record<string, unknown>): Book {
  const now = Date.now();
  const book: Book = {
    id: row.id as string,
    title: row.title as string,
    author: row.author as string,
    coverUrl: (row.cover_url as string) ?? "",
    stage: row.stage as Stage,
    position: (row.position as number) ?? 0,
    createdAt: row.created_at ? new Date(row.created_at as string).getTime() : now,
    updatedAt: row.updated_at ? new Date(row.updated_at as string).getTime() : now,
    isReading: (row.is_reading as boolean) ?? false,
  };

  if (row.notes) book.notes = row.notes as string;
  if (row.store_url) book.storeUrl = row.store_url as string;
  if (row.isbn) book.isbn = row.isbn as string;
  if (row.ol_work_id) book.olWorkId = row.ol_work_id as string;
  if (row.deleted_at) book.deletedAt = new Date(row.deleted_at as string).getTime();

  return book;
}

// ---- Sync State ----

export type SyncStatus = "synced" | "syncing" | "unsynced";

type SyncListener = (status: SyncStatus) => void;
const listeners = new Set<SyncListener>();
let currentStatus: SyncStatus = "synced";

export function onSyncStatusChange(listener: SyncListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSyncStatus(): SyncStatus {
  return currentStatus;
}

function setStatus(status: SyncStatus) {
  currentStatus = status;
  listeners.forEach((fn) => fn(status));
}

/**
 * Recomputes the status from what is actually on disk.
 *
 * `currentStatus` is module state initialised to "synced", so before this
 * existed every page load reported a clean sync no matter how many writes were
 * queued or refused — the UI could not have warned about either. Call on boot.
 */
export async function refreshSyncStatus(): Promise<{
  pending: number;
  rejected: number;
}> {
  if (typeof window === "undefined" || !db) return { pending: 0, rejected: 0 };

  const pending = await db.sync_queue.count();
  const rejected = await db.sync_failures.count();
  setStatus(pending > 0 || rejected > 0 ? "unsynced" : "synced");
  return { pending, rejected };
}

/** Books the cloud refused, newest first. Empty is the healthy case. */
export async function getSyncFailures(): Promise<SyncFailure[]> {
  if (typeof window === "undefined" || !db) return [];
  const failures = await db.sync_failures.toArray();
  return failures.sort((a, b) => b.at - a.at);
}

// ---- Queue Operations ----

export async function enqueueUpsert(book: Book): Promise<void> {
  if (typeof window === "undefined" || !db) return;
  await db.sync_queue.add({
    bookId: book.id,
    operation: "upsert",
    payload: book,
    createdAt: Date.now(),
  });
  flushQueue();
}

export async function enqueueDelete(bookId: string): Promise<void> {
  if (typeof window === "undefined" || !db) return;
  await db.sync_queue.add({
    bookId,
    operation: "delete",
    payload: { id: bookId } as Partial<Book>,
    createdAt: Date.now(),
  });
  flushQueue();
}

// ---- Flush (Push) ----

// 408 (timeout) and 429 (rate limit) are 4xx but worth retrying.
const RETRYABLE_CLIENT_STATUSES = new Set([408, 429]);

/**
 * Classifies a Supabase response status as a permanent failure (drop the queue
 * entry) or a transient one (keep it for retry).
 *
 * Classify on status, never on the shape of the error object: postgrest-js
 * reports client-side fetch failures — offline, flaky network, aborted request —
 * as `{ status: 0, error: { code: "", ... } }`. The `code` key is always present,
 * so testing for it marked every network blip permanent and silently deleted the
 * book from the queue. Only PostgREST answering 4xx (RLS denial, constraint
 * violation, malformed row) means retrying can never help.
 */
export function isPermanentSyncError(status: number | undefined): boolean {
  if (typeof status !== "number") return false;
  return status >= 400 && status < 500 && !RETRYABLE_CLIENT_STATUSES.has(status);
}

let flushing = false;

export async function flushQueue(): Promise<{ flushed: number; failed: number }> {
  if (!supabase || !db || flushing) return { flushed: 0, failed: 0 };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { flushed: 0, failed: 0 };

  const userId = session.user.id;
  const entries = await db.sync_queue.toArray();
  if (entries.length === 0) return { flushed: 0, failed: 0 };

  flushing = true;
  setStatus("syncing");

  let flushed = 0;
  let failed = 0;

  try {
    for (const entry of entries) {
      try {
        // A record the cloud cannot accept would either 400 forever or, with an
        // invalid date, throw inside mapBookToSupabase — and a throw counts as
        // transient, so it would be retried on every flush for good. Reject it
        // here instead, where it gets recorded and reported.
        if (entry.operation === "upsert") {
          const check = validateBookRecord(entry.payload);
          if (!check.ok) {
            console.error("Sync flush rejected entry", entry.id, entry.bookId, check.reason);
            await db.sync_failures.put({
              bookId: entry.bookId,
              title: (entry.payload as Book).title ?? entry.bookId,
              status: 0,
              message: check.reason,
              at: Date.now(),
            });
            await db.sync_queue.delete(entry.id!);
            failed++;
            continue;
          }
        }

        const now = new Date().toISOString();
        const res =
          entry.operation === "upsert"
            ? await supabase
                .from("books")
                .upsert(mapBookToSupabase(entry.payload as Book, userId))
            : await supabase
                .from("books")
                .update({ deleted_at: now, updated_at: now })
                .eq("id", entry.bookId)
                .eq("user_id", userId);

        if (res.error) {
          const permanent = isPermanentSyncError(res.status);
          console.error(
            "Sync flush error for entry",
            entry.id,
            entry.bookId,
            `status ${res.status}`,
            permanent ? "(permanent)" : "(transient, will retry)",
            res.error,
          );
          if (permanent) {
            // Retrying cannot help, so the entry goes — but record the refusal,
            // or the book silently exists on this device only, forever.
            await db.sync_failures.put({
              bookId: entry.bookId,
              title: (entry.payload as Book).title ?? entry.bookId,
              status: res.status,
              message: res.error.message ?? "",
              at: Date.now(),
            });
            await db.sync_queue.delete(entry.id!);
          }
          failed++;
          continue;
        }

        await db.sync_queue.delete(entry.id!);
        await db.sync_failures.delete(entry.bookId);
        flushed++;
      } catch (err) {
        // A thrown exception carries no status, so it cannot be shown to be
        // permanent — keep the entry and retry rather than risk losing a book.
        console.error("Sync flush threw for entry", entry.id, entry.bookId, "(transient, will retry)", err);
        failed++;
      }
    }

    await supabase.from("sync_metadata").upsert({
      user_id: userId,
      last_synced_at: new Date().toISOString(),
    });

    // Derive from disk rather than from `failed`: a rejection recorded on an
    // earlier run must keep the status dirty even if this run pushed cleanly.
    await refreshSyncStatus();
  } finally {
    flushing = false;
  }
  return { flushed, failed };
}

// ---- Per-Device Sync Cursor ----

export function resetLocalSyncCursor(userId: string): void {
  try {
    localStorage.removeItem(`tsundoku_last_synced_${userId}`);
  } catch {
    // localStorage unavailable
  }
}

function getLocalSyncCursor(userId: string): string | null {
  try {
    return localStorage.getItem(`tsundoku_last_synced_${userId}`);
  } catch {
    return null;
  }
}

// Rows soft-deleted before d53abf6 were stamped with deleted_at only, leaving
// updated_at stale — the incremental pull query (gt("updated_at", cursor)) can
// never surface those tombstones to a device whose cursor is already past the
// row's last edit. Dropping the local cursor once forces a full re-pull (see
// the `if (localCursor)` guard in pullRemoteChanges), which returns every
// legacy tombstone through the safe delete gate. This is self-correcting and
// safe to do exactly once per user per device: the merge is idempotent, so
// re-pulling rows we already have is a no-op, and any local edit strictly
// newer than a delete still wins and gets re-pushed.
function tombstoneReconcileKey(userId: string): string {
  return `tsundoku_tombstone_reconcile_v1_${userId}`;
}

export function reconcileLegacyTombstones(userId: string): void {
  try {
    if (localStorage.getItem(tombstoneReconcileKey(userId))) return;
  } catch {
    return;
  }

  // Reset the cursor first — if setting the flag below fails, we simply
  // reconcile again on the next boot (harmless and idempotent). Doing it in
  // the reverse order could mark reconciliation done without ever resetting
  // the cursor, permanently skipping the fix.
  resetLocalSyncCursor(userId);

  try {
    localStorage.setItem(tombstoneReconcileKey(userId), "1");
  } catch {
    // localStorage unavailable
  }
}

// Overlap window to subtract from max(updated_at) when setting the pull cursor.
// Absorbs cross-device clock skew so changes written just-before our pull are
// caught on the next pull. The local-vs-remote merge is idempotent, so re-pulling
// overlapping rows is safe.
const CURSOR_OVERLAP_MS = 30_000; // 30 seconds

function setLocalSyncCursor(
  userId: string,
  remoteRows: Array<Record<string, unknown>>
): void {
  try {
    let cursor: string;
    if (remoteRows.length > 0) {
      const maxUpdatedAt = Math.max(
        ...remoteRows.map((r) =>
          r.updated_at ? new Date(r.updated_at as string).getTime() : 0
        )
      );
      cursor = new Date(Math.max(0, maxUpdatedAt - CURSOR_OVERLAP_MS)).toISOString();
    } else {
      // No rows returned — safe to advance cursor to now (nothing was missed)
      cursor = new Date().toISOString();
    }
    localStorage.setItem(`tsundoku_last_synced_${userId}`, cursor);
  } catch {
    // localStorage unavailable
  }
}

// ---- Pull ----

let pulling = false;

export async function pullRemoteChanges(): Promise<void> {
  if (!supabase || !db || pulling) return;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  pulling = true;

  try {
    const userId = session.user.id;
    const localCursor = getLocalSyncCursor(userId);

    // Build query — on first pull (no local cursor), fetch ALL books
    let query = supabase
      .from("books")
      .select("*")
      .eq("user_id", userId);

    if (localCursor) {
      query = query.gt("updated_at", localCursor);
    }

    const { data: remoteRows, error } = await query;

    if (error || !remoteRows) return;

    let allSucceeded = true;

    for (const row of remoteRows) {
      try {
        const remoteBook = mapSupabaseToBook(row);
        const localBook = await db.books.get(remoteBook.id);

        if (remoteBook.deletedAt) {
          // Compare against deletedAt, not updatedAt: rows soft-deleted before the
          // updated_at stamping fix carry a stale updated_at, so deletedAt is the
          // only accurate record of when the delete happened. Tie-break: a local
          // edit strictly newer than the delete wins; equal timestamps let the
          // delete win. When the local edit wins, re-push it so the remote row is
          // resurrected instead of silently dropping the divergence.
          if (!localBook || remoteBook.deletedAt >= localBook.updatedAt) {
            await db.books.delete(remoteBook.id);
          } else {
            await enqueueUpsert(localBook);
          }
          continue;
        }

        if (!localBook || remoteBook.updatedAt > localBook.updatedAt) {
          await db.books.put(remoteBook);
        }
      } catch (err) {
        console.error("pullRemoteChanges: failed to write book", row.id, err);
        allSucceeded = false;
      }
    }

    // Only advance cursor if all writes succeeded — otherwise retry on next pull
    if (allSucceeded) {
      setLocalSyncCursor(userId, remoteRows);

      await supabase.from("sync_metadata").upsert({
        user_id: userId,
        last_synced_at: new Date().toISOString(),
      });
    }
  } finally {
    pulling = false;
  }
}

// ---- Full Sync (pull + flush) ----

export async function fullSync(): Promise<void> {
  await pullRemoteChanges();
  await flushQueue();
}

// ---- Reconcile (repair books that never reached the cloud) ----

// PostgREST caps rows per request; page through rather than trust one response.
const REMOTE_PAGE_SIZE = 1000;

/**
 * Re-queues every local book the cloud does not have, or has an older copy of.
 *
 * The push queue is fire-and-forget: a book is enqueued once when it is added or
 * edited, and nothing ever re-checks that it landed. Any entry dropped by the
 * pre-fix classification bug (see isPermanentSyncError) is therefore invisible
 * and unrecoverable — the book stays local-only forever, on that device only.
 * This walks local state against remote state and repairs the divergence.
 *
 * Call after pullRemoteChanges(), so remote deletes have already been applied
 * locally and cannot be mistaken for books missing from the cloud.
 */
export async function reconcileLocalBooks(): Promise<{ queued: number }> {
  if (!supabase || !db) return { queued: 0 };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { queued: 0 };

  const userId = session.user.id;
  const remoteUpdatedAt = new Map<string, number>();
  const tombstoned = new Set<string>();

  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from("books")
      .select("id,updated_at,deleted_at")
      .eq("user_id", userId)
      .range(page * REMOTE_PAGE_SIZE, (page + 1) * REMOTE_PAGE_SIZE - 1);

    // A partial remote picture would re-upload books that already exist. Upsert
    // makes that harmless, but bail anyway rather than act on unknown state.
    if (error || !data) return { queued: 0 };

    for (const row of data) {
      const id = row.id as string;
      remoteUpdatedAt.set(id, row.updated_at ? new Date(row.updated_at as string).getTime() : 0);
      if (row.deleted_at) tombstoned.add(id);
    }

    if (data.length < REMOTE_PAGE_SIZE) break;
  }

  const localBooks = await db.books.toArray();
  const diverged = localBooks.filter((book) => {
    // Remotely deleted: pullRemoteChanges owns that decision and has already run.
    if (tombstoned.has(book.id)) return false;
    const remote = remoteUpdatedAt.get(book.id);
    return remote === undefined || book.updatedAt > remote;
  });

  for (const book of diverged) {
    await db.sync_queue.add({
      bookId: book.id,
      operation: "upsert" as const,
      payload: book,
      createdAt: Date.now(),
    });
  }

  return { queued: diverged.length };
}

/**
 * Full repair: drop the pull cursor, re-pull everything, then push whatever the
 * cloud is missing. Backs the "force resync" action in Settings.
 */
export async function forceReconcile(
  userId: string,
): Promise<{ queued: number; flushed: number; failed: number }> {
  resetLocalSyncCursor(userId);
  await pullRemoteChanges();
  const { queued } = await reconcileLocalBooks();
  const { flushed, failed } = await flushQueue();
  return { queued, flushed, failed };
}

// ---- Online/Offline listeners ----

export function startSyncListeners(): () => void {
  if (typeof window === "undefined") return () => {};

  const handleOnline = () => {
    fullSync();
  };

  window.addEventListener("online", handleOnline);

  const interval = setInterval(() => {
    if (navigator.onLine) fullSync();
  }, 5 * 60 * 1000);

  return () => {
    window.removeEventListener("online", handleOnline);
    clearInterval(interval);
  };
}

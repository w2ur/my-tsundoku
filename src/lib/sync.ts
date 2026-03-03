import { db } from "./db";
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
  const book: Book = {
    id: row.id as string,
    title: row.title as string,
    author: row.author as string,
    coverUrl: (row.cover_url as string) ?? "",
    stage: row.stage as Stage,
    position: (row.position as number) ?? 0,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
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

  for (const entry of entries) {
    try {
      if (entry.operation === "upsert") {
        const book = entry.payload as Book;
        const row = mapBookToSupabase(book, userId);
        const { error } = await supabase.from("books").upsert(row);
        if (error) throw error;
      } else if (entry.operation === "delete") {
        const { error } = await supabase
          .from("books")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", entry.bookId)
          .eq("user_id", userId);
        if (error) throw error;
      }
      await db.sync_queue.delete(entry.id!);
      flushed++;
    } catch (err) {
      console.error("Sync flush error for entry", entry.id, entry.bookId, err);
      await db.sync_queue.delete(entry.id!);
      failed++;
    }
  }

  await supabase.from("sync_metadata").upsert({
    user_id: userId,
    last_synced_at: new Date().toISOString(),
  });

  setStatus(failed > 0 ? "unsynced" : "synced");
  flushing = false;
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

function setLocalSyncCursor(userId: string): void {
  try {
    localStorage.setItem(`tsundoku_last_synced_${userId}`, new Date().toISOString());
  } catch {
    // localStorage unavailable
  }
}

// ---- Pull ----

export async function pullRemoteChanges(): Promise<void> {
  if (!supabase || !db) return;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

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

  for (const row of remoteRows) {
    const remoteBook = mapSupabaseToBook(row);

    if (remoteBook.deletedAt) {
      await db.books.delete(remoteBook.id);
      continue;
    }

    const localBook = await db.books.get(remoteBook.id);
    if (!localBook || remoteBook.updatedAt > localBook.updatedAt) {
      await db.books.put(remoteBook);
    }
  }

  // Update both local cursor and remote metadata
  setLocalSyncCursor(userId);

  await supabase.from("sync_metadata").upsert({
    user_id: userId,
    last_synced_at: new Date().toISOString(),
  });
}

// ---- Full Sync (pull + flush) ----

export async function fullSync(): Promise<void> {
  await pullRemoteChanges();
  await flushQueue();
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

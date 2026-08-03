import Dexie, { type EntityTable } from "dexie";
import type { Book } from "./types";

export interface SyncQueueEntry {
  id?: number;
  bookId: string;
  operation: "upsert" | "delete";
  payload: Partial<Book>;
  createdAt: number;
}

/**
 * A push the cloud refused outright (4xx). The queue entry is dropped — retrying
 * a rejection cannot succeed — so this is the only remaining trace that the book
 * exists on this device and nowhere else.
 */
export interface SyncFailure {
  bookId: string;
  title: string;
  status: number;
  message: string;
  at: number;
}

class TsundokuDB extends Dexie {
  books!: EntityTable<Book, "id">;
  settings!: EntityTable<{ key: string; value: unknown }, "key">;
  sync_queue!: EntityTable<SyncQueueEntry, "id">;
  sync_failures!: EntityTable<SyncFailure, "bookId">;

  constructor() {
    super("tsundoku");
    this.version(1).stores({
      books: "id, stage, title, author, createdAt, updatedAt",
    });
    this.version(2).stores({
      books: "id, stage, title, author, createdAt, updatedAt",
    });
    this.version(3).stores({
      books: "id, stage, title, author, createdAt, updatedAt",
      settings: "key",
    });
    this.version(4).stores({
      books: "id, stage, title, author, createdAt, updatedAt, position",
      settings: "key",
    }).upgrade(async (tx) => {
      const books = await tx.table("books").toArray();
      const byStage: Record<string, typeof books> = {};
      for (const book of books) {
        if (!byStage[book.stage]) byStage[book.stage] = [];
        byStage[book.stage].push(book);
      }
      for (const stageBooks of Object.values(byStage)) {
        stageBooks.sort((a, b) => b.updatedAt - a.updatedAt);
        for (let i = 0; i < stageBooks.length; i++) {
          await tx.table("books").update(stageBooks[i].id, { position: i });
        }
      }
    });
    this.version(5).stores({
      books: "id, stage, title, author, createdAt, updatedAt, position",
      settings: "key",
    });
    this.version(6).stores({
      books: "id, stage, title, author, createdAt, updatedAt, position",
      settings: "key",
      sync_queue: "++id, bookId, operation, createdAt",
    });
    this.version(7).stores({
      books: "id, stage, title, author, createdAt, updatedAt, position",
      settings: "key",
      sync_queue: "++id, bookId, operation, createdAt",
      sync_failures: "bookId, at",
    });
  }
}

export const db = typeof window !== "undefined" ? new TsundokuDB() : (null as unknown as TsundokuDB);

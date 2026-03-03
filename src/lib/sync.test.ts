import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Book } from "./types";

// ---- Hoisted mock factories ----

const { mockDb, mockSupabase } = vi.hoisted(() => ({
  mockDb: {
    sync_queue: {
      add: vi.fn().mockResolvedValue(undefined),
      toArray: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    books: {
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
  },
  mockSupabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    from: vi.fn(),
  },
}));

vi.mock("./db", () => ({ db: mockDb }));
vi.mock("./supabase", () => ({ supabase: mockSupabase }));

import {
  mapBookToSupabase,
  mapSupabaseToBook,
  onSyncStatusChange,
  getSyncStatus,
  enqueueUpsert,
  enqueueDelete,
  flushQueue,
  pullRemoteChanges,
  startSyncListeners,
} from "./sync";

// ---- Helpers ----

/** Creates a chainable, awaitable mock mimicking the Supabase query builder. */
function mockChain(result: Record<string, unknown> = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "gt", "upsert", "update"]) {
    (chain as Record<string, unknown>)[method] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (
    resolve: (v: unknown) => void,
    reject?: (e: unknown) => void,
  ) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

const testBook: Book = {
  id: "b1",
  title: "Test",
  author: "Author",
  coverUrl: "",
  stage: "tsundoku",
  position: 0,
  createdAt: 1700000000000,
  updatedAt: 1700001000000,
};

function mockSession(userId = "u1") {
  return { data: { session: { user: { id: userId } } } };
}

// ============================================================
// Existing: field mapping
// ============================================================

describe("sync field mapping", () => {
  const localBook: Book = {
    id: "abc-123",
    title: "Test Book",
    author: "Test Author",
    coverUrl: "https://example.com/cover.jpg",
    stage: "tsundoku",
    position: 2,
    createdAt: 1700000000000,
    updatedAt: 1700001000000,
    isReading: true,
    notes: "Great book",
    storeUrl: "https://store.com",
    isbn: "9780306406157",
    olWorkId: "/works/OL123W",
  };

  it("maps local Book to Supabase row (camelCase to snake_case)", () => {
    const row = mapBookToSupabase(localBook, "user-456");
    expect(row.id).toBe("abc-123");
    expect(row.user_id).toBe("user-456");
    expect(row.cover_url).toBe("https://example.com/cover.jpg");
    expect(row.is_reading).toBe(true);
    expect(row.store_url).toBe("https://store.com");
    expect(row.ol_work_id).toBe("/works/OL123W");
    expect(row.created_at).toBe("2023-11-14T22:13:20.000Z");
    expect(row.updated_at).toBe("2023-11-14T22:30:00.000Z");
    expect(row.deleted_at).toBeNull();
  });

  it("maps Supabase row back to local Book (snake_case to camelCase)", () => {
    const row = {
      id: "abc-123",
      user_id: "user-456",
      title: "Test Book",
      author: "Test Author",
      cover_url: "https://example.com/cover.jpg",
      stage: "tsundoku",
      position: 2,
      is_reading: true,
      notes: "Great book",
      store_url: "https://store.com",
      isbn: "9780306406157",
      ol_work_id: "/works/OL123W",
      created_at: "2023-11-14T22:13:20.000Z",
      updated_at: "2023-11-14T22:30:00.000Z",
      deleted_at: null,
    };
    const book = mapSupabaseToBook(row);
    expect(book.id).toBe("abc-123");
    expect(book.coverUrl).toBe("https://example.com/cover.jpg");
    expect(book.isReading).toBe(true);
    expect(book.storeUrl).toBe("https://store.com");
    expect(book.olWorkId).toBe("/works/OL123W");
    expect(book.createdAt).toBe(1700000000000);
    expect(book.updatedAt).toBe(1700001000000);
    expect(book.deletedAt).toBeUndefined();
  });

  it("maps deleted_at correctly", () => {
    const row = {
      id: "abc",
      user_id: "u",
      title: "T",
      author: "A",
      cover_url: "",
      stage: "tsundoku",
      position: 0,
      is_reading: false,
      notes: null,
      store_url: null,
      isbn: null,
      ol_work_id: null,
      created_at: "2023-11-14T22:13:20.000Z",
      updated_at: "2023-11-14T22:13:20.000Z",
      deleted_at: "2023-11-15T00:00:00.000Z",
    };
    const book = mapSupabaseToBook(row);
    expect(book.deletedAt).toBe(new Date("2023-11-15T00:00:00.000Z").getTime());
  });

  it("uses safe defaults for undefined position and coverUrl", () => {
    const book = {
      id: "bad",
      title: "Bad",
      author: "Author",
      stage: "tsundoku" as const,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    } as Book;
    const row = mapBookToSupabase(book, "user-1");
    expect(row.position).toBe(0);
    expect(row.cover_url).toBe("");
  });

  it("uses current time for undefined createdAt/updatedAt", () => {
    const book = {
      id: "no-dates",
      title: "No Dates",
      author: "Author",
      coverUrl: "",
      stage: "tsundoku" as const,
      position: 0,
    } as Book;
    const row = mapBookToSupabase(book, "user-1");
    // Should be valid ISO strings (not "Invalid Date")
    expect(() => new Date(row.created_at)).not.toThrow();
    expect(new Date(row.created_at).getTime()).not.toBeNaN();
    expect(() => new Date(row.updated_at)).not.toThrow();
    expect(new Date(row.updated_at).getTime()).not.toBeNaN();
  });

  it("mapSupabaseToBook uses safe defaults for null/missing dates", () => {
    const row = {
      id: "null-dates",
      title: "Null Dates",
      author: "Author",
      cover_url: "",
      stage: "tsundoku",
      position: 0,
      is_reading: false,
      created_at: null,
      updated_at: null,
      deleted_at: null,
    };
    const book = mapSupabaseToBook(row);
    expect(book.createdAt).not.toBeNaN();
    expect(book.updatedAt).not.toBeNaN();
    expect(book.createdAt).toBeGreaterThan(0);
    expect(book.updatedAt).toBeGreaterThan(0);
  });

  it("handles missing optional fields gracefully", () => {
    const minimalBook: Book = {
      id: "min",
      title: "Min",
      author: "Author",
      coverUrl: "",
      stage: "a_acheter",
      position: 0,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    const row = mapBookToSupabase(minimalBook, "user-1");
    expect(row.is_reading).toBe(false);
    expect(row.notes).toBeNull();
    expect(row.store_url).toBeNull();
    expect(row.isbn).toBeNull();
    expect(row.ol_work_id).toBeNull();
  });
});

// ============================================================
// 3a: Sync status listeners
// ============================================================

describe("sync status", () => {
  it("initial status is synced", () => {
    expect(getSyncStatus()).toBe("synced");
  });

  it("listener receives status changes", async () => {
    const statuses: string[] = [];
    const unsub = onSyncStatusChange((s) => statuses.push(s));

    mockSupabase.auth.getSession.mockResolvedValueOnce(mockSession());
    mockDb.sync_queue.toArray.mockResolvedValueOnce([
      { id: 1, bookId: "b1", operation: "upsert", payload: testBook, createdAt: Date.now() },
    ]);
    mockSupabase.from.mockReturnValue(mockChain({ error: null }));

    await flushQueue();
    unsub();

    expect(statuses).toContain("syncing");
    expect(statuses).toContain("synced");
  });

  it("unsubscribe removes listener", async () => {
    const statuses: string[] = [];
    const unsub = onSyncStatusChange((s) => statuses.push(s));
    unsub();

    mockSupabase.auth.getSession.mockResolvedValueOnce(mockSession());
    mockDb.sync_queue.toArray.mockResolvedValueOnce([
      { id: 1, bookId: "b1", operation: "upsert", payload: testBook, createdAt: Date.now() },
    ]);
    mockSupabase.from.mockReturnValue(mockChain({ error: null }));

    await flushQueue();

    expect(statuses).toHaveLength(0);
  });

  it("multiple listeners all fire", async () => {
    const s1: string[] = [];
    const s2: string[] = [];
    const unsub1 = onSyncStatusChange((s) => s1.push(s));
    const unsub2 = onSyncStatusChange((s) => s2.push(s));

    mockSupabase.auth.getSession.mockResolvedValueOnce(mockSession());
    mockDb.sync_queue.toArray.mockResolvedValueOnce([
      { id: 1, bookId: "b1", operation: "upsert", payload: testBook, createdAt: Date.now() },
    ]);
    mockSupabase.from.mockReturnValue(mockChain({ error: null }));

    await flushQueue();
    unsub1();
    unsub2();

    expect(s1).toEqual(s2);
    expect(s1.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================
// 3b: Queue operations
// ============================================================

describe("queue operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // flushQueue (fire-and-forget from enqueue) returns early: no session
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
  });

  it("enqueueUpsert adds upsert entry to sync_queue", async () => {
    await enqueueUpsert(testBook);

    expect(mockDb.sync_queue.add).toHaveBeenCalledWith(
      expect.objectContaining({
        bookId: "b1",
        operation: "upsert",
        payload: testBook,
      }),
    );
  });

  it("enqueueDelete adds delete entry to sync_queue", async () => {
    await enqueueDelete("b1");

    expect(mockDb.sync_queue.add).toHaveBeenCalledWith(
      expect.objectContaining({
        bookId: "b1",
        operation: "delete",
        payload: { id: "b1" },
      }),
    );
  });
});

// ============================================================
// 3c: flushQueue
// ============================================================

describe("flushQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns early if no session", async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });

    await flushQueue();

    expect(mockDb.sync_queue.toArray).not.toHaveBeenCalled();
  });

  it("returns early if queue is empty", async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce(mockSession());
    mockDb.sync_queue.toArray.mockResolvedValueOnce([]);

    await flushQueue();

    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("processes upsert: calls supabase upsert then deletes queue entry", async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce(mockSession());
    mockDb.sync_queue.toArray.mockResolvedValueOnce([
      { id: 1, bookId: "b1", operation: "upsert", payload: testBook, createdAt: Date.now() },
    ]);
    const chain = mockChain({ error: null });
    mockSupabase.from.mockReturnValue(chain);

    await flushQueue();

    expect(mockSupabase.from).toHaveBeenCalledWith("books");
    expect(chain.upsert).toHaveBeenCalled();
    expect(mockDb.sync_queue.delete).toHaveBeenCalledWith(1);
  });

  it("processes delete: calls supabase update with deleted_at", async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce(mockSession());
    mockDb.sync_queue.toArray.mockResolvedValueOnce([
      { id: 2, bookId: "b1", operation: "delete", payload: { id: "b1" }, createdAt: Date.now() },
    ]);
    const chain = mockChain({ error: null });
    mockSupabase.from.mockReturnValue(chain);

    await flushQueue();

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) }),
    );
    expect(chain.eq).toHaveBeenCalledWith("id", "b1");
    expect(chain.eq).toHaveBeenCalledWith("user_id", "u1");
    expect(mockDb.sync_queue.delete).toHaveBeenCalledWith(2);
  });

  it("sets status to syncing then synced on success", async () => {
    const statuses: string[] = [];
    const unsub = onSyncStatusChange((s) => statuses.push(s));

    mockSupabase.auth.getSession.mockResolvedValueOnce(mockSession());
    mockDb.sync_queue.toArray.mockResolvedValueOnce([
      { id: 1, bookId: "b1", operation: "upsert", payload: testBook, createdAt: Date.now() },
    ]);
    mockSupabase.from.mockReturnValue(mockChain({ error: null }));

    await flushQueue();
    unsub();

    expect(statuses[0]).toBe("syncing");
    expect(statuses[statuses.length - 1]).toBe("synced");
  });

  it("updates sync_metadata after successful flush", async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce(mockSession());
    mockDb.sync_queue.toArray.mockResolvedValueOnce([
      { id: 1, bookId: "b1", operation: "upsert", payload: testBook, createdAt: Date.now() },
    ]);
    const chain = mockChain({ error: null });
    mockSupabase.from.mockReturnValue(chain);

    await flushQueue();

    expect(mockSupabase.from).toHaveBeenCalledWith("sync_metadata");
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "u1" }),
    );
  });

  it("deletes queue entry on permanent error (Supabase constraint) and continues", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockSupabase.auth.getSession.mockResolvedValueOnce(mockSession());
    mockDb.sync_queue.toArray.mockResolvedValueOnce([
      { id: 1, bookId: "b1", operation: "upsert", payload: testBook, createdAt: Date.now() },
      { id: 2, bookId: "b2", operation: "upsert", payload: { ...testBook, id: "b2" }, createdAt: Date.now() },
    ]);
    // Supabase API errors have a `code` property — treated as permanent
    mockSupabase.from.mockReturnValue(mockChain({ error: { message: "constraint violation", code: "23505" } }));

    const result = await flushQueue();

    expect(getSyncStatus()).toBe("unsynced");
    // Permanent errors: entries deleted from queue (poison pill removal)
    expect(mockDb.sync_queue.delete).toHaveBeenCalledWith(1);
    expect(mockDb.sync_queue.delete).toHaveBeenCalledWith(2);
    // Both entries processed (not stopped at first error)
    expect(result).toEqual({ flushed: 0, failed: 2 });

    vi.restoreAllMocks();
  });

  it("keeps queue entry on transient error (network) for retry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockSupabase.auth.getSession.mockResolvedValueOnce(mockSession());
    mockDb.sync_queue.toArray.mockResolvedValueOnce([
      { id: 1, bookId: "b1", operation: "upsert", payload: testBook, createdAt: Date.now() },
    ]);
    // Network errors don't have a `code` — treated as transient
    const throwingChain = mockChain({ error: null });
    (throwingChain.upsert as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new TypeError("Failed to fetch");
    });
    mockSupabase.from
      .mockReturnValueOnce(throwingChain) // books table — throws
      .mockReturnValue(mockChain({ error: null })); // sync_metadata — normal

    const result = await flushQueue();

    expect(getSyncStatus()).toBe("unsynced");
    // Transient error: entry NOT deleted — kept for retry
    expect(mockDb.sync_queue.delete).not.toHaveBeenCalled();
    expect(result).toEqual({ flushed: 0, failed: 1 });

    vi.restoreAllMocks();
  });

  it("returns flushed/failed counts on mixed success", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockSupabase.auth.getSession.mockResolvedValueOnce(mockSession());
    mockDb.sync_queue.toArray.mockResolvedValueOnce([
      { id: 1, bookId: "b1", operation: "upsert", payload: testBook, createdAt: Date.now() },
      { id: 2, bookId: "b2", operation: "upsert", payload: { ...testBook, id: "b2" }, createdAt: Date.now() },
    ]);
    // First call succeeds, second fails with permanent error
    const successChain = mockChain({ error: null });
    const errorChain = mockChain({ error: { message: "constraint violation", code: "23505" } });
    mockSupabase.from
      .mockReturnValueOnce(successChain)
      .mockReturnValueOnce(errorChain)
      .mockReturnValue(mockChain({ error: null })); // sync_metadata

    const result = await flushQueue();

    expect(result).toEqual({ flushed: 1, failed: 1 });
    expect(getSyncStatus()).toBe("unsynced");

    vi.restoreAllMocks();
  });

  it("returns { flushed, failed } on success", async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce(mockSession());
    mockDb.sync_queue.toArray.mockResolvedValueOnce([
      { id: 1, bookId: "b1", operation: "upsert", payload: testBook, createdAt: Date.now() },
    ]);
    mockSupabase.from.mockReturnValue(mockChain({ error: null }));

    const result = await flushQueue();

    expect(result).toEqual({ flushed: 1, failed: 0 });
  });

  it("returns { flushed: 0, failed: 0 } when no session", async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });

    const result = await flushQueue();

    expect(result).toEqual({ flushed: 0, failed: 0 });
  });
});

// ============================================================
// 3d: pullRemoteChanges
// ============================================================

describe("pullRemoteChanges", () => {
  const storage: Record<string, string> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage (jsdom may not support .clear())
    for (const key of Object.keys(storage)) delete storage[key];
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => { storage[key] = value; },
      removeItem: (key: string) => { delete storage[key]; },
    });
  });

  it("returns early if no session", async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });

    await pullRemoteChanges();

    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("first pull: fetches all books (no cursor filter)", async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce(mockSession());
    const chain = mockChain({ data: [], error: null });
    mockSupabase.from.mockReturnValue(chain);

    await pullRemoteChanges();

    expect(chain.select).toHaveBeenCalledWith("*");
    expect(chain.eq).toHaveBeenCalledWith("user_id", "u1");
    expect(chain.gt).not.toHaveBeenCalled();
  });

  it("subsequent pull: uses cursor for incremental fetch", async () => {
    const cursor = "2023-11-14T22:30:00.000Z";
    storage["tsundoku_last_synced_u1"] = cursor;

    mockSupabase.auth.getSession.mockResolvedValueOnce(mockSession());
    const chain = mockChain({ data: [], error: null });
    mockSupabase.from.mockReturnValue(chain);

    await pullRemoteChanges();

    expect(chain.gt).toHaveBeenCalledWith("updated_at", cursor);
  });

  it("inserts new remote books into local db", async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce(mockSession());
    const remoteRow = {
      id: "new-book",
      title: "Remote Book",
      author: "Remote Author",
      cover_url: "",
      stage: "tsundoku",
      position: 0,
      is_reading: false,
      created_at: "2023-11-14T22:13:20.000Z",
      updated_at: "2023-11-14T22:30:00.000Z",
      deleted_at: null,
    };
    const chain = mockChain({ data: [remoteRow], error: null });
    mockSupabase.from.mockReturnValue(chain);
    mockDb.books.get.mockResolvedValueOnce(undefined);

    await pullRemoteChanges();

    expect(mockDb.books.put).toHaveBeenCalledWith(
      expect.objectContaining({ id: "new-book", title: "Remote Book" }),
    );
  });

  it("updates local book when remote is newer", async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce(mockSession());
    const remoteRow = {
      id: "b1",
      title: "Updated Title",
      author: "Author",
      cover_url: "",
      stage: "tsundoku",
      position: 0,
      is_reading: false,
      created_at: "2023-11-14T22:13:20.000Z",
      updated_at: "2023-11-15T00:00:00.000Z",
      deleted_at: null,
    };
    const chain = mockChain({ data: [remoteRow], error: null });
    mockSupabase.from.mockReturnValue(chain);
    mockDb.books.get.mockResolvedValueOnce({ ...testBook, updatedAt: 1700001000000 });

    await pullRemoteChanges();

    expect(mockDb.books.put).toHaveBeenCalledWith(
      expect.objectContaining({ id: "b1", title: "Updated Title" }),
    );
  });

  it("skips update when local is newer", async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce(mockSession());
    const remoteRow = {
      id: "b1",
      title: "Old Title",
      author: "Author",
      cover_url: "",
      stage: "tsundoku",
      position: 0,
      is_reading: false,
      created_at: "2023-11-14T22:13:20.000Z",
      updated_at: "2023-11-14T22:00:00.000Z",
      deleted_at: null,
    };
    const chain = mockChain({ data: [remoteRow], error: null });
    mockSupabase.from.mockReturnValue(chain);
    mockDb.books.get.mockResolvedValueOnce({ ...testBook, updatedAt: 1700100000000 });

    await pullRemoteChanges();

    expect(mockDb.books.put).not.toHaveBeenCalled();
  });

  it("deletes local book when remote has deletedAt", async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce(mockSession());
    const remoteRow = {
      id: "b1",
      title: "Deleted Book",
      author: "Author",
      cover_url: "",
      stage: "tsundoku",
      position: 0,
      is_reading: false,
      created_at: "2023-11-14T22:13:20.000Z",
      updated_at: "2023-11-14T22:30:00.000Z",
      deleted_at: "2023-11-15T00:00:00.000Z",
    };
    const chain = mockChain({ data: [remoteRow], error: null });
    mockSupabase.from.mockReturnValue(chain);

    await pullRemoteChanges();

    expect(mockDb.books.delete).toHaveBeenCalledWith("b1");
    expect(mockDb.books.put).not.toHaveBeenCalled();
  });

  it("sets localStorage cursor after successful pull", async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce(mockSession());
    const chain = mockChain({ data: [], error: null });
    mockSupabase.from.mockReturnValue(chain);

    await pullRemoteChanges();

    const cursor = storage["tsundoku_last_synced_u1"];
    expect(cursor).toBeTruthy();
    expect(new Date(cursor).getTime()).not.toBeNaN();
  });

  it("does not advance cursor when a Dexie write fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Set an existing cursor
    storage["tsundoku_last_synced_u1"] = "2023-11-14T00:00:00.000Z";
    const originalCursor = storage["tsundoku_last_synced_u1"];

    mockSupabase.auth.getSession.mockResolvedValueOnce(mockSession());
    const remoteRow = {
      id: "new-book",
      title: "Remote Book",
      author: "Remote Author",
      cover_url: "",
      stage: "tsundoku",
      position: 0,
      is_reading: false,
      created_at: "2023-11-14T22:13:20.000Z",
      updated_at: "2023-11-14T22:30:00.000Z",
      deleted_at: null,
    };
    const chain = mockChain({ data: [remoteRow], error: null });
    mockSupabase.from.mockReturnValue(chain);
    mockDb.books.get.mockResolvedValueOnce(undefined);
    mockDb.books.put.mockRejectedValueOnce(new Error("IndexedDB quota exceeded"));

    await pullRemoteChanges();

    // Cursor should NOT have advanced
    expect(storage["tsundoku_last_synced_u1"]).toBe(originalCursor);

    vi.restoreAllMocks();
  });
});

// ============================================================
// 3e: startSyncListeners
// ============================================================

describe("startSyncListeners", () => {
  it("returns a cleanup function", () => {
    const cleanup = startSyncListeners();
    expect(typeof cleanup).toBe("function");
    cleanup();
  });

  it("adds online event listener", () => {
    const spy = vi.spyOn(window, "addEventListener");
    const cleanup = startSyncListeners();

    expect(spy).toHaveBeenCalledWith("online", expect.any(Function));

    cleanup();
    spy.mockRestore();
  });

  it("sets up 5-minute interval", () => {
    const spy = vi.spyOn(globalThis, "setInterval");
    const cleanup = startSyncListeners();

    expect(spy).toHaveBeenCalledWith(expect.any(Function), 5 * 60 * 1000);

    cleanup();
    spy.mockRestore();
  });

  it("cleanup removes listener and clears interval", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const clearSpy = vi.spyOn(globalThis, "clearInterval");

    const cleanup = startSyncListeners();
    cleanup();

    expect(removeSpy).toHaveBeenCalledWith("online", expect.any(Function));
    expect(clearSpy).toHaveBeenCalled();

    removeSpy.mockRestore();
    clearSpy.mockRestore();
  });
});

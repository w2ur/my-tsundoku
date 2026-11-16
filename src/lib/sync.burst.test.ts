import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Book } from "./types";

// Real Dexie on fake-indexeddb: the burst behaviour depends on when queue
// writes commit relative to the flush's read, which hand-rolled mocks cannot show.
type Reply = { error: { message: string } | null; status: number };

const { mockSupabase, calls } = vi.hoisted(() => {
  const calls = {
    /** Book ids of every upsert request, one array per request. */
    upserts: [] as string[][],
    /** Rows of every upsert request, as sent. */
    rows: [] as Array<Array<{ id: string; position: number }>>,
    /** Number of soft-delete requests. */
    deletes: 0,
    inFlight: 0,
    maxInFlight: 0,
    respond: (() => ({ error: null, status: 200 })) as (ids: string[]) => Reply,
  };
  return {
    calls,
    mockSupabase: {
      auth: {
        // supabase-js takes a navigator.locks lock here: never a same-tick answer.
        getSession: vi.fn(
          () =>
            new Promise((r) =>
              setTimeout(() => r({ data: { session: { user: { id: "u1" } } } }), 1),
            ),
        ),
      },
      from: vi.fn(),
    },
  };
});

vi.mock("./supabase", () => ({ supabase: mockSupabase }));

import { db } from "./db";
import { enqueueUpsert, flushQueue, getSyncStatus, UPSERT_BATCH_MAX_ROWS } from "./sync";

type Row = { id: string; position: number };

/** A query builder whose request takes one macrotask, like a real round trip. */
function slowChain(table: string) {
  let upsertRows: Row[] | null = null;
  let isDelete = false;
  const chain: Record<string, unknown> = {};
  chain.upsert = vi.fn((rows: Row | Row[]) => {
    upsertRows = Array.isArray(rows) ? rows : [rows];
    return chain;
  });
  chain.update = vi.fn(() => {
    isDelete = true;
    return chain;
  });
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
    let reply: Reply = { error: null, status: 200 };
    if (table === "books") {
      if (upsertRows) {
        const ids = upsertRows.map((row) => row.id);
        calls.upserts.push(ids);
        calls.rows.push(upsertRows);
        reply = calls.respond(ids);
      } else if (isDelete) {
        calls.deletes++;
      }
      calls.inFlight++;
      calls.maxInFlight = Math.max(calls.maxInFlight, calls.inFlight);
    }
    return new Promise((r) =>
      setTimeout(() => {
        if (table === "books") calls.inFlight--;
        r(reply);
      }, 5),
    ).then(resolve, reject);
  };
  return chain;
}

function book(index: number, overrides: Partial<Book> = {}): Book {
  return {
    id: `b${index}`,
    title: `Book ${index}`,
    author: "Author",
    coverUrl: "",
    stage: "tsundoku",
    position: index,
    createdAt: 1700000000000,
    updatedAt: 1700001000000,
    ...overrides,
  };
}

function upsertEntry(payload: Book) {
  return { bookId: payload.id, operation: "upsert" as const, payload, createdAt: Date.now() };
}

const sentIds = () => calls.upserts.flat();

beforeEach(async () => {
  await db.sync_queue.clear();
  await db.sync_failures.clear();
  calls.upserts = [];
  calls.rows = [];
  calls.deletes = 0;
  calls.inFlight = 0;
  calls.maxInFlight = 0;
  calls.respond = () => ({ error: null, status: 200 });
  mockSupabase.from.mockImplementation((table: string) => slowChain(table));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("flushQueue under a burst of writes", () => {
  // Regression: 71ea781 — `flushing` was only set after two awaits, so every
  // flushQueue() call made before the first one read the queue passed the guard
  // and pushed the whole queue again: N queued books cost N² requests, N at a time.
  it("pushes each queued book once, one request at a time", async () => {
    const BURST = 20;
    // moveBookToPosition enqueues every book of the affected column, unawaited.
    for (let i = 0; i < BURST; i++) enqueueUpsert(book(i));

    await new Promise((r) => setTimeout(r, 1500));

    expect(await db.sync_queue.count()).toBe(0);
    expect(sentIds()).toHaveLength(BURST);
    expect(new Set(sentIds()).size).toBe(BURST);
    expect(calls.maxInFlight).toBe(1);
    expect(getSyncStatus()).toBe("synced");
  });

  // The guard alone would strand this entry: its flushQueue() call returns at
  // once because a flush is running, and that flush already read the queue.
  it("drains an entry enqueued while a flush is in flight", async () => {
    enqueueUpsert(book(1));
    while (calls.inFlight === 0) await new Promise((r) => setTimeout(r, 1));
    await enqueueUpsert(book(2));

    await new Promise((r) => setTimeout(r, 500));

    expect(await db.sync_queue.count()).toBe(0);
    expect(sentIds().sort()).toEqual(["b1", "b2"]);
    expect(getSyncStatus()).toBe("synced");
  });

  // forceReconcile and the first-upload prompt queue books and then await
  // flushQueue(). If a flush is already running, a call that returned at once
  // would let them report "done" with their books still in the queue.
  it("makes a caller that arrives mid-flush wait until its own entries are pushed", async () => {
    enqueueUpsert(book(1));
    while (calls.inFlight === 0) await new Promise((r) => setTimeout(r, 1));
    await db.sync_queue.bulkAdd([2, 3].map((i) => upsertEntry(book(i))));

    const result = await flushQueue();

    expect(await db.sync_queue.count()).toBe(0);
    expect(sentIds().sort()).toEqual(["b1", "b2", "b3"]);
    // A caller that joins a running flush gets that whole run's totals.
    expect(result).toEqual({ flushed: 3, failed: 0 });
  });
});

describe("flushQueue batching", () => {
  // Regression: 71ea781 — the queue was never coalesced and each entry was its
  // own request, so moving a book twice in a column of N books cost 2N requests.
  it("sends a column moved twice as one request carrying each book's latest state", async () => {
    const COLUMN = 20;
    const firstMove = Array.from({ length: COLUMN }, (_, i) => upsertEntry(book(i, { position: i })));
    const secondMove = Array.from({ length: COLUMN }, (_, i) =>
      upsertEntry(book(i, { position: COLUMN - i })),
    );
    await db.sync_queue.bulkAdd([...firstMove, ...secondMove]);

    const result = await flushQueue();

    expect(calls.upserts).toHaveLength(1);
    expect(calls.rows[0]).toHaveLength(COLUMN);
    for (const row of calls.rows[0]) {
      expect(row.position).toBe(COLUMN - Number(row.id.slice(1)));
    }
    expect(await db.sync_queue.count()).toBe(0);
    expect(result).toEqual({ flushed: COLUMN, failed: 0 });
  });

  it("isolates a refused book instead of failing the whole batch", async () => {
    await db.sync_queue.bulkAdd([1, 2, 3, 4, 5].map((i) => upsertEntry(book(i))));
    // A batch is atomic: one bad row refuses all of it.
    calls.respond = (ids) =>
      ids.includes("b3")
        ? { error: { message: "value too long" }, status: 400 }
        : { error: null, status: 200 };

    const result = await flushQueue();

    expect(result).toEqual({ flushed: 4, failed: 1 });
    expect(await db.sync_queue.count()).toBe(0);
    const failures = await db.sync_failures.toArray();
    expect(failures.map((f) => f.bookId)).toEqual(["b3"]);
    expect(failures[0]).toMatchObject({ status: 400, message: "value too long", title: "Book 3" });
    // The four good books each reached the cloud in a request that succeeded.
    const accepted = calls.upserts.filter((ids) => !ids.includes("b3")).flat().sort();
    expect(accepted).toEqual(["b1", "b2", "b4", "b5"]);
    expect(getSyncStatus()).toBe("unsynced");
  });

  it("keeps every entry and does not retry row by row when the batch fails transiently", async () => {
    await db.sync_queue.bulkAdd([1, 2, 3, 4, 5].map((i) => upsertEntry(book(i))));
    calls.respond = () => ({ error: { message: "TypeError: Failed to fetch" }, status: 0 });

    const result = await flushQueue();

    expect(result).toEqual({ flushed: 0, failed: 5 });
    expect(calls.upserts).toHaveLength(1);
    expect(await db.sync_queue.count()).toBe(5);
    expect(await db.sync_failures.count()).toBe(0);
    expect(getSyncStatus()).toBe("unsynced");
  });

  it("sends only the delete when a book was edited then deleted", async () => {
    await db.sync_queue.bulkAdd([
      upsertEntry(book(1)),
      { bookId: "b1", operation: "delete" as const, payload: { id: "b1" }, createdAt: Date.now() },
      upsertEntry(book(2)),
    ]);

    const result = await flushQueue();

    expect(sentIds()).toEqual(["b2"]);
    expect(calls.deletes).toBe(1);
    expect(await db.sync_queue.count()).toBe(0);
    expect(result).toEqual({ flushed: 2, failed: 0 });
  });

  it("splits a queue larger than one batch into several requests", async () => {
    const total = UPSERT_BATCH_MAX_ROWS * 2 + 5;
    await db.sync_queue.bulkAdd(Array.from({ length: total }, (_, i) => upsertEntry(book(i))));

    const result = await flushQueue();

    expect(calls.upserts.map((ids) => ids.length)).toEqual([
      UPSERT_BATCH_MAX_ROWS,
      UPSERT_BATCH_MAX_ROWS,
      5,
    ]);
    expect(await db.sync_queue.count()).toBe(0);
    expect(result).toEqual({ flushed: total, failed: 0 });
  });
});

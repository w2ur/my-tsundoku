import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { ENTERED_APP_SETTING, ENTRY_HINT_KEY } from "./entry";
import { addBook, importBooks } from "./books";
import type { Book } from "./types";

vi.mock("./sync", () => ({ enqueueUpsert: vi.fn(), enqueueDelete: vi.fn() }));

beforeEach(async () => {
  await db.books.clear();
  await db.settings.clear();
  localStorage.clear();
  delete document.documentElement.dataset.entry;
});

const entered = async () => (await db.settings.get(ENTERED_APP_SETTING))?.value;

// Regression: final-fix wave item 1 (this commit) — after addBook, client navigation to "/" re-showed the
// landing because <html data-entry> was only set once EntryGate's Dexie read resolved.
describe("addBook marks the entry", () => {
  it("sets data-entry, the hint and the persisted setting", async () => {
    await addBook({ title: "T", author: "A", coverUrl: "" });
    expect(document.documentElement.dataset.entry).toBe("app");
    expect(localStorage.getItem(ENTRY_HINT_KEY)).toBe("app");
    expect(await entered()).toBe(true);
  });
});

// Regression: final-fix wave item 1 (this commit) — same landing flash after a Settings import.
describe("importBooks marks the entry", () => {
  const book: Book = {
    id: "b1", title: "T", author: "A", coverUrl: "", stage: "a_acheter",
    position: 0, createdAt: 1, updatedAt: 1,
  };

  it("marks it when at least one book is imported", async () => {
    await importBooks([book], "merge");
    expect(document.documentElement.dataset.entry).toBe("app");
    expect(localStorage.getItem(ENTRY_HINT_KEY)).toBe("app");
    expect(await entered()).toBe(true);
  });

  it("does not mark it for an empty import", async () => {
    await importBooks([], "merge");
    expect(document.documentElement.dataset.entry).toBeUndefined();
    expect(await entered()).toBeUndefined();
  });
});

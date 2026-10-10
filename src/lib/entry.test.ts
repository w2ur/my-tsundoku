import "fake-indexeddb/auto";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import {
  ENTERED_APP_SETTING,
  ENTRY_HINT_KEY,
  ENTRY_HINT_SCRIPT,
  enterApp,
  readEnteredApp,
  resolveEntry,
} from "./entry";

beforeEach(async () => {
  await db.settings.clear();
  localStorage.clear();
  delete document.documentElement.dataset.entry;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resolveEntry", () => {
  it.each([
    ["books loading, setting loading", undefined, undefined, "unknown"],
    ["books loading, entered", undefined, true, "unknown"],
    ["no books, setting loading", [], undefined, "unknown"],
    ["books present, setting not resolved yet", [{ id: "1" }], undefined, "app"],
    ["books present, not entered", [{ id: "1" }], false, "app"],
    ["no books, entered", [], true, "app"],
    ["no books, not entered", [], false, "landing"],
  ] as const)("%s", (_name, books, entered, expected) => {
    expect(resolveEntry(books as unknown[] | undefined, entered)).toBe(expected);
  });
});

describe("ENTRY_HINT_SCRIPT", () => {
  const run = () => new Function(ENTRY_HINT_SCRIPT)();

  it("sets data-entry when the hint is app", () => {
    localStorage.setItem(ENTRY_HINT_KEY, "app");
    run();
    expect(document.documentElement.dataset.entry).toBe("app");
  });

  it("leaves it unset when the hint is absent", () => {
    run();
    expect(document.documentElement.dataset.entry).toBeUndefined();
  });

  it("does not throw when localStorage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(run).not.toThrow();
    expect(document.documentElement.dataset.entry).toBeUndefined();
  });
});

describe("readEnteredApp", () => {
  it("is false, not undefined, when no row exists", async () => {
    expect(await readEnteredApp()).toBe(false);
  });

  it("is true once the setting is stored", async () => {
    await db.settings.put({ key: ENTERED_APP_SETTING, value: true });
    expect(await readEnteredApp()).toBe(true);
  });
});

describe("enterApp", () => {
  it("stores the setting, the hint and the attribute", async () => {
    await enterApp();
    expect((await db.settings.get(ENTERED_APP_SETTING))?.value).toBe(true);
    expect(localStorage.getItem(ENTRY_HINT_KEY)).toBe("app");
    expect(document.documentElement.dataset.entry).toBe("app");
  });
});

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";

const { mockBooks, mockEntered, put } = vi.hoisted(() => ({
  mockBooks: { current: undefined as undefined | object[] },
  mockEntered: { current: undefined as undefined | boolean },
  put: vi.fn(async () => undefined),
}));

vi.mock("@/hooks/useBooks", () => ({ useBooks: () => mockBooks.current }));
vi.mock("dexie-react-hooks", () => ({ useLiveQuery: () => mockEntered.current }));
vi.mock("@/lib/db", () => ({ db: { settings: { put } } }));

import EntryGate from "./EntryGate";
import { ENTERED_APP_SETTING, ENTRY_HINT_KEY } from "@/lib/entry";

const entry = () => document.documentElement.dataset.entry;

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.entry;
  put.mockClear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  mockBooks.current = undefined;
  mockEntered.current = undefined;
});

describe("EntryGate", () => {
  it("opens the app, writes the hint and persists the setting when books exist", async () => {
    mockBooks.current = [{ id: "1" }];
    mockEntered.current = false;
    render(<EntryGate />);
    await waitFor(() => expect(entry()).toBe("app"));
    expect(localStorage.getItem(ENTRY_HINT_KEY)).toBe("app");
    expect(put).toHaveBeenCalledWith({ key: ENTERED_APP_SETTING, value: true });
  });

  it("does not wait for the setting when books exist", async () => {
    mockBooks.current = [{ id: "1" }];
    mockEntered.current = undefined;
    render(<EntryGate />);
    await waitFor(() => expect(entry()).toBe("app"));
  });

  it("does not rewrite the setting when it is already true", async () => {
    mockBooks.current = [{ id: "1" }];
    mockEntered.current = true;
    render(<EntryGate />);
    await waitFor(() => expect(entry()).toBe("app"));
    expect(put).not.toHaveBeenCalled();
  });

  it("opens the app with no books when the user already entered", async () => {
    mockBooks.current = [];
    mockEntered.current = true;
    render(<EntryGate />);
    await waitFor(() => expect(entry()).toBe("app"));
  });

  it("removes the attribute and the hint for a first visit", async () => {
    document.documentElement.dataset.entry = "app";
    localStorage.setItem(ENTRY_HINT_KEY, "app");
    mockBooks.current = [];
    mockEntered.current = false;
    render(<EntryGate />);
    await waitFor(() => expect(entry()).toBeUndefined());
    expect(localStorage.getItem(ENTRY_HINT_KEY)).toBeNull();
    expect(put).not.toHaveBeenCalled();
  });

  it("leaves the attribute untouched while loading", () => {
    document.documentElement.dataset.entry = "app";
    mockBooks.current = undefined;
    mockEntered.current = undefined;
    render(<EntryGate />);
    expect(entry()).toBe("app");
  });

  it("does not throw when localStorage is blocked", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    mockBooks.current = [{ id: "1" }];
    mockEntered.current = false;
    expect(() => render(<EntryGate />)).not.toThrow();
    await waitFor(() => expect(entry()).toBe("app"));
  });
});

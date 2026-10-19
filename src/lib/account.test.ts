import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockList,
  mockRemove,
  mockRpc,
  mockSignOut,
  mockGetSession,
  mockTableDelete,
} = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockRemove: vi.fn(),
  mockRpc: vi.fn(),
  mockSignOut: vi.fn(),
  mockGetSession: vi.fn(),
  mockTableDelete: vi.fn(),
}));

vi.mock("./supabase", () => ({
  supabase: {
    auth: { getSession: mockGetSession, signOut: mockSignOut },
    storage: { from: vi.fn(() => ({ list: mockList, remove: mockRemove })) },
    from: vi.fn(() => ({ delete: () => ({ eq: mockTableDelete }) })),
    rpc: mockRpc,
  },
}));

vi.mock("./db", () => ({ db: null }));

import { deleteAccount } from "./account";

describe("deleteAccount cover cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    mockTableDelete.mockResolvedValue({ error: null });
    mockList.mockResolvedValue({ data: [{ name: "a.jpg" }, { name: "b.jpg" }], error: null });
    mockRemove.mockResolvedValue({ data: [], error: null });
    mockRpc.mockResolvedValue({ error: null });
  });

  it("reports no leftovers when every cover is removed", async () => {
    const result = await deleteAccount();
    expect(result).toEqual({ error: null, coversNotRemoved: false });
    expect(mockRemove).toHaveBeenCalledWith(["u1/a.jpg", "u1/b.jpg"]);
    expect(mockRpc).not.toHaveBeenCalledWith("record_cover_leftovers", expect.anything());
  });

  // Regression: pending-commit — a storage remove() error used to be swallowed,
  // so the account vanished while the photos stayed public and nobody was told.
  it("surfaces a storage remove error, logs it and records the leftovers", async () => {
    mockRemove.mockResolvedValue({ data: null, error: { message: "boom" } });
    const result = await deleteAccount();
    expect(result).toEqual({ error: null, coversNotRemoved: true });
    expect(console.error).toHaveBeenCalled();
    expect(mockRpc).toHaveBeenCalledWith("record_cover_leftovers", {
      paths: ["u1/a.jpg", "u1/b.jpg"],
    });
    expect(mockRpc).toHaveBeenCalledWith("delete_own_account");
  });

  it("records the whole user prefix when the listing itself fails", async () => {
    mockList.mockResolvedValue({ data: null, error: { message: "nope" } });
    const result = await deleteAccount();
    expect(result.coversNotRemoved).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith("record_cover_leftovers", { paths: ["u1/"] });
  });

  it("treats a thrown storage error like a returned one", async () => {
    mockList.mockRejectedValue(new Error("network"));
    const result = await deleteAccount();
    expect(result.coversNotRemoved).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith("record_cover_leftovers", { paths: ["u1/"] });
  });

  it("still deletes the account when recording leftovers fails too", async () => {
    mockRemove.mockResolvedValue({ data: null, error: { message: "boom" } });
    mockRpc.mockImplementation(async (name: string) =>
      name === "record_cover_leftovers" ? { error: { message: "rpc down" } } : { error: null },
    );
    const result = await deleteAccount();
    expect(result).toEqual({ error: null, coversNotRemoved: true });
    expect(mockRpc).toHaveBeenCalledWith("delete_own_account");
  });
});

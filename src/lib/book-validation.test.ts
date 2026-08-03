import { describe, it, expect } from "vitest";
import { validateBookRecord, validateBookRecords } from "./book-validation";

const valid = {
  id: "b1",
  title: "Dune",
  author: "Frank Herbert",
  stage: "tsundoku",
  coverUrl: "",
  position: 3,
  createdAt: 1700000000000,
  updatedAt: 1700001000000,
};

function reasonFor(patch: Record<string, unknown>): string {
  const result = validateBookRecord({ ...valid, ...patch });
  if (result.ok) throw new Error("expected rejection");
  return result.reason;
}

describe("validateBookRecord", () => {
  it("accepts a well-formed record", () => {
    const result = validateBookRecord(valid);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.book.title).toBe("Dune");
  });

  it("rejects an absent author — the cloud column is NOT NULL", () => {
    expect(reasonFor({ author: undefined })).toBe("missing author");
    expect(reasonFor({ author: null })).toBe("missing author");
    expect(reasonFor({ author: 42 })).toBe("missing author");
  });

  it("accepts a blank author and title, because the cloud does", () => {
    // BookForm gates only on title, so books with author "" exist and sync
    // today. Rejecting them here would strand books that currently work.
    for (const patch of [{ author: "" }, { author: "   " }, { title: "" }]) {
      expect(validateBookRecord({ ...valid, ...patch }).ok).toBe(true);
    }
  });

  it("rejects a stage outside the CHECK constraint", () => {
    expect(reasonFor({ stage: "to_read" })).toContain("invalid stage");
  });

  it("rejects dates that cannot be serialized", () => {
    // new Date(undefined).toISOString() throws, which flushQueue would have
    // treated as transient and retried on every flush forever.
    expect(reasonFor({ createdAt: undefined })).toBe("invalid createdAt");
    expect(reasonFor({ updatedAt: NaN })).toBe("invalid updatedAt");
    expect(reasonFor({ updatedAt: Infinity })).toBe("invalid updatedAt");
    expect(reasonFor({ createdAt: "2023-01-01" })).toBe("invalid createdAt");
  });

  it("rejects missing id and title", () => {
    expect(reasonFor({ id: "" })).toBe("missing id");
    expect(reasonFor({ id: undefined })).toBe("missing id");
    expect(reasonFor({ title: null })).toBe("missing title");
  });

  it("rejects non-objects", () => {
    for (const bad of [null, undefined, 42, "book", true, []]) {
      const result = validateBookRecord(bad);
      expect(result.ok).toBe(false);
    }
  });

  it("defaults the fields that have a safe default rather than rejecting", () => {
    const result = validateBookRecord({
      id: "b2",
      title: "T",
      author: "A",
      stage: "revendre",
      createdAt: 1,
      updatedAt: 2,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.book.coverUrl).toBe("");
    expect(result.book.position).toBe(0);
    expect(result.book.isReading).toBe(false);
  });

  it("keeps optional fields only when they carry a value", () => {
    const result = validateBookRecord({ ...valid, notes: "hi", isbn: "  ", storeUrl: null });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.book.notes).toBe("hi");
    expect(result.book.isbn).toBeUndefined();
    expect(result.book.storeUrl).toBeUndefined();
  });
});

describe("validateBookRecords", () => {
  it("splits a batch and labels rejections usefully", () => {
    const { books, rejected } = validateBookRecords([
      valid,
      { ...valid, id: "b2", stage: "nope" },
      { ...valid, id: "b3", title: undefined },
    ]);

    expect(books).toHaveLength(1);
    expect(rejected).toEqual([
      { label: "Dune", reason: 'invalid stage "nope"' },
      { label: "#3", reason: "missing title" },
    ]);
  });

  it("returns everything when the batch is clean", () => {
    const { books, rejected } = validateBookRecords([valid, { ...valid, id: "b2" }]);
    expect(books).toHaveLength(2);
    expect(rejected).toEqual([]);
  });
});

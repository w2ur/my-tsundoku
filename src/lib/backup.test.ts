import { describe, it, expect } from "vitest";
import { createBackup, parseBackup } from "./backup";
import type { Book } from "./types";

const mockBook: Book = {
  id: "test-id-1",
  title: "Le Petit Prince",
  author: "Antoine de Saint-Exupery",
  coverUrl: "",
  stage: "bibliotheque",
  position: 0,
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

describe("createBackup", () => {
  it("returns valid JSON with version, exportedAt, and books", () => {
    const json = createBackup([mockBook]);
    const data = JSON.parse(json);

    expect(data.version).toBe(1);
    expect(data.exportedAt).toBeTruthy();
    expect(new Date(data.exportedAt).getTime()).not.toBeNaN();
    expect(data.books).toHaveLength(1);
    expect(data.books[0].id).toBe("test-id-1");
  });

  it("handles empty book array", () => {
    const json = createBackup([]);
    const data = JSON.parse(json);

    expect(data.books).toHaveLength(0);
    expect(data.version).toBe(1);
  });
});

describe("parseBackup", () => {
  it("parses a valid backup", () => {
    const json = createBackup([mockBook]);
    const result = parseBackup(json);

    expect(result.error).toBeUndefined();
    expect(result.books).toHaveLength(1);
    expect(result.books[0].title).toBe("Le Petit Prince");
  });

  it("rejects invalid JSON", () => {
    const result = parseBackup("not json at all");

    expect(result.books).toHaveLength(0);
    expect(result.error).toBeTruthy();
  });

  it("rejects JSON without version", () => {
    const result = parseBackup(JSON.stringify({ books: [] }));

    expect(result.books).toHaveLength(0);
    expect(result.error).toBeTruthy();
  });

  it("rejects JSON without books array", () => {
    const result = parseBackup(JSON.stringify({ version: 1, books: "not an array" }));

    expect(result.books).toHaveLength(0);
    expect(result.error).toBeTruthy();
  });

  it("filters out books with invalid stages", () => {
    const json = JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      books: [
        mockBook,
        { ...mockBook, id: "bad-stage", stage: "invalid_stage" },
      ],
    });
    const result = parseBackup(json);

    expect(result.books).toHaveLength(1);
    expect(result.books[0].id).toBe("test-id-1");
  });

  it("filters out books missing required fields", () => {
    const json = JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      books: [
        mockBook,
        { id: "no-title", stage: "tsundoku" },
        { title: "No ID", stage: "tsundoku" },
      ],
    });
    const result = parseBackup(json);

    expect(result.books).toHaveLength(1);
  });

  it("returns error when all books are invalid", () => {
    const json = JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      books: [{ bad: "data" }],
    });
    const result = parseBackup(json);

    expect(result.books).toHaveLength(0);
    expect(result.error).toBeTruthy();
  });
});

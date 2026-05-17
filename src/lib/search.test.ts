import { describe, it, expect } from "vitest";
import { matchesSearch } from "./search";
import type { Book } from "./types";

const book = (title: string, author: string): Book => ({
  id: "1",
  title,
  author,
  coverUrl: "",
  stage: "tsundoku",
  position: 0,
  createdAt: 0,
  updatedAt: 0,
});

describe("matchesSearch", () => {
  it("returns true for empty query", () => {
    expect(matchesSearch(book("L'Étranger", "Albert Camus"), "")).toBe(true);
  });

  it("returns true for whitespace-only query", () => {
    expect(matchesSearch(book("L'Étranger", "Albert Camus"), "   ")).toBe(true);
  });

  it("matches title case-insensitively", () => {
    expect(matchesSearch(book("L'Étranger", "Albert Camus"), "étranger")).toBe(true);
  });

  it("matches author case-insensitively", () => {
    expect(matchesSearch(book("L'Étranger", "Albert Camus"), "camus")).toBe(true);
  });

  it("matches multiple tokens across title and author", () => {
    expect(matchesSearch(book("L'Étranger", "Albert Camus"), "camus étranger")).toBe(true);
  });

  it("matches tokens in any order", () => {
    expect(matchesSearch(book("L'Étranger", "Albert Camus"), "étranger albert")).toBe(true);
  });

  it("returns false when a token matches neither field", () => {
    expect(matchesSearch(book("L'Étranger", "Albert Camus"), "camus peste")).toBe(false);
  });

  it("returns false for completely unrelated query", () => {
    expect(matchesSearch(book("L'Étranger", "Albert Camus"), "tolkien")).toBe(false);
  });
});

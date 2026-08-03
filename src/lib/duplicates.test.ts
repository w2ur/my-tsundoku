import { describe, it, expect } from "vitest";
import { findDuplicate, normalizeForCompare } from "./duplicates";
import type { Book } from "./types";

function book(overrides: Partial<Book> = {}): Book {
  return {
    id: "b1",
    title: "Jacaranda",
    author: "Gaël Faye",
    coverUrl: "",
    stage: "bibliotheque",
    position: 0,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    ...overrides,
  };
}

describe("normalizeForCompare", () => {
  it("ignores case, accents and punctuation", () => {
    expect(normalizeForCompare("L'Anomalie")).toBe(normalizeForCompare("l anomalie"));
    expect(normalizeForCompare("Gaël Faye")).toBe(normalizeForCompare("gael  faye"));
  });

  it("collapses to empty for a string with no alphanumerics", () => {
    expect(normalizeForCompare("  —  ")).toBe("");
  });
});

describe("findDuplicate", () => {
  it("matches on ISBN across the 10 and 13 forms", () => {
    const library = [book({ id: "owned", isbn: "0306406152" })];
    const match = findDuplicate(
      { isbn: "9780306406157", title: "Anything", author: "Anyone" },
      library,
    );
    expect(match?.book.id).toBe("owned");
    expect(match?.reason).toBe("isbn");
  });

  it("matches on title and author when no ISBN is available", () => {
    const library = [book({ id: "owned" })];
    const match = findDuplicate({ title: "  jacaranda ", author: "GAEL FAYE" }, library);
    expect(match?.book.id).toBe("owned");
    expect(match?.reason).toBe("title-author");
  });

  it("ignores soft-deleted books", () => {
    const library = [book({ id: "gone", isbn: "9780306406157", deletedAt: 123 })];
    expect(findDuplicate({ isbn: "9780306406157", title: "x", author: "y" }, library)).toBeNull();
  });

  it("prefers an ISBN match over a title match regardless of array order", () => {
    const library = [
      book({ id: "by-title" }),
      book({ id: "by-isbn", title: "Different", author: "Other", isbn: "9780306406157" }),
    ];
    const match = findDuplicate(
      { isbn: "9780306406157", title: "Jacaranda", author: "Gaël Faye" },
      library,
    );
    expect(match?.book.id).toBe("by-isbn");
    expect(match?.reason).toBe("isbn");
  });

  it("does not match on title alone when the author differs", () => {
    const library = [book({ id: "owned", author: "Someone Else" })];
    expect(findDuplicate({ title: "Jacaranda", author: "Gaël Faye" }, library)).toBeNull();
  });

  it("does not match when the candidate author is blank", () => {
    const library = [book({ id: "owned", author: "" })];
    expect(findDuplicate({ title: "Jacaranda", author: "" }, library)).toBeNull();
  });

  it("returns null for an empty library", () => {
    expect(findDuplicate({ title: "Jacaranda", author: "Gaël Faye" }, [])).toBeNull();
  });
});

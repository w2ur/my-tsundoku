import { describe, it, expect } from "vitest";
import type { Book } from "./types";

describe("Book type", () => {
  it("accepts the new optional fields", () => {
    const book: Book = {
      id: "abc",
      title: "Test",
      author: "Author",
      coverUrl: "",
      stage: "tsundoku",
      position: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      olWorkId: "/works/OL123W",
      deletedAt: undefined,
    };
    expect(book.olWorkId).toBe("/works/OL123W");
    expect(book.deletedAt).toBeUndefined();
  });
});

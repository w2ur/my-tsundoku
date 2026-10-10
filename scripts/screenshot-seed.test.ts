import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseBackup } from "@/lib/backup";

// The seed behind `npm run screenshots`: public-domain works, synthetic records.
describe("scripts/screenshot-seed.json", () => {
  const raw = readFileSync("scripts/screenshot-seed.json", "utf8");
  const { books, rejected, error } = parseBackup(raw);

  it("parses as a backup with 15 books and nothing rejected", () => {
    expect(error).toBeUndefined();
    expect(rejected).toHaveLength(0);
    expect(books).toHaveLength(15);
  });

  it("fills every stage", () => {
    for (const stage of ["a_acheter", "tsundoku", "bibliotheque", "revendre"]) {
      expect(books.filter((b) => b.stage === stage).length).toBeGreaterThan(0);
    }
  });

  it("has unique ids", () => {
    expect(new Set(books.map((b) => b.id)).size).toBe(books.length);
  });

  it("carries no notes or price, and leaves covers to the app", () => {
    for (const b of books) {
      const extra = b as unknown as Record<string, unknown>;
      expect(extra.notes ?? "").toBe("");
      expect(extra.price ?? "").toBe("");
      expect(b.coverUrl).toBe("");
    }
  });
});

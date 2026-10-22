import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseBackup } from "@/lib/backup";
import manifest from "@/app/manifest";

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

  describe("screenshot descriptions", () => {
    const { screenshots } = JSON.parse(raw) as {
      screenshots: { file: string; alt: string; label: string }[];
    };
    const readme = readFileSync("README.md", "utf8");

    it("describes every manifest screenshot, with an alt text and a label", () => {
      expect(screenshots.map((s) => s.file)).toEqual(["screenshot-board.png", "screenshot-add.png"]);
      for (const s of screenshots) {
        expect(s.alt.length).toBeGreaterThan(20);
        expect(s.label.length).toBeGreaterThan(10);
      }
    });

    it("keeps the README alt texts equal to the seed's", () => {
      for (const { file, alt } of screenshots) {
        expect(readme).toContain(`![${alt}](public/screenshots/${file})`);
      }
    });

    it("serves the seed's labels in the web app manifest", () => {
      const labels = (manifest().screenshots ?? []).map((s) => s.label);
      expect(labels).toEqual(screenshots.map((s) => s.label));
    });
  });
});

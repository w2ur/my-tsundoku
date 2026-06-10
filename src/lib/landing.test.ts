import { describe, it, expect } from "vitest";
import { LANDING } from "./landing";

describe("LANDING content", () => {
  it("has the same section count in both locales", () => {
    expect(LANDING.en.sections.length).toBe(LANDING.fr.sections.length);
  });

  it("has no empty strings in either locale", () => {
    for (const locale of ["fr", "en"] as const) {
      const c = LANDING[locale];
      const all = [
        c.heroTitle,
        c.heroSubtitle,
        c.ctaLabel,
        c.metaDescription,
        ...c.sections.flatMap((s) => [s.title, s.body]),
      ];
      for (const s of all) expect(s.trim().length).toBeGreaterThan(0);
    }
  });

  it("keeps meta descriptions within Google's display range", () => {
    for (const locale of ["fr", "en"] as const) {
      expect(LANDING[locale].metaDescription.length).toBeLessThanOrEqual(160);
    }
  });
});

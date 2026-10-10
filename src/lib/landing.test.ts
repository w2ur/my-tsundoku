import { describe, it, expect } from "vitest";
import { STAGES } from "@/lib/constants";
import { CODE_URL, LANDING, type LandingContent } from "./landing";

const LOCALES = ["fr", "en"] as const;

function allStrings(c: LandingContent): string[] {
  return [
    c.heroTitle,
    c.heroSubtitle,
    c.reassurance,
    c.ctaLabel,
    c.enterAppLabel,
    c.pilesTitle,
    ...c.piles.flatMap((p) => [p.name, p.caption]),
    c.scan.title,
    c.scan.body,
    c.privacy.title,
    c.privacy.body,
    c.privacy.codeLinkLabel,
    c.faqTitle,
    ...c.faq.flatMap((f) => [f.question, f.answer]),
    c.screenshotAlt,
    c.metaDescription,
  ];
}

describe("LANDING content", () => {
  it("has four piles and the same FAQ length in both locales", () => {
    expect(LANDING.fr.piles.length).toBe(4);
    expect(LANDING.en.piles.length).toBe(4);
    expect(LANDING.en.faq.length).toBe(LANDING.fr.faq.length);
  });

  it("lists the piles in STAGES order", () => {
    for (const locale of LOCALES) {
      expect(LANDING[locale].piles.map((p) => p.stage)).toEqual([...STAGES]);
    }
  });

  it("has no empty strings in either locale", () => {
    for (const locale of LOCALES) {
      for (const s of allStrings(LANDING[locale])) {
        expect(s.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("makes no tracking claim", () => {
    for (const locale of LOCALES) {
      for (const s of allStrings(LANDING[locale])) expect(s).not.toMatch(/tracking/i);
    }
  });

  it("points the code link at the real repository", () => {
    expect(CODE_URL).toBe("https://github.com/w2ur/my-tsundoku");
  });

  it("types French copy with curly apostrophes, never straight ones", () => {
    for (const s of allStrings(LANDING.fr)) expect(s).not.toContain("'");
  });

  it("puts a narrow no-break space before ? and : in French FAQ questions", () => {
    for (const { question } of LANDING.fr.faq) {
      expect(question).not.toMatch(/[^ ][?:]/);
    }
  });

  it("keeps meta descriptions within Google's display range", () => {
    for (const locale of LOCALES) {
      expect(LANDING[locale].metaDescription.length).toBeLessThanOrEqual(160);
    }
  });
});

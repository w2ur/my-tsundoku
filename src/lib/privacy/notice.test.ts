import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import {
  PRIVACY_SOURCES,
  composeNotice,
  isPending,
  mergeLinks,
  parseInline,
  resolveEntry,
  type PrivacySources,
} from "./notice";
import { PRIVACY_PATHS } from "./routes";
import sitemap from "@/app/sitemap";

const DIR = path.dirname(new URL(import.meta.url).pathname);
const VENDORED = readdirSync(DIR).filter((f) => f.endsWith(".json"));

function allSections(sources: PrivacySources = PRIVACY_SOURCES) {
  return [sources.site, sources.common, sources.hosts].flatMap((b) => b.sections);
}

function textOf(locale: "fr" | "en"): string {
  return composeNotice(locale)
    .flatMap((s) => [s.title, ...s.paragraphs.flat().map((seg) => seg.text)])
    .join("\n");
}

describe("parseInline", () => {
  const links = { contact: "mailto:a@b.c", site: "https://example.org/" };

  it("turns [text](key) into a link and keeps the surrounding text", () => {
    expect(parseInline("Write to [us](contact), or see [the site](site).", links)).toEqual([
      { kind: "text", text: "Write to " },
      { kind: "link", text: "us", href: "mailto:a@b.c", external: false },
      { kind: "text", text: ", or see " },
      { kind: "link", text: "the site", href: "https://example.org/", external: true },
      { kind: "text", text: "." },
    ]);
  });

  it("leaves text without links as one plain segment, markup and all", () => {
    expect(parseInline("<b>&</b> [not a link]", links)).toEqual([
      { kind: "text", text: "<b>&</b> [not a link]" },
    ]);
  });

  it("fails loudly on an unknown link key", () => {
    expect(() => parseInline("see [this](nowhere)", links)).toThrow(/unknown link key "nowhere"/);
  });

  it("refuses a link that is neither https: nor mailto:", () => {
    expect(() => parseInline("[x](bad)", { bad: "http://example.org" })).toThrow(/https: or mailto:/);
    expect(() => parseInline("[x](js)", { js: "javascript:alert(1)" })).toThrow(/https: or mailto:/);
  });
});

describe("mergeLinks", () => {
  it("lets the site override common, and common override hosts", () => {
    const sources = {
      site: { ...PRIVACY_SOURCES.site, links: { k: "https://site/" } },
      common: { ...PRIVACY_SOURCES.common, links: { k: "https://common/", c: "https://c/" } },
      hosts: { ...PRIVACY_SOURCES.hosts, links: { k: "https://hosts/", c: "https://h/", h: "https://h/" } },
    };
    expect(mergeLinks(sources)).toEqual({ k: "https://site/", c: "https://c/", h: "https://h/" });
  });
});

describe("vendored privacy files", () => {
  it("are the three expected files", () => {
    expect(VENDORED.sort()).toEqual([
      "privacy.common.json",
      "privacy.hosts.json",
      "privacy.my-tsundoku.json",
    ]);
  });

  it("carry no unresolved VÉRIFIER marker", () => {
    for (const file of VENDORED) {
      expect(readFileSync(path.join(DIR, file), "utf8")).not.toMatch(/VÉRIFIER/i);
    }
  });

  it("have as many French paragraphs as English ones in every section", () => {
    for (const section of allSections()) {
      expect(section.paragraphsFr.length, section.id).toBe(section.paragraphs.length);
      expect(section.titleFr.trim(), section.id).not.toBe("");
      expect(section.title.trim(), section.id).not.toBe("");
    }
  });

  it("resolve every compose entry to an existing section", () => {
    for (const entry of PRIVACY_SOURCES.site.compose) {
      expect(() => resolveEntry(entry, PRIVACY_SOURCES), entry).not.toThrow();
    }
  });

  it("resolve every inline link key in both languages", () => {
    const links = mergeLinks(PRIVACY_SOURCES);
    for (const section of allSections()) {
      for (const p of [...section.paragraphs, ...section.paragraphsFr]) {
        expect(() => parseInline(p, links), section.id).not.toThrow();
      }
    }
  });

  it("route the notice to /confidentialite and /en/privacy", () => {
    expect(PRIVACY_SOURCES.site.routes).toEqual({ fr: "/confidentialite", en: "/en/privacy" });
  });
});

describe("resolveEntry", () => {
  it("throws on a compose entry that names a missing section or block", () => {
    expect(() => resolveEntry("site:nope", PRIVACY_SOURCES)).toThrow(/does not resolve/);
    expect(() => resolveEntry("other:editor", PRIVACY_SOURCES)).toThrow(/does not resolve/);
    expect(() => resolveEntry("common", PRIVACY_SOURCES)).toThrow(/does not resolve/);
  });
});

describe("composeNotice", () => {
  it("follows the compose order, minus pending sections", () => {
    const expected = PRIVACY_SOURCES.site.compose
      .map((e) => resolveEntry(e, PRIVACY_SOURCES))
      .filter((s) => !isPending(s))
      .map((s) => s.id);
    expect(composeNotice("fr").map((s) => s.id)).toEqual(expected);
    expect(composeNotice("en").map((s) => s.id)).toEqual(expected);
  });

  it("never renders a pending section", () => {
    const captcha = resolveEntry("site:captcha", PRIVACY_SOURCES);
    // Control: the captcha section is in the compose list and marked pending.
    expect(PRIVACY_SOURCES.site.compose).toContain("site:captcha");
    expect(isPending(captcha)).toBe(true);
    for (const locale of ["fr", "en"] as const) {
      expect(composeNotice(locale).map((s) => s.id)).not.toContain("captcha");
      expect(textOf(locale)).not.toMatch(/Turnstile/);
    }
  });

  it("renders a section once its pending status is lifted", () => {
    const sources: PrivacySources = {
      ...PRIVACY_SOURCES,
      site: {
        ...PRIVACY_SOURCES.site,
        sections: PRIVACY_SOURCES.site.sections.map(({ status, ...s }) =>
          s.id === "captcha" ? s : { ...s, status },
        ),
      },
    };
    expect(composeNotice("en", sources).map((s) => s.id)).toContain("captcha");
  });

  it("picks French titles and paragraphs for fr, English ones for en", () => {
    expect(textOf("fr")).toContain("Qui publie ce site");
    expect(textOf("fr")).not.toContain("Who publishes this site");
    expect(textOf("en")).toContain("Who publishes this site");
    expect(textOf("en")).not.toContain("Qui publie ce site");
  });

  it("resolves the contact link to the privacy mailbox", () => {
    const links = composeNotice("fr")
      .flatMap((s) => s.paragraphs.flat())
      .filter((seg) => seg.kind === "link");
    expect(links).toContainEqual({
      kind: "link",
      text: "privacy@revah.paris",
      href: "mailto:privacy@revah.paris",
      external: false,
    });
    expect(links.some((l) => l.kind === "link" && l.href === "https://vercel.com/")).toBe(true);
  });

  it("leaves no [text](key) markup in the rendered text", () => {
    for (const locale of ["fr", "en"] as const) {
      expect(textOf(locale)).not.toMatch(/\]\(/);
    }
  });
});

describe("PRIVACY_PATHS", () => {
  it("matches the routes of the vendored site file", () => {
    expect(PRIVACY_PATHS).toEqual(PRIVACY_SOURCES.site.routes);
  });

  it("are listed in the sitemap", () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls).toContain(`https://www.my-tsundoku.app${PRIVACY_PATHS.fr}`);
    expect(urls).toContain(`https://www.my-tsundoku.app${PRIVACY_PATHS.en}`);
  });
});

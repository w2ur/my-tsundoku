import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { contrastRatio, relativeLuminance, parseHex } from "./contrast";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

function tokensIn(selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(css);
  if (!block) throw new Error(`No CSS block for ${selector}`);
  const out: Record<string, string> = {};
  for (const [, name, value] of block[1].matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})/g)) {
    out[name] = value;
  }
  return out;
}

const THEMES = [
  ["light", tokensIn(":root")],
  ["dark", tokensIn('[data-theme="dark"]')],
] as const;

// Every surface text can sit on. A token has to clear the bar on all of them,
// because the same class is used on the page, on cards, and on cream panels.
const SURFACES = ["paper", "surface", "cream"] as const;

describe("contrastRatio", () => {
  it("is 21:1 for black on white and 1:1 for a colour on itself", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
    expect(contrastRatio("#2D4A3E", "#2D4A3E")).toBeCloseTo(1, 5);
  });

  it("is order-independent", () => {
    expect(contrastRatio("#8F5D2A", "#FAF8F5")).toBeCloseTo(
      contrastRatio("#FAF8F5", "#8F5D2A"),
      10
    );
  });

  it("rejects malformed colours rather than scoring them", () => {
    expect(() => parseHex("#abc")).toThrow();
    expect(() => parseHex("forest")).toThrow();
  });

  it("orders luminance the way sRGB does", () => {
    expect(relativeLuminance(parseHex("#FFFFFF"))).toBeGreaterThan(
      relativeLuminance(parseHex("#2D4A3E"))
    );
  });

  // Regression: the tokens replaced a text-forest/NN opacity scale whose tiers
  // ran 1.68:1 to 4.07:1. If this control ever passes, the check is broken.
  it("still scores the colours this system replaced as failures", () => {
    expect(contrastRatio("#8E9C94", "#FAF8F5")).toBeLessThan(4.5); // old author line
    expect(contrastRatio("#C4956A", "#FAF8F5")).toBeLessThan(4.5); // old amber text
    expect(contrastRatio("#f87171", "#FAF8F5")).toBeLessThan(4.5); // old delete label
  });
});

describe.each(THEMES)("%s theme tokens", (theme, tokens) => {
  it("defines every semantic token", () => {
    for (const name of ["ink", "muted", "subtle", "faint", "amber-ink", "danger"]) {
      expect(tokens[name], `${theme} is missing --${name}`).toBeDefined();
    }
  });

  it.each(["ink", "muted", "subtle", "amber-ink", "danger"])(
    "--%s clears WCAG AA (4.5:1) on every surface",
    (name) => {
      for (const surface of SURFACES) {
        const ratio = contrastRatio(tokens[name], tokens[surface]);
        expect(
          ratio,
          `${theme} --${name} on --${surface} is ${ratio.toFixed(2)}:1`
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  );

  it("--faint clears the 3:1 non-text bar (it is decorative only)", () => {
    for (const surface of SURFACES) {
      const ratio = contrastRatio(tokens.faint, tokens[surface]);
      expect(ratio, `${theme} --faint on --${surface}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("--focus-ring is visible against the page (3:1)", () => {
    expect(contrastRatio(tokens["focus-ring"], tokens.paper)).toBeGreaterThanOrEqual(3);
  });
});

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

// Returns the body of the first `{ ... }` block whose header matches, balancing
// braces so nested rules (a rule inside @media) do not end the match early.
function blockBody(source: string, header: RegExp): string | null {
  const match = header.exec(source);
  if (!match) return null;
  let depth = 1;
  let i = match.index + match[0].length;
  const start = i;
  for (; i < source.length && depth > 0; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") depth--;
  }
  return depth === 0 ? source.slice(start, i - 1) : null;
}

function stripLayers(source: string): string {
  let out = source;
  for (;;) {
    const m = /@layer\s+[\w-]+\s*\{/.exec(out);
    if (!m) return out;
    const body = blockBody(out, /@layer\s+[\w-]+\s*\{/);
    if (body === null) return out;
    out = out.slice(0, m.index) + out.slice(m.index + m[0].length + body.length + 1);
  }
}

// Unlayered on purpose: a rule inside @layer loses to Tailwind's utilities,
// so `text-sm` on a field would beat it and iOS would zoom again.
const unlayered = stripLayers(read("src/app/globals.css")).replace(/\/\*[\s\S]*?\*\//g, "");

describe("iOS focus zoom guard (globals.css)", () => {
  it("sets form fields to at least 16px on touch devices, outside any @layer", () => {
    const coarse = blockBody(unlayered, /@media\s*\(\s*pointer\s*:\s*coarse\s*\)\s*\{/);
    expect(coarse).not.toBeNull();
    const rule = blockBody(coarse as string, /input\s*,\s*textarea\s*,\s*select\s*\{/);
    expect(rule).not.toBeNull();
    expect(rule).toMatch(/font-size:\s*(max\(16px,\s*1em\)|16px)\s*;/);
  });

  it("disables double-tap zoom on html with touch-action: manipulation", () => {
    const rule = blockBody(unlayered, /(^|\})\s*html\s*\{/);
    expect(rule).not.toBeNull();
    expect(rule).toMatch(/touch-action:\s*manipulation\s*;/);
  });

  it("keeps the helper honest: a rule hidden inside @layer is not seen", () => {
    const layered = stripLayers("@layer base { html { touch-action: manipulation; } }");
    expect(blockBody(layered, /(^|\})\s*html\s*\{/)).toBeNull();
  });
});

describe("pinch-zoom stays allowed (layout.tsx viewport)", () => {
  const layout = read("src/app/layout.tsx");
  const viewport = blockBody(layout, /export const viewport: Viewport = \{/) ?? "";
  // Comments are stripped: layout.tsx explains the absence of maximumScale in prose.
  const code = viewport.replace(/\/\/.*$/gm, "");

  it("finds the viewport export", () => {
    expect(code).toMatch(/initialScale/);
  });

  it("sets no maximumScale and no userScalable", () => {
    expect(code).not.toMatch(/maximumScale/);
    expect(code).not.toMatch(/userScalable/);
  });
});

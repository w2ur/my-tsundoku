import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("@/components/HomeApp", () => ({ default: () => <p>board</p> }));
vi.mock("@/components/EntryGate", () => ({ default: () => null }));

import Home from "./page";
import { LANDING } from "@/lib/landing";
import { PreferencesProvider } from "@/lib/preferences";

describe("home page server markup", () => {
  const html = renderToStaticMarkup(
    <PreferencesProvider>
      <Home />
    </PreferencesProvider>,
  );

  it("carries both surfaces", () => {
    expect(html).toContain('data-surface="landing"');
    expect(html).toContain('data-surface="app"');
  });

  it("carries the landing h1 for crawlers and no-JS", () => {
    const h1 = /<h1[^>]*>(.*?)<\/h1>/.exec(html);
    expect(h1).not.toBeNull();
    expect(h1![1]).toContain(LANDING.fr.heroTitle);
  });
});

describe("globals.css routing rules", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  const outsideLayers = css.replace(/@layer[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g, "");

  it("hides the landing when data-entry is app", () => {
    expect(outsideLayers).toContain('html[data-entry="app"] [data-surface="landing"]');
  });

  it("hides the app unless data-entry is app", () => {
    expect(outsideLayers).toContain('html:not([data-entry="app"]) [data-surface="app"]');
  });

  it("uses display none", () => {
    expect(/\[data-surface="app"\]\s*\{\s*display:\s*none;\s*\}/.test(outsideLayers)).toBe(true);
  });
});

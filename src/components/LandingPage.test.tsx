import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/entry", () => ({ enterApp: vi.fn(async () => undefined) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import LandingPage from "./LandingPage";
import Footer from "./Footer";
import { PreferencesProvider } from "@/lib/preferences";
import { LANDING, CODE_URL } from "@/lib/landing";
import { STAGES } from "@/lib/constants";

function page(locale: "fr" | "en"): { html: string; doc: Document } {
  const html = renderToStaticMarkup(
    <PreferencesProvider>
      <LandingPage locale={locale} />
    </PreferencesProvider>,
  );
  return { html, doc: new DOMParser().parseFromString(html, "text/html") };
}

describe.each(["fr", "en"] as const)("LandingPage (%s)", (locale) => {
  const content = LANDING[locale];

  it("has one h1 and one filled CTA to /add, with the reassurance line", () => {
    const { doc } = page(locale);
    const h1s = doc.querySelectorAll("h1");
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toBe(content.heroTitle);
    const cta = doc.querySelectorAll('a[href="/add"]');
    expect(cta).toHaveLength(1);
    expect(cta[0].textContent).toBe(content.ctaLabel);
    expect(doc.body.textContent).toContain(content.reassurance);
  });

  it("serves the hero board as a light/dark picture pair", () => {
    const { doc } = page(locale);
    const figure = doc.querySelector("main > figure")!;
    const light = figure.querySelector("picture.theme-light-only")!;
    expect(light.querySelector("source")!.getAttribute("media")).toBe("(min-width: 768px)");
    expect(light.querySelector("source")!.getAttribute("srcset")).toBe("/landing/board-1440-light.webp");
    const lightImg = light.querySelector("img")!;
    expect(lightImg.getAttribute("src")).toBe("/landing/pile-a_acheter-light.webp");
    expect(lightImg.getAttribute("loading")).toBeNull();
    expect(lightImg.getAttribute("alt")).toBe(content.screenshotAlt);
    const dark = figure.querySelector("picture.theme-dark-only")!;
    expect(dark.querySelector("source")!.getAttribute("srcset")).toBe("/landing/board-1440-dark.webp");
    expect(dark.querySelector("img")!.getAttribute("src")).toBe("/landing/pile-a_acheter-dark.webp");
    expect(dark.querySelector("img")!.getAttribute("loading")).toBe("lazy");
  });

  it("lists the four piles in STAGES order, amber only on the money piles", () => {
    const { doc } = page(locale);
    const items = [...doc.querySelectorAll("ol > li")];
    expect(items).toHaveLength(4);
    STAGES.forEach((stage, i) => {
      expect(items[i].querySelector("h3")!.textContent).toBe(content.piles[i].name);
      expect(items[i].querySelector("img")!.getAttribute("src")).toContain(`pile-${stage}-light`);
      const amber = items[i].querySelector("svg")!.getAttribute("class")!.includes("amber");
      expect(amber).toBe(stage === "a_acheter" || stage === "revendre");
    });
  });

  it("links the source code and renders every FAQ answer in the markup", () => {
    const { doc, html } = page(locale);
    expect(doc.querySelector(`a[href="${CODE_URL}"]`)).toBeTruthy();
    for (const item of content.faq) {
      expect(doc.body.textContent).toContain(item.answer);
    }
    expect(html).toContain("application/ld+json");
    expect(html).not.toMatch(/text-(ink|forest)\/\d+/);
  });

  it("embeds parseable SoftwareApplication JSON-LD that cannot close its script tag", () => {
    const { doc } = page(locale);
    const script = doc.querySelector('script[type="application/ld+json"]');
    expect(script).toBeTruthy();
    const payload = script!.textContent ?? "";
    const data = JSON.parse(payload);
    expect(data["@type"]).toBe("SoftwareApplication");
    expect(data.name).toBe("My Tsundoku");
    expect(data.offers.price).toBe("0");
    expect(payload).not.toMatch(/<\/script/i);
  });
});

describe("Footer locale override", () => {
  it("renders English on /en regardless of the stored preference", () => {
    const html = renderToStaticMarkup(
      <PreferencesProvider>
        <Footer locale="en" />
      </PreferencesProvider>,
    );
    expect(html).toContain("Made with care by");
    expect(html).toContain("Source code");
    expect(html).toContain(CODE_URL);
  });
});

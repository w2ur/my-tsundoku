import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PrivacyNotice from "./PrivacyNotice";
import { PRIVACY_COPY } from "@/lib/privacy/notice";

function page(locale: "fr" | "en") {
  const html = renderToStaticMarkup(<PrivacyNotice locale={locale} />);
  return { html, doc: new DOMParser().parseFromString(html, "text/html") };
}

describe.each(["fr", "en"] as const)("PrivacyNotice (%s)", (locale) => {
  it("has one h1 and the dated line right under it", () => {
    const { doc } = page(locale);
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    const dated = doc.querySelector("h1 + p");
    expect(dated?.textContent).toBe(PRIVACY_COPY[locale].updated);
  });

  it("does not render the pending captcha section", () => {
    const { doc, html } = page(locale);
    expect(doc.getElementById("captcha")).toBeNull();
    expect(html).not.toContain("Turnstile");
    expect(html).not.toContain("Cloudflare");
  });

  it("opens external links with rel=noopener and leaves mailto links in place", () => {
    const { doc } = page(locale);
    const links = [...doc.querySelectorAll("main a")];
    expect(links.length).toBeGreaterThan(0);
    for (const a of links) {
      const href = a.getAttribute("href")!;
      expect(href).toMatch(/^(https:|mailto:)/);
      if (href.startsWith("https:")) expect(a.getAttribute("rel")).toBe("noopener");
      else expect(a.getAttribute("rel")).toBeNull();
    }
    expect(doc.querySelector('a[href="mailto:privacy@revah.paris"]')).toBeTruthy();
  });

  it("marks the page language and leaves no link markup unrendered", () => {
    const { doc } = page(locale);
    expect(doc.querySelector("[lang]")?.getAttribute("lang")).toBe(locale);
    expect(doc.body.textContent).not.toMatch(/\]\(/);
  });
});

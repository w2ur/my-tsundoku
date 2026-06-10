import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import LandingSection from "./LandingSection";
import { LANDING } from "@/lib/landing";

afterEach(cleanup);

describe("LandingSection", () => {
  it("renders the French hero and all sections", () => {
    const { getByRole, getByText } = render(<LandingSection locale="fr" />);
    expect(getByRole("heading", { level: 1 }).textContent).toBe(LANDING.fr.heroTitle);
    for (const s of LANDING.fr.sections) expect(getByText(s.title)).toBeTruthy();
  });

  it("renders the English content with lang attribute", () => {
    const { container, getByRole } = render(<LandingSection locale="en" />);
    expect(getByRole("heading", { level: 1 }).textContent).toBe(LANDING.en.heroTitle);
    expect(container.querySelector("section")?.getAttribute("lang")).toBe("en");
  });

  it("embeds valid SoftwareApplication JSON-LD", () => {
    const { container } = render(<LandingSection locale="fr" />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeTruthy();
    const data = JSON.parse(script!.textContent ?? "");
    expect(data["@type"]).toBe("SoftwareApplication");
    expect(data.name).toBe("My Tsundoku");
    expect(data.offers.price).toBe("0");
  });

  it("links the CTA to /add", () => {
    const { getByRole } = render(<LandingSection locale="fr" />);
    const cta = getByRole("link", { name: LANDING.fr.ctaLabel });
    expect(cta.getAttribute("href")).toBe("/add");
  });
});

import "fake-indexeddb/auto";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import LandingCta from "./LandingCta";
import { PreferencesProvider, useTranslation } from "@/lib/preferences";
import { db } from "@/lib/db";

vi.mock("next/link", () => ({
  default: ({ href, onClick, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </a>
  ),
}));

beforeEach(async () => {
  await db.settings.clear();
});
afterEach(cleanup);

function Locale() {
  return <output data-testid="locale">{useTranslation().locale}</output>;
}

function setup(locale: "fr" | "en") {
  render(
    <PreferencesProvider>
      <Locale />
      <LandingCta label="Add my first book" locale={locale} />
    </PreferencesProvider>,
  );
}

describe("LandingCta", () => {
  // Regression: "Add my first book" on /en opened the add page in French
  // because the link never set the locale preference.
  it("switches the app to English when followed from /en", async () => {
    setup("en");
    const link = screen.getByRole("link", { name: "Add my first book" });
    expect(link.getAttribute("href")).toBe("/add");
    await userEvent.click(link);
    await waitFor(async () => expect((await db.settings.get("locale"))?.value).toBe("en"));
    expect(screen.getByTestId("locale").textContent).toBe("en");
  });

  it("leaves the locale alone on the French landing", async () => {
    setup("fr");
    await userEvent.click(screen.getByRole("link", { name: "Add my first book" }));
    expect(await db.settings.get("locale")).toBeUndefined();
    expect(screen.getByTestId("locale").textContent).toBe("fr");
  });
});

import "fake-indexeddb/auto";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import EnterAppButton from "./EnterAppButton";
import { PreferencesProvider, useTranslation } from "@/lib/preferences";
import { db } from "@/lib/db";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

beforeEach(async () => {
  await db.settings.clear();
  localStorage.clear();
  push.mockClear();
});
afterEach(cleanup);

function Locale() {
  return <output data-testid="locale">{useTranslation().locale}</output>;
}

function setup(locale: "fr" | "en", navigateHome: boolean) {
  render(
    <PreferencesProvider>
      <Locale />
      <EnterAppButton label="Open the app" locale={locale} navigateHome={navigateHome} />
    </PreferencesProvider>,
  );
}

describe("EnterAppButton", () => {
  // Regression: final-fix wave item 7 (this commit) — "Open the app" on /en
  // landed in the French app because the locale preference was never set.
  it("sets the locale to en before navigating home from /en", async () => {
    setup("en", true);
    await userEvent.click(screen.getByRole("button", { name: "Open the app" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect((await db.settings.get("locale"))?.value).toBe("en");
    expect(screen.getByTestId("locale").textContent).toBe("en");
  });

  it("leaves the locale alone on the French landing", async () => {
    setup("fr", false);
    await userEvent.click(screen.getByRole("button", { name: "Open the app" }));
    await waitFor(async () => expect((await db.settings.get("enteredApp"))?.value).toBe(true));
    expect(await db.settings.get("locale")).toBeUndefined();
    expect(push).not.toHaveBeenCalled();
  });

  it("navigates home from /accueil without switching to English", async () => {
    setup("fr", true);
    await userEvent.click(screen.getByRole("button", { name: "Open the app" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect((await db.settings.get("enteredApp"))?.value).toBe(true);
    expect(await db.settings.get("locale")).toBeUndefined();
  });
});

import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import Footer from "./Footer";
import { PreferencesProvider } from "@/lib/preferences";

vi.stubEnv("NEXT_PUBLIC_APP_VERSION", "1.0.0");

vi.mock("@/lib/db", () => ({
  db: {
    settings: {
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn(),
    },
  },
}));

afterEach(() => {
  cleanup();
});

function renderWithPreferences(ui: React.ReactElement) {
  return render(<PreferencesProvider>{ui}</PreferencesProvider>);
}

describe("Footer", () => {
  it("renders author link", () => {
    renderWithPreferences(<Footer />);
    const link = screen.getByRole("link", { name: /william/i });
    expect(link).toHaveAttribute("href", "https://william.revah.paris");
  });

  it("renders version", () => {
    renderWithPreferences(<Footer />);
    expect(screen.getByText(/v1\.0\.0/)).toBeInTheDocument();
  });

  it("renders contact link with mailto", () => {
    renderWithPreferences(<Footer />);
    const link = screen.getByRole("link", { name: /contact/i });
    expect(link).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:contact@my-tsundoku.app")
    );
  });

  it("links the privacy notice in the stored language", () => {
    renderWithPreferences(<Footer />);
    const link = screen.getByRole("link", { name: "Confidentialité" });
    expect(link).toHaveAttribute("href", "/confidentialite");
  });

  it("links the English notice when the page forces English", () => {
    renderWithPreferences(<Footer locale="en" />);
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/en/privacy");
  });
});

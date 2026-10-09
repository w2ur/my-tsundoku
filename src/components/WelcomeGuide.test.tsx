import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PreferencesProvider } from "@/lib/preferences";

const { mockPut, mockQueryResult } = vi.hoisted(() => ({
  mockPut: vi.fn(),
  mockQueryResult: { current: undefined as undefined | null | { key: string; value: unknown } },
}));

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: () => mockQueryResult.current,
}));

vi.mock("@/lib/db", () => ({
  db: {
    settings: {
      get: vi.fn().mockResolvedValue(undefined),
      put: mockPut,
    },
  },
}));

import WelcomeGuide from "./WelcomeGuide";
import { LANDING } from "@/lib/landing";

afterEach(() => {
  cleanup();
  mockPut.mockClear();
  mockQueryResult.current = undefined;
});

function renderWithPreferences(ui: React.ReactElement) {
  return render(<PreferencesProvider>{ui}</PreferencesProvider>);
}

describe("WelcomeGuide", () => {
  it("renders nothing while loading", () => {
    mockQueryResult.current = undefined;
    const { container } = renderWithPreferences(<WelcomeGuide />);
    expect(container.innerHTML).toBe("");
  });

  it("renders the guide when hasSeenWelcome key does not exist", () => {
    mockQueryResult.current = null;
    renderWithPreferences(<WelcomeGuide />);
    expect(screen.getByText("Votre pile à lire, enfin organisée")).toBeTruthy();
    expect(screen.getByText("C'est parti !")).toBeTruthy();
  });

  // The modal covers the board on a first visit, and the landing pitch sits
  // below the fold behind it: the modal must carry the pitch itself.
  it("carries the landing pitch (free, offline, no account) on the first screen", () => {
    mockQueryResult.current = null;
    renderWithPreferences(<WelcomeGuide />);
    expect(screen.getByRole("heading", { name: LANDING.fr.heroTitle })).toBeTruthy();
    expect(screen.getByText(LANDING.fr.heroSubtitle)).toBeTruthy();
  });

  it("renders nothing when hasSeenWelcome is true", () => {
    mockQueryResult.current = { key: "hasSeenWelcome", value: true };
    const { container } = renderWithPreferences(<WelcomeGuide />);
    expect(container.innerHTML).toBe("");
  });

  it("dismisses the guide when the button is clicked", async () => {
    mockQueryResult.current = null;
    const user = userEvent.setup();
    renderWithPreferences(<WelcomeGuide />);
    await user.click(screen.getByText("C'est parti !"));
    expect(mockPut).toHaveBeenCalledWith({
      key: "hasSeenWelcome",
      value: true,
    });
    expect(screen.queryByText("Votre pile à lire, enfin organisée")).toBeNull();
  });

  it("dismisses the guide when the backdrop is clicked", async () => {
    mockQueryResult.current = null;
    const user = userEvent.setup();
    renderWithPreferences(<WelcomeGuide />);
    const backdrop = document.querySelector(".bg-forest\\/30");
    expect(backdrop).toBeTruthy();
    await user.click(backdrop!);
    expect(mockPut).toHaveBeenCalledWith({
      key: "hasSeenWelcome",
      value: true,
    });
    expect(screen.queryByText("Votre pile à lire, enfin organisée")).toBeNull();
  });
});

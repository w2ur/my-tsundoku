import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PreferencesProvider } from "@/lib/preferences";

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: () => undefined,
}));

vi.mock("@/lib/db", () => ({
  db: {
    settings: {
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn(),
    },
  },
}));

import BookConfirmation from "./BookConfirmation";
import type { Book } from "@/lib/types";

afterEach(cleanup);

function renderWithPreferences(ui: React.ReactElement) {
  return render(<PreferencesProvider>{ui}</PreferencesProvider>);
}

function owned(stage: Book["stage"]): Book {
  return {
    id: "owned-1",
    title: "Jacaranda",
    author: "Gaël Faye",
    coverUrl: "",
    stage,
    position: 0,
    createdAt: Date.UTC(2026, 2, 14),
    updatedAt: Date.UTC(2026, 2, 14),
  };
}

const base = {
  title: "Jacaranda",
  author: "Gaël Faye",
  coverUrl: "",
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe("BookConfirmation duplicate banner", () => {
  it("shows nothing when there is no duplicate", () => {
    renderWithPreferences(<BookConfirmation {...base} />);
    expect(screen.queryByTestId("duplicate-banner")).toBeNull();
  });

  it("names the pile the book already sits in", () => {
    renderWithPreferences(
      <BookConfirmation {...base} duplicate={{ book: owned("bibliotheque"), reason: "isbn" }} />,
    );
    expect(screen.getByTestId("duplicate-banner")).toHaveTextContent(
      /déjà dans votre bibliothèque/i,
    );
  });

  it("offers to move the book when it is in the wishlist", async () => {
    const onMoveExisting = vi.fn();
    renderWithPreferences(
      <BookConfirmation
        {...base}
        duplicate={{ book: owned("a_acheter"), reason: "isbn" }}
        onMoveExisting={onMoveExisting}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /déplacer vers tsundoku/i }));
    expect(onMoveExisting).toHaveBeenCalledWith("owned-1");
  });

  it("does not offer the move for a book already past the wishlist", () => {
    renderWithPreferences(
      <BookConfirmation
        {...base}
        duplicate={{ book: owned("tsundoku"), reason: "isbn" }}
        onMoveExisting={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /déplacer vers tsundoku/i })).toBeNull();
  });

  it("still allows adding anyway", async () => {
    const onConfirm = vi.fn();
    renderWithPreferences(
      <BookConfirmation
        {...base}
        onConfirm={onConfirm}
        duplicate={{ book: owned("bibliotheque"), reason: "isbn" }}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /ajouter quand même/i }));
    expect(onConfirm).toHaveBeenCalled();
  });
});

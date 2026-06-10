import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const { mockBooks } = vi.hoisted(() => ({
  mockBooks: { current: undefined as undefined | object[] },
}));

vi.mock("@/hooks/useBooks", () => ({
  useBooks: () => mockBooks.current,
}));

import LandingGate from "./LandingGate";

afterEach(() => {
  cleanup();
  mockBooks.current = undefined;
});

describe("LandingGate", () => {
  it("renders children while the query is loading (SSR parity)", () => {
    mockBooks.current = undefined;
    render(<LandingGate><p>landing</p></LandingGate>);
    expect(screen.getByText("landing")).toBeTruthy();
  });

  it("renders children when the user has no books", () => {
    mockBooks.current = [];
    render(<LandingGate><p>landing</p></LandingGate>);
    expect(screen.getByText("landing")).toBeTruthy();
  });

  it("renders nothing once the user has at least one book", () => {
    mockBooks.current = [{ id: "1" }];
    const { container } = render(<LandingGate><p>landing</p></LandingGate>);
    expect(container.innerHTML).toBe("");
  });
});

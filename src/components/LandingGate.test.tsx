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

  // showWhen="app" is the complement: the footer must close the document once,
  // after the landing on a first visit and under the board otherwise.
  it("showWhen=app renders nothing while the landing is shown", () => {
    mockBooks.current = undefined;
    const loading = render(<LandingGate showWhen="app"><p>footer</p></LandingGate>);
    expect(loading.container.innerHTML).toBe("");
    cleanup();
    mockBooks.current = [];
    const empty = render(<LandingGate showWhen="app"><p>footer</p></LandingGate>);
    expect(empty.container.innerHTML).toBe("");
  });

  it("showWhen=app renders children once the user has a book", () => {
    mockBooks.current = [{ id: "1" }];
    render(<LandingGate showWhen="app"><p>footer</p></LandingGate>);
    expect(screen.getByText("footer")).toBeTruthy();
  });
});

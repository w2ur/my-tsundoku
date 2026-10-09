"use client";

import { useBooks } from "@/hooks/useBooks";

interface LandingGateProps {
  children: React.ReactNode;
  /**
   * "landing" (default): render while the landing section is shown — no books
   * yet, or still loading. "app": render only once the landing is hidden.
   * The footer uses both so it always closes the document: after the landing
   * on a first visit, at the bottom of the board for a returning user.
   */
  showWhen?: "landing" | "app";
}

export default function LandingGate({ children, showWhen = "landing" }: LandingGateProps) {
  const books = useBooks();
  // Default to visible: `books` is undefined during SSR and while loading,
  // and the landing must be present in the server-rendered HTML for crawlers.
  const landingVisible = !(books && books.length > 0);
  if (landingVisible !== (showWhen === "landing")) return null;
  return <>{children}</>;
}

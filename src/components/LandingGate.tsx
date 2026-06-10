"use client";

import { useBooks } from "@/hooks/useBooks";

export default function LandingGate({ children }: { children: React.ReactNode }) {
  const books = useBooks();
  // Default to visible: `books` is undefined during SSR and while loading,
  // and the landing must be present in the server-rendered HTML for crawlers.
  if (books && books.length > 0) return null;
  return <>{children}</>;
}

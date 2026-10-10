"use client";

import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useBooks } from "@/hooks/useBooks";
import {
  clearEntryHint,
  markEntryHint,
  persistEnteredApp,
  readEnteredApp,
  resolveEntry,
} from "@/lib/entry";

/**
 * Picks the surface the CSS shows (html[data-entry]). Renders nothing: both
 * surfaces are in the server HTML, and the <head> hint script has already set
 * the attribute for returning users before paint.
 */
export default function EntryGate() {
  const books = useBooks();
  const enteredApp = useLiveQuery(readEnteredApp, []);
  const entry = resolveEntry(books, enteredApp);

  useEffect(() => {
    if (entry === "app") {
      markEntryHint();
      if (enteredApp !== true) void persistEnteredApp();
    } else if (entry === "landing") {
      clearEntryHint();
    }
  }, [entry, enteredApp]);

  return null;
}

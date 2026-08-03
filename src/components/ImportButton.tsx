"use client";

import { useState, useRef } from "react";
import { parseBackup } from "@/lib/backup";
import type { RejectedRecord } from "@/lib/book-validation";
import { importBooks } from "@/lib/books";
import { useTranslation } from "@/lib/preferences";
import { plural } from "@/lib/i18n";

export default function ImportButton() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"idle" | "confirm" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [bookCount, setBookCount] = useState(0);
  const [pendingBooks, setPendingBooks] = useState<Parameters<typeof importBooks>[0] | null>(null);
  const [rejected, setRejected] = useState<RejectedRecord[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = parseBackup(reader.result as string);
      setRejected(result.rejected);
      if (result.error) {
        setMessage(result.error);
        setStatus("error");
        return;
      }
      setPendingBooks(result.books);
      setBookCount(result.books.length);
      setStatus("confirm");
    };
    reader.readAsText(file);

    // Reset input
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleImport(mode: "merge" | "replace") {
    if (!pendingBooks) return;
    await importBooks(pendingBooks, mode);
    setMessage(plural(bookCount, t("import_booksImported_one"), t("import_booksImported_other")));
    setStatus("success");
    setPendingBooks(null);
  }

  return (
    <div className="space-y-3">
      {status === "idle" && (
        <label className="block w-full py-3 border border-forest/15 rounded-lg font-medium text-sm text-center text-forest/60 cursor-pointer hover:bg-cream transition-colors">
          {t("import_backup")}
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      )}

      {status === "confirm" && (
        <div className="space-y-3 p-4 bg-surface border border-forest/10 rounded-xl">
          <p className="text-sm text-ink">
            {plural(bookCount, t("import_booksFound_one"), t("import_booksFound_other"))}
          </p>
          {rejected.length > 0 && (
            <div className="rounded-lg border border-amber/40 bg-amber/5 px-3 py-2">
              <p className="text-xs font-medium text-amber">
                {plural(rejected.length, t("import_rejected_one"), t("import_rejected_other"))}
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-forest/60">
                {rejected.slice(0, 5).map((r, i) => (
                  <li key={`${r.label}-${i}`}>
                    {r.label} — {r.reason}
                  </li>
                ))}
              </ul>
              {rejected.length > 5 && (
                <p className="mt-1 text-xs text-forest/40">…</p>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => handleImport("merge")}
              className="flex-1 py-2.5 bg-forest text-paper rounded-lg text-sm font-medium hover:bg-forest/90 transition-colors"
            >
              {t("import_merge")}
            </button>
            <button
              onClick={() => handleImport("replace")}
              className="flex-1 py-2.5 border border-error-border text-error-text rounded-lg text-sm font-medium hover:bg-error-bg transition-colors"
            >
              {t("import_replaceAll")}
            </button>
          </div>
          <button
            onClick={() => { setStatus("idle"); setPendingBooks(null); }}
            className="w-full py-2 text-sm text-forest/40 hover:text-forest/60"
          >
            {t("cancel")}
          </button>
        </div>
      )}

      {status === "success" && (
        <div className="p-3 bg-success-bg border border-success-border rounded-lg text-sm text-success-text text-center">
          {message}
          <button onClick={() => setStatus("idle")} className="block mx-auto mt-2 text-xs underline">
            {t("import_ok")}
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="p-3 bg-error-bg border border-error-border rounded-lg text-sm text-error-text text-center">
          {message}
          {rejected.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs">
              {rejected.slice(0, 5).map((r, i) => (
                <li key={`${r.label}-${i}`}>
                  {r.label} — {r.reason}
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => setStatus("idle")} className="block mx-auto mt-2 text-xs underline">
            {t("import_retry")}
          </button>
        </div>
      )}
    </div>
  );
}

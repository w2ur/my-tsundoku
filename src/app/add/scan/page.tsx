"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import BookConfirmation from "@/components/BookConfirmation";
import { getBookByISBN } from "@/lib/open-library";
import { addBook } from "@/lib/books";
import { isValidISBN } from "@/lib/isbn";
import type { Stage } from "@/lib/types";
import { useTranslation } from "@/lib/preferences";

function ScannerLoading() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center h-48 bg-cream rounded-xl">
      <p className="text-sm text-forest/30">{t("scanner_loading")}</p>
    </div>
  );
}

const BarcodeScanner = dynamic(() => import("@/components/BarcodeScanner"), {
  ssr: false,
  loading: () => <ScannerLoading />,
});

export default function ScanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stage = searchParams.get("stage") || "tsundoku";
  const [status, setStatus] = useState<"idle" | "loading" | "confirm">("idle");
  const [isbn, setIsbn] = useState("");
  const [error, setError] = useState("");
  const [bookData, setBookData] = useState<{ title: string; author: string; coverUrl: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  async function lookup(value: string) {
    const cleaned = value.replace(/[^0-9X]/gi, "").toUpperCase();
    if (cleaned.length !== 10 && cleaned.length !== 13) {
      setError(t("scan_isbnError"));
      return;
    }

    setIsbn(cleaned);
    setError("");
    setStatus("loading");

    try {
      const result = await getBookByISBN(cleaned);
      if (result) {
        setBookData({ title: result.title, author: result.author, coverUrl: result.coverUrl });
        setStatus("confirm");
      } else {
        setError(t("scan_isbnNotFound").replace("{isbn}", cleaned));
        setStatus("idle");
      }
    } catch {
      setError(t("scan_networkError"));
      setStatus("idle");
    }
  }

  function handleScan(scannedIsbn: string) {
    setIsbn(scannedIsbn);
    lookup(scannedIsbn);
  }

  function handleCameraError() {
    setError(t("scanner_unavailable"));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    lookup(isbn);
  }

  async function handleConfirm(extra: { notes?: string; storeUrl?: string; coverUrl?: string }) {
    if (!bookData) return;
    setSaving(true);
    await addBook({ ...bookData, ...extra, isbn, stage: stage as Stage });
    router.push(`/?stage=${stage}`);
  }

  function handleCancel() {
    setBookData(null);
    setStatus("idle");
  }

  const isIdle = status === "idle";
  const isLoading = status === "loading";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 px-4 py-8 max-w-lg mx-auto w-full">
        <h1 className="font-serif text-2xl text-forest mb-6">{t("scan_title")}</h1>

        {status === "confirm" && bookData ? (
          <BookConfirmation
            title={bookData.title}
            author={bookData.author}
            coverUrl={bookData.coverUrl}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            loading={saving}
          />
        ) : (
          <div className="space-y-5">
            {/* Scanner */}
            {isIdle && (
              <BarcodeScanner
                onScan={handleScan}
                onError={handleCameraError}
              />
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-center justify-center h-48 bg-cream rounded-xl">
                <p className="text-sm text-forest/30 animate-pulse">{t("scan_searching")}</p>
              </div>
            )}

            {/* ISBN input */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <label htmlFor="isbn-input" className="block text-sm font-medium text-forest/70">
                {t("scan_isbnLabel")}
              </label>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  id="isbn-input"
                  type="text"
                  inputMode="numeric"
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  placeholder="978..."
                  disabled={isLoading}
                  className="flex-1 px-3 py-2.5 bg-surface border border-forest/15 rounded-lg text-sm text-ink placeholder:text-forest/30 focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/30 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isLoading || !isbn.trim()}
                  className="px-4 py-2.5 bg-forest text-paper rounded-lg text-sm font-medium hover:bg-forest/90 disabled:opacity-50 transition-colors"
                >
                  {t("search")}
                </button>
              </div>

              {/* Inline error */}
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </form>

            {/* Escape hatch */}
            <div className="text-center pt-2">
              <a
                href={isbn && isValidISBN(isbn) ? `/add/manual?stage=${stage}&isbn=${isbn}` : `/add/manual?stage=${stage}`}
                className="text-sm text-forest/40 hover:text-forest/60 transition-colors"
              >
                {t("scan_manualEntry")}
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

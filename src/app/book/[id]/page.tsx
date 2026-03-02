"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import Image from "next/image";
import Header from "@/components/Header";
import StageBadge from "@/components/StageBadge";
import StageActions from "@/components/StageActions";
import DeleteButton from "@/components/DeleteButton";
import BookForm from "@/components/BookForm";
import type { BookFormData } from "@/components/BookForm";
import GeneratedCover from "@/components/GeneratedCover";
import { useBook } from "@/hooks/useBooks";
import { updateBook, markAsReading, unmarkReading, moveBookToPosition } from "@/lib/books";
import { STAGE_TRANSITIONS, STAGE_CONFIG } from "@/lib/constants";
import { useTranslation } from "@/lib/preferences";

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const book = useBook(id);
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [showUnmarkPrompt, setShowUnmarkPrompt] = useState(false);
  const originalCoverRef = useRef<string | null>(null);
  const { t } = useTranslation();

  // Capture the first non-empty coverUrl we see (before any toggle)
  if (book && originalCoverRef.current === null && book.coverUrl) {
    originalCoverRef.current = book.coverUrl;
  }
  const savedOriginal = originalCoverRef.current ?? "";
  // Can toggle if there's a saved original cover (even if current is "")
  const canToggleCover = Boolean(savedOriginal);

  if (book === undefined) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-forest/30 text-sm">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-forest/40 text-sm">{t("book_notFound")}</p>
        </div>
      </div>
    );
  }

  async function handleSave(data: BookFormData) {
    await updateBook(book!.id, data);
    setEditing(false);
  }

  async function handleMarkReading() {
    await markAsReading(book!.id);
  }

  async function handleUnmarkReading() {
    setShowUnmarkPrompt(true);
  }

  async function handleUnmarkConfirm(moveToNext: boolean) {
    const currentBook = book!;
    await unmarkReading(currentBook.id);
    if (moveToNext) {
      const transitions = STAGE_TRANSITIONS[currentBook.stage];
      if (transitions.length > 0) {
        await moveBookToPosition(currentBook.id, transitions[0].next, 0);
        router.push("/");
        return;
      }
    }
    setShowUnmarkPrompt(false);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 px-4 py-8 max-w-lg mx-auto w-full">
        <div className="flex flex-col items-center gap-6">
          {editing ? (
            <>
              <BookForm
                initial={{
                  title: book.title,
                  author: book.author,
                  coverUrl: book.coverUrl,
                  notes: book.notes,
                  storeUrl: book.storeUrl,
                }}
                onSubmit={handleSave}
                submitLabel={t("form_save")}
              />
              <button
                onClick={() => setEditing(false)}
                className="w-full max-w-xs py-2 border border-forest/15 rounded-lg text-xs text-forest/60 hover:bg-cream transition-colors"
              >
                {t("cancel")}
              </button>
            </>
          ) : (
            <>
              <div className="relative w-40 h-60 rounded-xl overflow-hidden shadow-lg bg-cream">
                {book.coverUrl ? (
                  <Image
                    src={book.coverUrl}
                    alt={book.title}
                    fill
                    className="object-cover"
                    sizes="160px"
                    unoptimized
                  />
                ) : (
                  <GeneratedCover title={book.title} author={book.author} width={160} height={240} />
                )}
              </div>

              <div className="text-center">
                <h1 className="font-serif text-2xl font-semibold text-ink">{book.title}</h1>
                {book.author && (
                  <p className="text-base text-forest/50 mt-1">{book.author}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-forest/40 underline hover:text-forest/60 transition-colors"
                >
                  {t("book_edit")}
                </button>
                {canToggleCover && (
                  <button
                    onClick={() => {
                      const next = book.coverUrl ? "" : savedOriginal;
                      updateBook(book.id, { coverUrl: next });
                    }}
                    className="text-xs text-forest/40 underline hover:text-forest/60 transition-colors"
                  >
                    {book.coverUrl ? t("cover_useGenerated") : t("cover_useOriginal")}
                  </button>
                )}
              </div>
            </>
          )}

          <StageBadge stage={book.stage} />

          {/* Reading toggle */}
          {!editing && (
            <div className="w-full max-w-xs">
              {showUnmarkPrompt ? (
                <div className="flex flex-col gap-2 p-4 bg-cream rounded-xl">
                  <p className="text-sm text-forest/70 text-center">
                    {t("book_moveToNextStage").replace(
                      "{stage}",
                      STAGE_TRANSITIONS[book.stage]?.[0]
                        ? t(STAGE_CONFIG[STAGE_TRANSITIONS[book.stage][0].next].labelKey)
                        : ""
                    )}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUnmarkConfirm(true)}
                      className="flex-1 py-2 bg-forest text-paper rounded-lg text-sm font-medium"
                    >
                      {t("book_moveToNextStage_yes")}
                    </button>
                    <button
                      onClick={() => handleUnmarkConfirm(false)}
                      className="flex-1 py-2 border border-forest/15 rounded-lg text-sm text-forest/60"
                    >
                      {t("book_moveToNextStage_no")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={book.isReading ? handleUnmarkReading : handleMarkReading}
                  className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    book.isReading
                      ? "bg-amber/15 text-amber border border-amber/30"
                      : "border border-forest/15 text-forest/50 hover:bg-cream"
                  }`}
                >
                  {book.isReading ? t("book_unmarkReading") : t("book_markReading")}
                </button>
              )}
            </div>
          )}

          {/* Store URL (display mode only) */}
          {!editing && book.storeUrl && (
            <div className="w-full max-w-xs">
              <a
                href={book.storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-forest/40 hover:text-forest/60 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" x2="21" y1="14" y2="3" />
                </svg>
                {t("book_viewStore")}
              </a>
            </div>
          )}

          {/* Notes (display mode only) */}
          {!editing && book.notes && (
            <div className="w-full max-w-xs">
              <div className="bg-cream rounded-xl p-4">
                <p className="text-sm text-forest/70 whitespace-pre-wrap">{book.notes}</p>
              </div>
            </div>
          )}

          <div className="w-full max-w-xs space-y-4 mt-4">
            <StageActions
              bookId={book.id}
              stage={book.stage}
              onMoved={() => router.push("/")}
            />
            <div className="pt-4 border-t border-forest/10">
              <DeleteButton bookId={book.id} onDeleted={() => router.push("/")} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

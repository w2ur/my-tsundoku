"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import BookForm, { type BookFormData } from "@/components/BookForm";
import BookConfirmation from "@/components/BookConfirmation";
import { addBook, getAllBooks, moveBookToPosition } from "@/lib/books";
import { findDuplicate, type DuplicateMatch } from "@/lib/duplicates";
import type { Stage } from "@/lib/types";
import { useTranslation } from "@/lib/preferences";

export default function ManualAddPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stage = searchParams.get("stage") || "tsundoku";
  const isbnParam = searchParams.get("isbn") || undefined;
  const titleParam = searchParams.get("title") || undefined;
  const storeUrlParam = searchParams.get("storeUrl") || undefined;
  const [pending, setPending] = useState<BookFormData | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateMatch | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  // The duplicate check runs when the form is previewed rather than on every
  // keystroke: it reads the whole library, and the preview is the only moment
  // the answer is acted on.
  async function handlePreview(data: BookFormData) {
    setPending(data);
    const library = await getAllBooks();
    setDuplicate(
      findDuplicate({ isbn: data.isbn, title: data.title, author: data.author }, library),
    );
  }

  async function handleConfirm(extra: { notes?: string; storeUrl?: string; coverUrl?: string }) {
    if (!pending) return;
    setLoading(true);
    await addBook({ ...pending, ...extra, stage: stage as Stage });
    router.push(`/?stage=${stage}`);
  }

  async function handleMoveExisting(bookId: string) {
    setLoading(true);
    await moveBookToPosition(bookId, "tsundoku", 0);
    router.push("/?stage=tsundoku");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 px-4 py-8 max-w-lg mx-auto w-full">
        <h1 className="font-serif text-2xl text-forest mb-6">{t("addBook_manualEntry")}</h1>
        {pending ? (
          <BookConfirmation
            title={pending.title}
            author={pending.author}
            coverUrl={pending.coverUrl}
            notes={pending.notes}
            storeUrl={pending.storeUrl}
            duplicate={duplicate}
            onMoveExisting={handleMoveExisting}
            onConfirm={handleConfirm}
            onCancel={() => {
              setPending(null);
              setDuplicate(null);
            }}
            loading={loading}
          />
        ) : (
          <BookForm
            onSubmit={handlePreview}
            submitLabel={t("form_preview")}
            initial={{
              ...(isbnParam && { isbn: isbnParam }),
              ...(titleParam && { title: titleParam }),
              ...(storeUrlParam && { storeUrl: storeUrlParam }),
            }}
          />
        )}
      </main>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import BookForm, { type BookFormData } from "@/components/BookForm";
import BookConfirmation from "@/components/BookConfirmation";
import { addBook } from "@/lib/books";
import type { Stage } from "@/lib/types";
import { useTranslation } from "@/lib/preferences";

export default function ManualAddPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stage = searchParams.get("stage") || "tsundoku";
  const isbnParam = searchParams.get("isbn") || undefined;
  const [pending, setPending] = useState<BookFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  async function handleConfirm(extra: { notes?: string; storeUrl?: string; coverUrl?: string }) {
    if (!pending) return;
    setLoading(true);
    await addBook({ ...pending, ...extra, stage: stage as Stage });
    router.push(`/?stage=${stage}`);
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
            onConfirm={handleConfirm}
            onCancel={() => setPending(null)}
            loading={loading}
          />
        ) : (
          <BookForm onSubmit={setPending} submitLabel={t("form_preview")} initial={isbnParam ? { isbn: isbnParam } : undefined} />
        )}
      </main>
    </div>
  );
}

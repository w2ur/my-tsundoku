"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import GeneratedCover from "@/components/GeneratedCover";
import { useTranslation } from "@/lib/preferences";
import type { DuplicateMatch } from "@/lib/duplicates";

interface Props {
  title: string;
  author: string;
  coverUrl: string;
  notes?: string;
  storeUrl?: string;
  duplicate?: DuplicateMatch | null;
  onMoveExisting?: (bookId: string) => void;
  onConfirm: (extra: { notes?: string; storeUrl?: string; coverUrl?: string }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function BookConfirmation({
  title,
  author,
  coverUrl,
  notes: initialNotes,
  storeUrl: initialStoreUrl,
  duplicate,
  onMoveExisting,
  onConfirm,
  onCancel,
  loading,
}: Props) {
  const { t, locale } = useTranslation();
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [storeUrl, setStoreUrl] = useState(initialStoreUrl ?? "");
  const [useGenerated, setUseGenerated] = useState(!coverUrl);

  const inputClass =
    "w-full px-3 py-2.5 bg-surface border border-border-strong rounded-lg text-sm text-ink placeholder:text-subtle";

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      {duplicate && (
        <div
          data-testid="duplicate-banner"
          className="w-full max-w-xs rounded-lg border border-border-strong bg-amber/10 px-4 py-3 space-y-2"
        >
          <p className="text-sm font-medium text-amber-ink">
            {t(`duplicate_${duplicate.book.stage}`)}
          </p>
          <p className="text-xs text-muted">
            {duplicate.book.title}
            {duplicate.book.author ? ` — ${duplicate.book.author}` : ""}
          </p>
          <p className="text-xs text-subtle">
            {t("duplicate_since").replace(
              "{date}",
              new Date(duplicate.book.createdAt).toLocaleDateString(
                locale === "fr" ? "fr-FR" : "en-GB",
                { day: "numeric", month: "long", year: "numeric" },
              ),
            )}
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href={`/book/${duplicate.book.id}`}
              className="text-xs font-medium text-amber-ink underline"
            >
              {t("duplicate_view")}
            </Link>
            {duplicate.book.stage === "a_acheter" && onMoveExisting && (
              <button
                type="button"
                onClick={() => onMoveExisting(duplicate.book.id)}
                className="text-xs font-medium text-amber-ink underline"
              >
                {t("duplicate_moveToTsundoku")}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="relative w-32 h-48 rounded-xl overflow-hidden shadow-lg bg-cream">
        {!useGenerated && coverUrl ? (
          <Image
            src={coverUrl}
            alt={title}
            fill
            className="object-cover"
            sizes="128px"
            unoptimized={coverUrl.startsWith("data:")}
          />
        ) : (
          <GeneratedCover title={title} author={author} width={128} height={192} />
        )}
      </div>

      {coverUrl && (
        <button
          type="button"
          onClick={() => setUseGenerated((v) => !v)}
          className="text-xs text-subtle underline hover:text-muted transition-colors"
        >
          {useGenerated ? t("cover_useOriginal") : t("cover_useGenerated")}
        </button>
      )}

      <div className="text-center">
        <h2 className="font-serif text-xl font-semibold text-ink">{title}</h2>
        {author && <p className="text-sm text-subtle mt-1">{author}</p>}
      </div>

      <div className="w-full max-w-xs space-y-3">
        <div>
          <label className="block text-sm font-medium text-muted mb-1">
            {t("form_storeUrl")} <span className="font-normal text-subtle">{t("optional")}</span>
          </label>
          <input
            type="url"
            value={storeUrl}
            onChange={(e) => setStoreUrl(e.target.value)}
            placeholder="https://www.amazon.fr/..."
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted mb-1">
            {t("form_notes")} <span className="font-normal text-subtle">{t("optional")}</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("form_notesPlaceholder")}
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </div>
      </div>

      <div className="flex gap-3 w-full max-w-xs">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 border border-border-strong rounded-lg text-sm font-medium text-muted hover:bg-cream transition-colors"
        >
          {t("cancel")}
        </button>
        <button
          onClick={() =>
            onConfirm({
              ...(notes.trim() && { notes: notes.trim() }),
              ...(storeUrl.trim() && { storeUrl: storeUrl.trim() }),
              ...(useGenerated && coverUrl ? { coverUrl: "" } : {}),
            })
          }
          disabled={loading}
          className="flex-1 py-2.5 bg-forest text-paper rounded-lg text-sm font-medium hover:bg-forest/90 disabled:opacity-50 transition-colors"
        >
          {loading ? "..." : duplicate ? t("duplicate_addAnyway") : t("form_add")}
        </button>
      </div>
    </div>
  );
}

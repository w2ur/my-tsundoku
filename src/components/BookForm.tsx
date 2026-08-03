"use client";

import { useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { searchBooks, type OpenLibraryResult } from "@/lib/open-library";
import { searchCommunityBooks, deduplicateResults, type CommunityBook } from "@/lib/community-search";
import { useTranslation } from "@/lib/preferences";
import { useAuth } from "@/lib/auth";
import { resolveCoverUrl } from "@/lib/covers";
import { getAllBooks } from "@/lib/books";
import { findDuplicate } from "@/lib/duplicates";
import type { Book } from "@/lib/types";
import GeneratedCover from "@/components/GeneratedCover";
import CoverCrop from "@/components/CoverCrop";

export interface BookFormData {
  title: string;
  author: string;
  coverUrl: string;
  notes?: string;
  storeUrl?: string;
  isbn?: string;
  olWorkId?: string;
}

interface Props {
  initial?: Partial<BookFormData>;
  onSubmit: (data: BookFormData) => void;
  submitLabel?: string;
  /**
   * Book being edited, if any. Excluded from the "already yours" check so the
   * form does not report the very book you are editing as a duplicate of itself.
   */
  excludeBookId?: string;
}

export default function BookForm({ initial, onSubmit, submitLabel, excludeBookId }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [coverUrl, setCoverUrl] = useState(initial?.coverUrl ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [storeUrl, setStoreUrl] = useState(initial?.storeUrl ?? "");
  const [isbn, setIsbn] = useState<string | undefined>(initial?.isbn);
  const [olWorkId, setOlWorkId] = useState<string | undefined>(initial?.olWorkId);
  const [searchResults, setSearchResults] = useState<OpenLibraryResult[]>([]);
  const [communityResults, setCommunityResults] = useState<CommunityBook[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [library, setLibrary] = useState<Book[]>([]);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleCropComplete(croppedDataUrl: string) {
    setCropSrc(null);
    setCoverUploading(true);
    try {
      const resolved = await resolveCoverUrl(croppedDataUrl, user?.id ?? null, uuidv4());
      setCoverUrl(resolved);
    } finally {
      setCoverUploading(false);
    }
  }

  async function handleSearch() {
    if (!title || title.length < 2) return;
    setSearchLoading(true);
    setHasSearched(true);

    const [olResults, communityRaw] = await Promise.all([
      searchBooks(title, author),
      searchCommunityBooks(title),
    ]);

    const { ol, community } = deduplicateResults(olResults, communityRaw);
    setSearchResults(ol);
    setCommunityResults(community);
    // Read the library once per search rather than once per rendered row.
    const owned = await getAllBooks();
    setLibrary(excludeBookId ? owned.filter((b) => b.id !== excludeBookId) : owned);
    setSearchLoading(false);
  }

  function isAlreadyOwned(result: { isbn?: string | null; title: string; author: string }): boolean {
    return (
      findDuplicate(
        { ...(result.isbn ? { isbn: result.isbn } : {}), title: result.title, author: result.author },
        library,
      ) !== null
    );
  }

  function handleResultSelect(result: OpenLibraryResult) {
    setTitle(result.title);
    setAuthor(result.author);
    if (result.coverUrl) setCoverUrl(result.coverUrl);
    setOlWorkId(result.olWorkId);
    if (result.isbn) setIsbn(result.isbn);
    setSearchResults([]);
    setCommunityResults([]);
    setHasSearched(false);
  }

  function handleCommunitySelect(result: CommunityBook) {
    setTitle(result.title);
    setAuthor(result.author);
    if (result.isbn) setIsbn(result.isbn);
    setOlWorkId(undefined);
    setCoverUrl("");
    setCommunityResults([]);
    setSearchResults([]);
    setHasSearched(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      author: author.trim(),
      coverUrl,
      ...(notes.trim() && { notes: notes.trim() }),
      ...(storeUrl.trim() && { storeUrl: storeUrl.trim() }),
      ...(isbn?.trim() && { isbn: isbn.trim() }),
      ...(olWorkId && { olWorkId }),
    });
  }

  const inputClass =
    "w-full px-3 py-2.5 bg-surface border border-border-strong rounded-lg text-sm text-ink placeholder:text-subtle";

  return (
    <>
      {cropSrc && (
        <CoverCrop
          src={cropSrc}
          onCrop={handleCropComplete}
          onCancel={() => setCropSrc(null)}
        />
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-muted mb-1">{t("form_title")}</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => {
              const val = e.target.value;
              setTitle(val);
              if (val.trim() === "") setOlWorkId(undefined);
              setHasSearched(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder={t("form_titlePlaceholder")}
            className={inputClass}
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searchLoading || title.length < 2}
            className="flex-shrink-0 px-3 py-2.5 bg-forest text-paper rounded-lg text-sm font-medium hover:bg-forest/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {searchLoading ? "..." : t("search")}
          </button>
        </div>
      </div>

      {searchResults.length > 0 && (
        <div className="space-y-1 border border-border-subtle rounded-lg overflow-hidden">
          {searchResults.map((result, i) => (
            <button
              key={`${result.title}-${i}`}
              type="button"
              onClick={() => handleResultSelect(result)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-cream transition-colors border-b border-border-subtle last:border-b-0"
            >
              {result.coverUrl ? (
                <img src={result.coverUrl} alt="" className="w-8 h-12 object-cover rounded flex-shrink-0" />
              ) : (
                <div className="w-8 h-12 rounded overflow-hidden flex-shrink-0">
                  <GeneratedCover title={result.title} author={result.author} width={32} height={48} />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">
                  {result.title}
                  {isAlreadyOwned(result) && (
                    <span className="ml-2 rounded-full bg-amber/10 px-2 py-0.5 text-[11px] font-medium text-amber-ink">
                      {t("duplicate_badge")}
                    </span>
                  )}
                </p>
                <p className="text-xs text-subtle truncate">{result.author}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {hasSearched && !searchLoading && searchResults.length === 0 && (
        <p className="text-xs text-subtle text-center">
          {t("form_noResults")}{" "}
          <a
            href="https://openlibrary.org/books/add"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-muted"
          >
            {t("form_addToOpenLibrary")}
          </a>
        </p>
      )}

      {communityResults.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-1 pt-2">
            <span className="text-xs font-medium text-subtle">{t("community_label")}</span>
            <span className="text-[10px] text-subtle">{t("community_disclaimer")}</span>
          </div>
          <div className="border border-border-subtle rounded-lg overflow-hidden">
            {communityResults.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => handleCommunitySelect(result)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-cream transition-colors border-b border-border-subtle last:border-b-0"
              >
                <div className="w-8 h-12 rounded overflow-hidden flex-shrink-0">
                  <GeneratedCover title={result.title} author={result.author} width={32} height={48} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">
                    {result.title}
                    {isAlreadyOwned(result) && (
                      <span className="ml-2 rounded-full bg-amber/10 px-2 py-0.5 text-[11px] font-medium text-amber-ink">
                        {t("duplicate_badge")}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-subtle truncate">{result.author}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-muted mb-1">{t("form_author")}</label>
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder={t("form_authorPlaceholder")}
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted mb-1">
          {t("form_cover")}
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        {coverUrl ? (
          <div className="flex items-start gap-3">
            <img
              src={coverUrl}
              alt={t("form_coverPreviewAlt")}
              className="w-16 h-24 object-cover rounded-lg shadow-sm border border-border-subtle"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
            <button
              type="button"
              onClick={() => setCoverUrl("")}
              className="text-xs text-subtle underline hover:text-muted mt-1"
            >
              {t("form_coverChange")}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 px-3 py-2.5 border border-border-strong rounded-lg text-subtle hover:bg-cream transition-colors"
              title={t("form_coverChooseImage")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
            </button>
          </div>
        )}
      </div>

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

      <button
        type="submit"
        disabled={!title.trim() || coverUploading}
        className="w-full py-3 bg-forest text-paper rounded-lg font-medium text-sm hover:bg-forest/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {coverUploading ? "..." : (submitLabel ?? t("form_add"))}
      </button>
    </form>
    </>
  );
}

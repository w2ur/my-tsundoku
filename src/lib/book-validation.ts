import { STAGES } from "./constants";
import type { Book, Stage } from "./types";

/**
 * Validates a book record against what the cloud schema will actually accept,
 * repairing the fields that have a safe default and rejecting the rest.
 *
 * The cloud is stricter than Dexie: `books` declares title, author, stage,
 * position, is_reading, created_at and updated_at NOT NULL, and constrains
 * stage with a CHECK. A record that violates any of those is accepted locally
 * and then refused forever with a 400 — the book exists on one device and
 * nowhere else, which is exactly how 344 books went missing. Catching it at the
 * door turns an invisible permanent failure into a message at import time.
 *
 * Invalid dates are the sharpest case: `new Date(undefined).toISOString()`
 * throws, and a throw inside flushQueue is treated as transient, so such a book
 * would be retried on every flush forever without ever being reported.
 */
export type BookValidation =
  | { ok: true; book: Book }
  | { ok: false; reason: string };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Mirrors a NOT NULL text column: present and a string, empty included.
 *
 * Deliberately not isNonEmptyString — BookForm gates only on title, so books
 * with `author: ""` exist and sync fine today (Postgres accepts '' for NOT
 * NULL). Rejecting them here would strand books that currently work, which is
 * the exact failure this validator exists to prevent.
 */
function isRequiredText(value: unknown): value is string {
  return typeof value === "string";
}

/** Accepts a finite epoch-ms timestamp that Date can actually serialize. */
function toTimestamp(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return value;
}

function optionalString(value: unknown): string | undefined {
  return isNonEmptyString(value) ? value : undefined;
}

export function validateBookRecord(raw: unknown): BookValidation {
  if (raw === null || typeof raw !== "object") {
    return { ok: false, reason: "not an object" };
  }

  const r = raw as Record<string, unknown>;

  if (!isNonEmptyString(r.id)) return { ok: false, reason: "missing id" };
  if (!isRequiredText(r.title)) return { ok: false, reason: "missing title" };
  if (!isRequiredText(r.author)) return { ok: false, reason: "missing author" };
  if (!isNonEmptyString(r.stage) || !STAGES.includes(r.stage as Stage)) {
    return { ok: false, reason: `invalid stage "${String(r.stage)}"` };
  }

  const createdAt = toTimestamp(r.createdAt);
  if (createdAt === null) return { ok: false, reason: "invalid createdAt" };
  const updatedAt = toTimestamp(r.updatedAt);
  if (updatedAt === null) return { ok: false, reason: "invalid updatedAt" };

  const book: Book = {
    id: r.id,
    title: r.title,
    author: r.author,
    stage: r.stage as Stage,
    // Defaulted rather than rejected: the cloud columns have defaults, and a
    // missing position is repaired by ensurePositions on import.
    coverUrl: typeof r.coverUrl === "string" ? r.coverUrl : "",
    position: typeof r.position === "number" && Number.isFinite(r.position) ? r.position : 0,
    isReading: r.isReading === true,
    createdAt,
    updatedAt,
  };

  const notes = optionalString(r.notes);
  if (notes) book.notes = notes;
  const storeUrl = optionalString(r.storeUrl);
  if (storeUrl) book.storeUrl = storeUrl;
  const isbn = optionalString(r.isbn);
  if (isbn) book.isbn = isbn;
  const olWorkId = optionalString(r.olWorkId);
  if (olWorkId) book.olWorkId = olWorkId;

  const deletedAt = toTimestamp(r.deletedAt);
  if (deletedAt !== null) book.deletedAt = deletedAt;

  return { ok: true, book };
}

export interface RejectedRecord {
  label: string;
  reason: string;
}

/** Splits a batch into books the cloud will accept and a reportable rejection list. */
export function validateBookRecords(records: unknown[]): {
  books: Book[];
  rejected: RejectedRecord[];
} {
  const books: Book[] = [];
  const rejected: RejectedRecord[] = [];

  records.forEach((record, index) => {
    const result = validateBookRecord(record);
    if (result.ok) {
      books.push(result.book);
      return;
    }
    const title = (record as Record<string, unknown> | null)?.title;
    rejected.push({
      label: isNonEmptyString(title) ? title : `#${index + 1}`,
      reason: result.reason,
    });
  });

  return { books, rejected };
}

import { validateBookRecords, type RejectedRecord } from "./book-validation";
import type { Book } from "./types";

const BACKUP_VERSION = 1;

interface BackupData {
  version: number;
  exportedAt: string;
  books: Book[];
}

export function createBackup(books: Book[]): string {
  const data: BackupData = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    books,
  };
  return JSON.stringify(data, null, 2);
}

export function parseBackup(json: string): {
  books: Book[];
  rejected: RejectedRecord[];
  error?: string;
} {
  try {
    const data = JSON.parse(json);

    if (!data.version || !Array.isArray(data.books)) {
      return { books: [], rejected: [], error: "Format de fichier invalide" };
    }

    // Validated against the cloud schema, not just against Dexie: a record this
    // accepts must be pushable, or it becomes a book stranded on one device.
    const { books, rejected } = validateBookRecords(data.books);

    if (books.length === 0 && data.books.length > 0) {
      return { books: [], rejected, error: "Aucun livre valide trouvé dans le fichier" };
    }

    return { books, rejected };
  } catch {
    return { books: [], rejected: [], error: "Fichier JSON invalide" };
  }
}

export function downloadBackup(books: Book[]) {
  const json = createBackup(books);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().split("T")[0];
  const a = document.createElement("a");
  a.href = url;
  a.download = `tsundoku-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

import { v4 as uuidv4 } from "uuid";
import { db } from "./db";
import type { Book, Stage } from "./types";

export async function addBook(
  data: Pick<Book, "title" | "author" | "coverUrl"> & {
    stage?: Stage;
    notes?: string;
    storeUrl?: string;
    isbn?: string;
    olWorkId?: string;
  }
): Promise<Book> {
  const stage = data.stage ?? "a_acheter";

  // Shift existing books down to make room at position 0
  const existing = await db.books.where("stage").equals(stage).toArray();
  if (existing.length > 0) {
    await Promise.all(
      existing.map((b) => db.books.update(b.id, { position: b.position + 1 }))
    );
  }

  const book: Book = {
    id: uuidv4(),
    title: data.title,
    author: data.author,
    coverUrl: data.coverUrl,
    stage,
    position: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...(data.notes && { notes: data.notes }),
    ...(data.storeUrl && { storeUrl: data.storeUrl }),
    ...(data.isbn && { isbn: data.isbn }),
    ...(data.olWorkId && { olWorkId: data.olWorkId }),
  };
  await db.books.add(book);
  return book;
}

export async function getBook(id: string): Promise<Book | undefined> {
  return db.books.get(id);
}

export async function updateBook(
  id: string,
  data: Partial<Pick<Book, "title" | "author" | "coverUrl" | "stage" | "notes" | "storeUrl" | "isbn" | "isReading" | "olWorkId">>
): Promise<void> {
  await db.books.update(id, { ...data, updatedAt: Date.now() });
}

export async function deleteBook(id: string): Promise<void> {
  await db.books.delete(id);
}

export async function getAllBooks(): Promise<Book[]> {
  return db.books.toArray();
}

export async function exportBooks(): Promise<Book[]> {
  return db.books.toArray();
}

export function ensurePositions(books: Book[]): Book[] {
  const needsAssignment = books.some((b) => b.position == null);
  if (!needsAssignment) return books;

  const byStage: Record<string, Book[]> = {};
  for (const book of books) {
    if (!byStage[book.stage]) byStage[book.stage] = [];
    byStage[book.stage].push(book);
  }

  const result: Book[] = [];
  for (const stageBooks of Object.values(byStage)) {
    stageBooks.sort((a, b) => b.updatedAt - a.updatedAt);
    stageBooks.forEach((book, i) => {
      result.push({ ...book, position: book.position ?? i });
    });
  }
  return result;
}

export async function importBooks(
  books: Book[],
  mode: "merge" | "replace"
): Promise<void> {
  const booksWithPosition = ensurePositions(books);
  if (mode === "replace") {
    await db.books.clear();
  }
  await db.books.bulkPut(booksWithPosition);
}

export function computeReorder(
  orderedIds: string[],
  movedId: string,
  targetIndex: number
): string[] {
  const result = orderedIds.filter((id) => id !== movedId);
  result.splice(targetIndex, 0, movedId);
  return result;
}

export async function moveBookToPosition(
  bookId: string,
  targetStage: Stage,
  targetIndex: number
): Promise<void> {
  const allBooks = await db.books.toArray();
  const book = allBooks.find((b) => b.id === bookId);
  if (!book) return;

  const sourceStage = book.stage;
  const now = Date.now();

  // Get books in target stage sorted by position
  const targetBooks = allBooks
    .filter((b) => b.stage === targetStage)
    .sort((a, b) => a.position - b.position);

  const targetIds = targetBooks.map((b) => b.id);
  const newTargetOrder = computeReorder(targetIds, bookId, targetIndex);

  // Build updates for target column
  const updates: Promise<unknown>[] = [];

  for (let i = 0; i < newTargetOrder.length; i++) {
    const id = newTargetOrder[i];
    if (id === bookId) {
      // The moved book: update stage (if changed) + position + updatedAt
      updates.push(
        db.books.update(id, {
          ...(sourceStage !== targetStage && { stage: targetStage }),
          position: i,
          updatedAt: now,
        })
      );
    } else {
      // Other books: only update if position actually changed
      const existing = targetBooks.find((b) => b.id === id);
      if (existing && existing.position !== i) {
        updates.push(db.books.update(id, { position: i }));
      }
    }
  }

  // If cross-column move, renumber source column
  if (sourceStage !== targetStage) {
    const sourceBooks = allBooks
      .filter((b) => b.stage === sourceStage && b.id !== bookId)
      .sort((a, b) => a.position - b.position);
    for (let i = 0; i < sourceBooks.length; i++) {
      if (sourceBooks[i].position !== i) {
        updates.push(db.books.update(sourceBooks[i].id, { position: i }));
      }
    }
  }

  await Promise.all(updates);
}

export async function markAsReading(bookId: string): Promise<void> {
  const book = await db.books.get(bookId);
  if (!book) return;
  await moveBookToPosition(bookId, book.stage, 0);
  await db.books.update(bookId, { isReading: true, updatedAt: Date.now() });
}

export async function unmarkReading(bookId: string): Promise<void> {
  await db.books.update(bookId, { isReading: false, updatedAt: Date.now() });
}

/** The last place read in each book, kept in localStorage so Home can offer "Riprendi". */

export interface ReadingPosition {
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  /** Unset at the top of the chapter. */
  paragraphId?: string;
}

const STORAGE_KEY = 'politost-last-read';

type Store = Record<string, ReadingPosition>;

function isPosition(value: unknown): value is ReadingPosition {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.chapterId === 'string'
    && typeof v.chapterNumber === 'number'
    && typeof v.chapterTitle === 'string'
    && (v.paragraphId === undefined || typeof v.paragraphId === 'string');
}

function readStore(): Store {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return Object.create(null);
    // No prototype, so a "__proto__" key stays a plain entry.
    const store: Store = Object.create(null);
    for (const [bookId, pos] of Object.entries(parsed)) {
      if (isPosition(pos)) store[bookId] = pos;
    }
    return store;
  } catch {
    return Object.create(null);
  }
}

function writeStore(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage full or disabled: resuming is a convenience, reading still works.
  }
}

export function getReadingPosition(bookId: string): ReadingPosition | undefined {
  return readStore()[bookId];
}

export function saveReadingPosition(bookId: string, position: ReadingPosition): void {
  const store = readStore();
  const prev = store[bookId];
  if (prev && prev.chapterId === position.chapterId && prev.paragraphId === position.paragraphId
    && prev.chapterTitle === position.chapterTitle && prev.chapterNumber === position.chapterNumber) return;
  store[bookId] = position;
  writeStore(store);
}

export function forgetReadingPosition(bookId: string): void {
  const store = readStore();
  if (!(bookId in store)) return;
  delete store[bookId];
  writeStore(store);
}

export function readingPositionPath(bookId: string, position: ReadingPosition): string {
  const base = `/libro/${bookId}/capitolo/${position.chapterId}`;
  return position.paragraphId ? `${base}#${position.paragraphId}` : base;
}

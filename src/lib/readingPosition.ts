/** The last place read in each book, kept in localStorage so Home can offer "Riprendi". */

export interface ReadingPosition {
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  /** Unset at the top of the chapter. */
  paragraphId?: string;
  /** "2.2" and the paragraph title, so Home can name where the reader stopped. */
  paragraphNumber?: string;
  paragraphTitle?: string;
  /** 0-100, see chapterProgress. */
  progress?: number;
  /** When the position last changed (ms since epoch); Home resumes the newest book. */
  readAt?: number;
}

const STORAGE_KEY = 'politost-last-read';

type Store = Record<string, ReadingPosition>;

function isPosition(value: unknown): value is ReadingPosition {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.chapterId === 'string'
    && typeof v.chapterNumber === 'number'
    && typeof v.chapterTitle === 'string'
    && (v.paragraphId === undefined || typeof v.paragraphId === 'string')
    && (v.paragraphNumber === undefined || typeof v.paragraphNumber === 'string')
    && (v.paragraphTitle === undefined || typeof v.paragraphTitle === 'string')
    && (v.progress === undefined || (typeof v.progress === 'number' && v.progress >= 0 && v.progress <= 100))
    && (v.readAt === undefined || typeof v.readAt === 'number');
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

export function saveReadingPosition(bookId: string, position: Omit<ReadingPosition, 'readAt'>, now = Date.now()): void {
  const store = readStore();
  const prev = store[bookId];
  if (prev && prev.chapterId === position.chapterId && prev.paragraphId === position.paragraphId
    && prev.chapterTitle === position.chapterTitle && prev.chapterNumber === position.chapterNumber
    && prev.paragraphTitle === position.paragraphTitle && prev.progress === position.progress) return;
  store[bookId] = { ...position, readAt: now };
  writeStore(store);
}

/** The most recently read of these books. Positions saved before `readAt` existed count as oldest. */
export function lastReadingPosition(bookIds: Iterable<string>): { bookId: string; position: ReadingPosition } | undefined {
  const store = readStore();
  let best: { bookId: string; position: ReadingPosition } | undefined;
  for (const bookId of bookIds) {
    const position = store[bookId];
    if (position && (!best || (position.readAt ?? 0) > (best.position.readAt ?? 0))) best = { bookId, position };
  }
  return best;
}

export function forgetReadingPosition(bookId: string): void {
  const store = readStore();
  if (!(bookId in store)) return;
  delete store[bookId];
  writeStore(store);
}

/** Forgets every book's position, so the next person on a shared browser does not see where the last one stopped. */
export function forgetAllReadingPositions(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage disabled: there is nothing saved to forget.
  }
}

export function readingPositionPath(bookId: string, position: ReadingPosition): string {
  const base = `/libro/${bookId}/capitolo/${position.chapterId}`;
  return position.paragraphId ? `${base}#${position.paragraphId}` : base;
}

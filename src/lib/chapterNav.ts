import type { Chapter } from '../types/smartbook';

/** Replace the shell chapter with the one parsed from fetched markdown. */
export function withLoadedChapter(chapters: Chapter[], loaded: Chapter): Chapter[] {
  let found = false;
  const next = chapters.map((chapter) => {
    if (chapter.meta.id !== loaded.meta.id) return chapter;
    found = true;
    return loaded;
  });
  return found ? next : [...next, loaded];
}

/** Null when the book has no chapter id, so the reader does not navigate to `undefined`. */
export function firstChapterPath(bookId: string, chapters: { id?: string }[]): string | null {
  const id = chapters[0]?.id;
  if (!id) return null;
  return `/libro/${bookId}/capitolo/${id}`;
}

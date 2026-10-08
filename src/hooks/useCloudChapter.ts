import { useEffect, useMemo, useState } from 'react';
import { chapterFromCloudMarkdown, cloudChapterAssets, loadCloudChapterMarkdown } from '../lib/cloudLoader';
import type { Chapter, ChapterMeta } from '../types/smartbook';

interface CloudChapterResult {
  key: string;
  chapter?: Chapter;
  assets?: Record<string, string>;
  error?: string;
}

const NO_ASSETS: Record<string, string> = {};

/**
 * Fetch one chapter of a cloud book. Results are keyed by book and chapter,
 * so switching chapter shows "loading" instead of the previous chapter.
 * Pass `enabled: false` for books bundled in the reader or imported from a file.
 */
export function useCloudChapter(
  enabled: boolean,
  bookId: string | undefined,
  chapterId: string | undefined,
  chapterMeta: ChapterMeta[] | undefined,
) {
  const key = enabled && bookId && chapterId ? `${bookId}/${chapterId}` : null;
  const [result, setResult] = useState<CloudChapterResult | null>(null);
  const current = result && result.key === key ? result : null;

  useEffect(() => {
    if (!key || !bookId || !chapterId || !chapterMeta) return;
    const meta = chapterMeta.find((c) => c.id === chapterId);
    if (!meta) return;
    let cancelled = false;
    loadCloudChapterMarkdown(bookId, chapterId)
      .then((raw) => {
        if (!cancelled) {
          setResult({ key, chapter: chapterFromCloudMarkdown(raw, meta), assets: cloudChapterAssets(bookId) });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setResult({ key, error: err instanceof Error ? err.message : 'Impossibile caricare il capitolo' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [key, bookId, chapterId, chapterMeta]);

  const assets = useMemo(() => current?.assets ?? NO_ASSETS, [current]);

  return {
    loading: Boolean(key) && !current,
    chapter: current?.chapter ?? null,
    error: current?.error ?? null,
    assets,
  };
}

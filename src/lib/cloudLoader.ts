import type { Chapter, ChapterMeta } from '../types/smartbook';
import { fetchCatalog, fetchChapterMarkdown } from './api';
import { catalogAssets, catalogEntryToConfig, catalogPayloads } from './catalogConfig';
import { assetMapFromChapter } from './cloudAssets';
import { parseChapterMarkdown } from './parser';
import { clearCloudBooks, readCloudAssets, registerCloudBook, setCloudBookAssets } from './loader';

let cloudReady: Promise<void> = Promise.resolve();

export function whenCloudBooksReady(): Promise<void> {
  return cloudReady;
}

export async function initCloudBooks(): Promise<void> {
  const job = (async () => {
    clearCloudBooks();
    const { books } = await fetchCatalog();
    for (const entry of books.filter((b) => b.delivery === 'cloud')) {
      const payloads = catalogPayloads(entry);
      registerCloudBook({
        config: catalogEntryToConfig(entry),
        folder: `cloud:${entry.id}`,
        chapterFiles: {},
        eserciziRaw: payloads.eserciziRaw,
        esamiRaw: payloads.esamiRaw,
        ide: payloads.ide,
        grafici: payloads.grafici,
        assets: catalogAssets(entry),
      });
    }
  })();
  cloudReady = job;
  return job;
}

export async function loadCloudChapterMarkdown(bookId: string, chapterId: string): Promise<string> {
  const res = await fetchChapterMarkdown(bookId, chapterId);
  const assets = assetMapFromChapter(bookId, res.markdown, res.assets);
  if (Object.keys(assets).length > 0) setCloudBookAssets(bookId, assets);
  return res.markdown;
}

export function chapterFromCloudMarkdown(raw: string, meta: ChapterMeta): Chapter {
  const parsed = parseChapterMarkdown(raw, meta.number);
  parsed.meta = meta;
  return parsed;
}

export function cloudChapterAssets(bookId: string): Record<string, string> {
  return readCloudAssets(bookId);
}

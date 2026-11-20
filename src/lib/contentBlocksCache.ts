import { parseContentBlocks, type ContentBlock } from './renderContent';

/**
 * Characters of parsed blocks the cache keeps, about 32 MB of strings. KaTeX output is large: the
 * exercises of chimica-di-base parse to 3.7 million characters and the chapters of analisi-1 to
 * 10 million, so this holds the exercises and exams of one book plus several chapters.
 */
export const CONTENT_BLOCKS_CACHE_CHARS = 16_000_000;

const cache = new Map<string, { blocks: ContentBlock[]; chars: number; mathTrusted: boolean }>();
let cachedChars = 0;

/** Length of every string in the blocks: the sanitized HTML, the text and the ids. */
function charsOf(value: unknown): number {
  if (typeof value === 'string') return value.length;
  if (typeof value !== 'object' || value === null) return 0;
  let total = 0;
  for (const item of Object.values(value)) total += charsOf(item);
  return total;
}

/**
 * `parseContentBlocks` with a module-level cache, so going back to Esercizi does not run KaTeX and
 * DOMPurify again. The key is the text and `mathTrusted`: the blocks keep formula ids and image
 * paths as they are written, and ContentFlow resolves them against the book, the variant and the
 * assets when it renders. An entry made with the other `mathTrusted` is a miss and is replaced, so
 * an imported copy of a catalog book never gets the catalog copy's unsanitized formulas. Callers
 * must not change the returned blocks, because every ContentFlow shares them.
 */
export function cachedContentBlocks(content: string, mathTrusted: boolean): ContentBlock[] {
  const hit = cache.get(content);
  if (hit && hit.mathTrusted === mathTrusted) {
    // Move it to the end, so the entries that leave are the ones read longest ago.
    cache.delete(content);
    cache.set(content, hit);
    return hit.blocks;
  }
  if (hit) {
    cache.delete(content);
    cachedChars -= hit.chars;
  }
  const blocks = parseContentBlocks(content, { mathTrusted });
  const chars = content.length + charsOf(blocks);
  // A text larger than the whole cache is not kept, so it cannot push every other entry out.
  if (chars > CONTENT_BLOCKS_CACHE_CHARS) return blocks;
  cache.set(content, { blocks, chars, mathTrusted });
  cachedChars += chars;
  for (const [key, entry] of cache) {
    if (cachedChars <= CONTENT_BLOCKS_CACHE_CHARS) break;
    cache.delete(key);
    cachedChars -= entry.chars;
  }
  return blocks;
}

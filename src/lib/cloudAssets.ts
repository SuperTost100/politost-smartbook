import { getReaderConfig } from '../config/readerConfig';

export function cloudAssetUrl(bookId: string, src: string): string {
  const base = getReaderConfig().apiBaseUrl ?? '';
  const path = src.split('/').map((part) => encodeURIComponent(part)).join('/');
  return `${base}/api/books/${encodeURIComponent(bookId)}/${path}`;
}

/** Builtin and uploaded books stay on `assets`. Cloud books fall back to an API URL. */
export function resolveBookAsset(
  src: string,
  assets: Record<string, string>,
  cloudBookId?: string,
): string | undefined {
  const hit = assets[src];
  if (hit) return hit;
  if (cloudBookId) return cloudAssetUrl(cloudBookId, src);
  return undefined;
}

const ASSET_SRC = /src="(assets\/[^"]+)"/g;

/** Prefer URLs returned with the chapter. Fill any remaining `assets/` refs with an API URL. */
export function assetMapFromChapter(
  bookId: string,
  markdown: string,
  provided?: Record<string, string> | null,
): Record<string, string> {
  const assets: Record<string, string> = {};
  if (provided) {
    for (const [key, value] of Object.entries(provided)) {
      if (typeof value === 'string') assets[key] = value;
    }
  }
  for (const match of markdown.matchAll(ASSET_SRC)) {
    const src = match[1];
    if (src && !assets[src]) assets[src] = cloudAssetUrl(bookId, src);
  }
  return assets;
}

import fontsCssUrl from './fonts.css?url';
import documentCssUrl from './document.css?url';
import pagedCssUrl from './paged.css?url';

const abs = (url: string) => new URL(url, window.location.href).href;

export function getPrintStylesheetUrls(katexCssUrl: string): string[] {
  return [katexCssUrl, fontsCssUrl, documentCssUrl, pagedCssUrl].map(abs);
}

/** Loaded into the iframe head before layout so text is measured with the final fonts. */
export function getPrintFontsUrl(): string {
  return abs(fontsCssUrl);
}

/** Faces to load before Paged.js measures anything. */
export const PRINT_FONT_FACES = [
  '400 11pt "Source Serif 4"',
  'italic 400 11pt "Source Serif 4"',
  '700 11pt "Source Serif 4"',
  '600 11pt Figtree',
  '400 9pt "JetBrains Mono"',
];

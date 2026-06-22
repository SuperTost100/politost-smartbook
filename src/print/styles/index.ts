import documentCssUrl from './document.css?url';
import pagedCssUrl from './paged.css?url';

export function getPrintStylesheetUrls(katexCssUrl: string): string[] {
  return [katexCssUrl, documentCssUrl, pagedCssUrl].map((url) =>
    new URL(url, window.location.href).href,
  );
}

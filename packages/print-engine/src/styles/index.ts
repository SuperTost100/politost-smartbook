/**
 * Print stylesheet URLs for injection into the isolated print iframe.
 * Import order: KaTeX (caller) → tokens → document → paged.
 */
import documentCssUrl from './document.css?url';
import pagedCssUrl from './paged.css?url';

export const PRINT_DOCUMENT_CSS = documentCssUrl;
export const PRINT_PAGED_CSS = pagedCssUrl;

export function getPrintStylesheetUrls(katexCssUrl: string): string[] {
  return [katexCssUrl, documentCssUrl, pagedCssUrl].map((url) =>
    new URL(url, window.location.href).href,
  );
}

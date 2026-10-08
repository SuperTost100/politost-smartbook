import type { ReactNode } from 'react';
import markMono from '../../design-system/logo/ptsb-mark-mono.svg';
import './styles/document.css';

interface PrintDocumentProps {
  bookTitle: string;
  documentTitle: string;
  /** Licensed copies: repeated on every printed page (position: fixed repeats per page). */
  watermarkLabel?: string;
  children: ReactNode;
}

/** CSS string literal; the value only ever lands inside `content: "…"`. */
function cssString(value: string): string {
  return `"${value.replace(/[\\"]/g, '\\$&').replace(/[\r\n]+/g, ' ')}"`;
}

/**
 * Running heads and page numbers go in @page margin boxes, built per document
 * because margin boxes cannot read text from the DOM. Browsers without margin-box
 * support (Firefox today) print the body without them.
 */
function pageRules(bookTitle: string, documentTitle: string): string {
  return `
@page {
  size: A4;
  margin: 20mm 18mm 22mm;
  @top-left { content: ${cssString(bookTitle)}; }
  @top-right { content: ${cssString(documentTitle)}; }
  @bottom-center { content: counter(page) " / " counter(pages); }
}
@page :first {
  @top-left { content: none; }
  @top-right { content: none; }
}`;
}

/** One A4-width sheet: on screen it is the preview, in print it is the document. */
export function PrintDocument({ bookTitle, documentTitle, watermarkLabel, children }: PrintDocumentProps) {
  return (
    <article className="print-sheet" data-theme="light" aria-label={`${bookTitle} — ${documentTitle}`}>
      <style>{pageRules(bookTitle, documentTitle)}</style>
      {watermarkLabel && (
        <div className="print-watermark" aria-hidden>
          {Array.from({ length: 24 }, (_, i) => (
            <span key={i}>{watermarkLabel}</span>
          ))}
        </div>
      )}
      <header className="print-opener">
        <div className="print-opener-brand">
          <img src={markMono} alt="" width={20} height={20} />
          <span>Smartbook</span>
        </div>
        <p className="print-opener-book">{bookTitle}</p>
        <h1 className="print-opener-title">{documentTitle}</h1>
      </header>
      <div className="print-body">{children}</div>
    </article>
  );
}

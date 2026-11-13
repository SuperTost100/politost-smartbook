import { Fragment, type ReactNode } from 'react';
import markMono from '../../design-system/logo/ptsb-mark-mono.svg';
import './styles/document.css';

/** One block of the sheet. The sheet mounts its parts one at a time, so a whole book never blocks the page. */
export interface PrintPart {
  key: string;
  /** Names the part in the "preparing" status, e.g. "capitolo 3". */
  label: string;
  /** Starts on a new printed page. */
  newPage?: boolean;
  /**
   * The whole book only: a named page and the running head on its pages. A null head prints no
   * heads and no page number (the cover). A chapter and its exercises share one page name.
   */
  runningHead?: { page: string; head: string | null };
  /** On screen, lay it out only near the viewport (`content-visibility: auto`). */
  deferLayout?: boolean;
  node: ReactNode;
}

interface PrintDocumentProps {
  bookTitle: string;
  documentTitle: string;
  /** Licensed copies: repeated on every printed page (position: fixed repeats per page). */
  watermarkLabel?: string;
  /** The opener with the book and the document title; the whole book has a cover part instead. */
  opener?: boolean;
  parts: PrintPart[];
  /** Keys of the parts mounted so far (useProgressiveParts). */
  mounted: ReadonlySet<string>;
  /** Text of the "preparing" status, or null when the document is complete. */
  progress: string | null;
}

/** CSS string literal; the value only ever lands inside `content: "…"`. */
function cssString(value: string): string {
  return `"${value.replace(/[\\"]/g, '\\$&').replace(/[\r\n]+/g, ' ')}"`;
}

/** A CSS identifier for a named page. */
function pageName(page: string): string {
  return `p-${page.replace(/[^a-zA-Z0-9-]/g, '-')}`;
}

/**
 * Running heads and page numbers go in @page margin boxes, built per document because margin boxes
 * cannot read text from the DOM. In the whole book each part with a running head gets a named page,
 * so each chapter's pages carry its own title. Browsers without margin-box support (Firefox today)
 * print the body without them.
 */
function pageRules(bookTitle: string, documentTitle: string, parts: PrintPart[]): string {
  let rules = `
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
  const named = new Map<string, string | null>();
  for (const part of parts) {
    if (part.runningHead) named.set(pageName(part.runningHead.page), part.runningHead.head);
  }
  for (const [name, head] of named) {
    rules += head === null
      ? `\n@page ${name} { @top-left { content: none; } @top-right { content: none; } @bottom-center { content: none; } }`
      : `\n@page ${name} { @top-right { content: ${cssString(head)}; } }`;
  }
  return rules;
}

export function PrintBrand() {
  return (
    <div className="print-opener-brand">
      <img src={markMono} alt="" width={20} height={20} />
      <span>Smartbook</span>
    </div>
  );
}

/** One A4-width sheet: on screen it is the preview, in print it is the document. */
export function PrintDocument({ bookTitle, documentTitle, watermarkLabel, opener = true, parts, mounted, progress }: PrintDocumentProps) {
  return (
    <article className="print-sheet" data-theme="light" aria-label={`${bookTitle} · ${documentTitle}`} aria-busy={progress != null}>
      <style>{pageRules(bookTitle, documentTitle, parts)}</style>
      {watermarkLabel && (
        <div className="print-watermark" aria-hidden>
          {Array.from({ length: 24 }, (_, i) => (
            <span key={i}>{watermarkLabel}</span>
          ))}
        </div>
      )}
      {opener && (
        <header className="print-opener">
          <PrintBrand />
          <p className="print-opener-book">{bookTitle}</p>
          <h1 className="print-opener-title">{documentTitle}</h1>
        </header>
      )}
      <div className="print-body">
        {parts.map((part) => {
          if (!mounted.has(part.key)) return null;
          const page = part.runningHead && pageName(part.runningHead.page);
          const className = [
            'print-part',
            part.newPage && 'print-part--page',
            part.deferLayout && 'print-part--deferred',
          ].filter(Boolean).join(' ');
          return (
            <Fragment key={part.key}>
              {part.newPage && (
                <div className="print-break no-print" aria-hidden>
                  <span>Nuova pagina</span>
                </div>
              )}
              <div className={className} style={page ? { page } : undefined}>
                {part.node}
              </div>
            </Fragment>
          );
        })}
        {progress && (
          <p className="print-progress no-print" role="status">
            {progress}
          </p>
        )}
      </div>
    </article>
  );
}

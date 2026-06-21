import type { ReactNode } from 'react';

interface PrintAppProps {
  bookTitle: string;
  sectionTitle: string;
  documentTitle: string;
  children: ReactNode;
}

/**
 * Print shell — metadata for Paged.js string-set running heads,
 * plus a branded document opening block rendered inside the iframe.
 *
 * The brand block uses only text + CSS (no external images) so it
 * renders reliably across all printer drivers and browser sandboxes.
 */
export function PrintApp({
  bookTitle,
  sectionTitle,
  documentTitle,
  children,
}: PrintAppProps) {
  return (
    <div className="print-root">
      {/* Hidden node — Paged.js reads string-set from here */}
      <div
        className="print-meta"
        data-book-title={bookTitle}
        data-section-title={sectionTitle}
        aria-hidden
      />

      <div className="print-flow">
        {/* ── Branded document opener ─────────────────────────── */}
        <header className="print-brand-block">
          {/* Politost wordmark */}
          <div className="print-brand-wordmark" aria-hidden>
            <span className="print-brand-dot" />
            <span className="print-brand-name">Politost</span>
            <span className="print-brand-sub">Smartbook</span>
          </div>

          {/* Accent rule separating brand from content */}
          <hr className="print-brand-rule" />

          {/* Book → Document context */}
          <p className="print-brand-book">{bookTitle}</p>
          <h1 className="print-brand-title">{documentTitle}</h1>
        </header>

        {/* ── Chapter / formulario / exercises body ───────────── */}
        {children}
      </div>
    </div>
  );
}

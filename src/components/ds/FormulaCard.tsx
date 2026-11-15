import { memo } from 'react';
import { Link } from 'react-router-dom';
import type { FormulaRef } from '../../types/smartbook';
import { renderFormulaLatex } from '../../lib/formulaRender';
import { sanitizeHtml } from '../../lib/sanitizeHtml';

interface FormulaCardProps {
  /** The chapter's heading: number and title. Left out where the page title already names the chapter. */
  chapter?: number;
  title?: string;
  /** The chapter's own page in the formula sheet, when the sheet has one. */
  titleHref?: string;
  formulas: FormulaRef[];
  /** Where a formula lives in its chapter. */
  hrefFor: (formula: FormulaRef) => string;
}

/**
 * Numbered formulas with their labels, each row opening the formula in its chapter. The link holds
 * the number and the label and stretches over the row; a formula that scrolls sideways sits above
 * it (useScrollableMath flags it), so it can be scrolled and focused without leaving the page.
 */
export const FormulaCard = memo(function FormulaCard({ chapter, title, titleHref, formulas, hrefFor }: FormulaCardProps) {
  return (
    <section className="sb-fcard">
      {title != null && (
        <header className="sb-fcard-head">
          <span className="sb-eyebrow">Capitolo {chapter}</span>
          <h2>{titleHref ? <Link to={titleHref}>{title}</Link> : title}</h2>
        </header>
      )}
      {formulas.length === 0 ? (
        <p className="sb-fcard-empty">Nessuna formula in questo capitolo.</p>
      ) : (
        formulas.map((f) => (
          <div key={f.id} className="sb-fcard-row" id={`formula-${f.id}`}>
            <Link to={hrefFor(f)} className="sb-fcard-link">
              <span className="sb-fcard-num">({f.id})</span>
              <span className="sb-fcard-label">{f.label}</span>
            </Link>
            <div
              className="sb-fcard-math"
              data-formula-id={f.id}
              data-formula-label={f.label}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderFormulaLatex(f.latex)) }}
            />
          </div>
        ))
      )}
    </section>
  );
});

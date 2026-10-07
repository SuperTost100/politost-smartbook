import { Link } from 'react-router-dom';
import type { FormulaRef } from '../../types/smartbook';
import { renderFormulaLatex } from '../../lib/formulaRender';
import { sanitizeHtml } from '../../lib/sanitizeHtml';

interface FormulaCardProps {
  chapter: number;
  title: string;
  formulas: FormulaRef[];
  /** Where a formula lives in its chapter. */
  hrefFor: (formula: FormulaRef) => string;
}

/** One chapter of the formulario: numbered formulas with their labels, each linking back to the chapter. */
export function FormulaCard({ chapter, title, formulas, hrefFor }: FormulaCardProps) {
  return (
    <section className="sb-fcard">
      <header className="sb-fcard-head">
        <span className="sb-eyebrow">Capitolo {chapter}</span>
        <h2>{title}</h2>
      </header>
      {formulas.length === 0 ? (
        <p className="sb-fcard-empty">Nessuna formula in questo capitolo.</p>
      ) : (
        formulas.map((f) => (
          <Link key={f.id} to={hrefFor(f)} className="sb-fcard-row" id={`formula-${f.id}`}>
            <span className="sb-fcard-num">({f.id})</span>
            <span className="sb-fcard-label">{f.label}</span>
            <div
              className="sb-fcard-math"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderFormulaLatex(f.latex)) }}
            />
          </Link>
        ))
      )}
    </section>
  );
}

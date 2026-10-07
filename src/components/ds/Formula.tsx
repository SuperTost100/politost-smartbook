import type { FormulaRef } from '../../types/smartbook';
import { renderFormulaLatex } from '../../lib/formulaRender';
import { sanitizeHtml } from '../../lib/sanitizeHtml';

/** A numbered display formula: math centred, number chip right, label below. */
export function Formula({ formula }: { formula: FormulaRef }) {
  return (
    <div className="sb-formula" id={`formula-${formula.id}`} data-formula-id={formula.id}>
      <div
        className="sb-formula-math"
        // ponytail: KaTeX output is sanitized; a scroll region keeps wide formulas inside the card.
        tabIndex={0}
        role="group"
        aria-label={`Formula ${formula.id}: ${formula.label}`}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderFormulaLatex(formula.latex)) }}
      />
      <span className="sb-formula-num">({formula.id})</span>
      <div className="sb-formula-label">{formula.label}</div>
    </div>
  );
}

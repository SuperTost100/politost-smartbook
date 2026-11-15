import { useMemo } from 'react';
import type { FormulaRef } from '../../types/smartbook';
import { renderFormulaLatex } from '../../lib/formulaRender';
import { sanitizeHtml } from '../../lib/sanitizeHtml';

/** A numbered display formula: math centred, number chip right, label below. */
export function Formula({ formula }: { formula: FormulaRef }) {
  const html = useMemo(() => sanitizeHtml(renderFormulaLatex(formula.latex)), [formula.latex]);
  return (
    <div className="sb-formula" id={`formula-${formula.id}`} data-formula-id={formula.id}>
      <div
        className="sb-formula-math"
        // KaTeX output is sanitized. A wide formula scrolls in this box, which useScrollableMath then
        // makes a named Tab stop: the number and label give the name.
        data-formula-id={formula.id}
        data-formula-label={formula.label}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <span className="sb-formula-num">({formula.id})</span>
      <div className="sb-formula-label">{formula.label}</div>
    </div>
  );
}

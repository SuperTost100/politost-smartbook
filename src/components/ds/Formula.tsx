import type { FormulaRef } from '../../types/smartbook';
import { formulaHtml } from '../../lib/formulaHtmlCache';
import { useMathTrusted } from '../../context/MathTrustContext';

/**
 * A numbered display formula: math centred, number chip right, label below. `showLabel` false leaves
 * the label out where the text around already names the formula (a box with the same title).
 */
export function Formula({ formula, showLabel = true }: { formula: FormulaRef; showLabel?: boolean }) {
  const html = formulaHtml(formula.latex, useMathTrusted());
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
      {showLabel && <div className="sb-formula-label">{formula.label}</div>}
    </div>
  );
}

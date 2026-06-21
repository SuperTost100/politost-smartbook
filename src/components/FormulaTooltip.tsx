import { useState } from 'react';
import katex from 'katex';
import type { FormulaRef } from '../types/smartbook';
import { sanitizeHtml } from '../lib/sanitizeHtml';

interface FormulaTooltipProps {
  formulaId: string;
  formulas: Map<string, FormulaRef>;
  children?: React.ReactNode;
}

function renderFormulaLatex(latex: string): string {
  const match = latex.match(/\$\$([\s\S]*?)\$\$/);
  if (!match) return latex;
  try {
    return katex.renderToString(match[1].trim(), { displayMode: true, throwOnError: false });
  } catch {
    return match[1];
  }
}

export function FormulaTooltip({ formulaId, formulas, children }: FormulaTooltipProps) {
  const [visible, setVisible] = useState(false);
  const formula = formulas.get(formulaId);

  if (!formula) {
    return <span className="formula-missing">({formulaId})</span>;
  }

  return (
    <span
      className="formula-hover-wrapper"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span className="formula-hover-trigger">{children ?? `(${formulaId})`}</span>
      {visible && (
        <div className="formula-tooltip">
          <div className="formula-tooltip-header">
            <strong>({formula.id})</strong> — {formula.label}
          </div>
          <div
            className="formula-tooltip-body"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderFormulaLatex(formula.latex)) }}
          />
        </div>
      )}
    </span>
  );
}

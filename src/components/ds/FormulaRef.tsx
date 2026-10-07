import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Popover } from 'antd';
import type { FormulaRef as FormulaRefData } from '../../types/smartbook';
import { renderFormulaLatex } from '../../lib/formulaRender';
import { sanitizeHtml } from '../../lib/sanitizeHtml';

interface FormulaRefProps {
  formulaId: string;
  formulas: Map<string, FormulaRefData>;
}

/** Inline reference "(2.1)" that previews the formula on hover, focus or tap. */
export function FormulaRef({ formulaId, formulas }: FormulaRefProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { bookId } = useParams<{ bookId: string }>();
  const formula = formulas.get(formulaId);

  if (!formula) return <span className="formula-missing">({formulaId})</span>;

  const content = (
    <div className="sb-fref-pop">
      <div className="sb-fref-pop-head">
        <b>({formula.id})</b>
        <span>{formula.label}</span>
      </div>
      <div
        className="sb-fref-pop-math"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderFormulaLatex(formula.latex)) }}
      />
      {bookId && (
        <div className="sb-fref-pop-foot">
          <button
            type="button"
            className="sb-btn sb-btn-ghost sb-btn-sm"
            onClick={() => navigate(`/libro/${bookId}/formulario#${formula.id}`)}
          >
            Apri nel formulario
          </button>
        </div>
      )}
    </div>
  );

  return (
    <Popover
      content={content}
      trigger={['hover', 'focus']}
      open={open}
      onOpenChange={setOpen}
      arrow={false}
      placement="bottom"
      rootClassName="sb-fref-popover"
      mouseEnterDelay={0.1}
    >
      <button type="button" className="sb-fref-chip" aria-expanded={open} onClick={() => setOpen(true)}>
        ({formula.id})
      </button>
    </Popover>
  );
}

import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Popover } from 'antd';
import type { FormulaRef as FormulaRefData } from '../../types/smartbook';
import { renderFormulaLatex } from '../../lib/formulaRender';
import { sanitizeHtml } from '../../lib/sanitizeHtml';

interface FormulaRefProps {
  formulaId: string;
  formulas: Map<string, FormulaRefData>;
}

/**
 * Inline reference "(2.1)" that previews the formula on hover, focus or tap.
 * From the keyboard, Enter on the chip moves focus to "Apri nel formulario", and Escape or Tab there returns to the chip.
 */
export function FormulaRef({ formulaId, formulas }: FormulaRefProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { bookId } = useParams<{ bookId: string }>();
  const chipRef = useRef<HTMLButtonElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  // Set while focus moves from the chip into the popup, so the focus trigger's blur does not close it.
  const enteringPopup = useRef(false);
  const formula = formulas.get(formulaId);

  if (!formula) return <span className="formula-missing">({formulaId})</span>;

  const onOpenChange = (next: boolean) => {
    if (!next && (enteringPopup.current || actionRef.current === document.activeElement)) return;
    setOpen(next);
  };

  const onChipClick = () => {
    if (!open || !actionRef.current) {
      setOpen(true);
      return;
    }
    enteringPopup.current = true;
    actionRef.current.focus();
    enteringPopup.current = false;
  };

  const onActionKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'Escape' && e.key !== 'Tab') return;
    e.preventDefault();
    setOpen(false);
    chipRef.current?.focus();
  };

  // Always pass content: antd never opens a popover whose content is empty, so hover and focus did nothing.
  // The popup itself renders only once opened, so KaTeX still runs on demand.
  const content = (
    <FormulaPreview
      formula={formula}
      bookId={bookId}
      actionRef={actionRef}
      onActionKeyDown={onActionKeyDown}
      onActionBlur={(e) => {
        if (e.relatedTarget !== chipRef.current) setOpen(false);
      }}
      onOpen={(href) => navigate(href)}
    />
  );

  return (
    <Popover
      content={content}
      trigger={['hover', 'focus']}
      open={open}
      onOpenChange={onOpenChange}
      arrow={false}
      placement="bottom"
      rootClassName="sb-fref-popover"
      mouseEnterDelay={0.1}
    >
      <button ref={chipRef} type="button" className="sb-fref-chip" aria-expanded={open} onClick={onChipClick}>
        ({formula.id})
      </button>
    </Popover>
  );
}

interface FormulaPreviewProps {
  formula: FormulaRefData;
  bookId?: string;
  actionRef: React.RefObject<HTMLButtonElement | null>;
  onActionKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
  onActionBlur: (e: React.FocusEvent<HTMLButtonElement>) => void;
  onOpen: (href: string) => void;
}

function FormulaPreview({ formula, bookId, actionRef, onActionKeyDown, onActionBlur, onOpen }: FormulaPreviewProps) {
  return (
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
            ref={actionRef}
            type="button"
            className="sb-btn sb-btn-ghost sb-btn-sm"
            // A tap would move focus off the chip, and the focus trigger would close the popover before the click.
            onMouseDown={(e) => e.preventDefault()}
            onKeyDown={onActionKeyDown}
            onBlur={onActionBlur}
            onClick={() => onOpen(`/libro/${bookId}/formulario#${formula.id}`)}
          >
            Apri nel formulario
          </button>
        </div>
      )}
    </div>
  );
}

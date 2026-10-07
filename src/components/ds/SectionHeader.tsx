import type { ReactNode } from 'react';
import { Printer } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  /** Small uppercase line above the title (e.g. "Capitolo 2"). */
  eyebrow?: string;
  /** Reading facts shown under the title. */
  meta?: ReactNode;
  /** Opens the print preview; the button is omitted when missing. */
  onPrint?: () => void;
  /** Extra actions next to the print button. */
  actions?: ReactNode;
}

/** Title block of a page inside the reader: eyebrow, h1, facts and the print action. */
export function SectionHeader({ title, eyebrow, meta, onPrint, actions }: SectionHeaderProps) {
  return (
    <header className="sb-chhead">
      {eyebrow && <span className="sb-eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {(meta || onPrint || actions) && (
        <div className="sb-chhead-meta">
          {meta}
          <div className="sb-chhead-actions no-print">
            {actions}
            {onPrint && (
              <button type="button" className="sb-btn sb-btn-secondary sb-btn-sm" onClick={onPrint}>
                <Printer size={14} strokeWidth={1.75} aria-hidden />
                Versione stampabile
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

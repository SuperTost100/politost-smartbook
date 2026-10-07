import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, LoaderCircle, Play, RotateCcw } from 'lucide-react';

export type RunStatus = 'idle' | 'running' | 'ok' | 'error';

interface CodeCellProps {
  title: string;
  language: string;
  description?: string;
  /** The editor (Monaco). */
  children: ReactNode;
  status: RunStatus;
  output: string;
  runLabel?: string;
  onRun: () => void;
  onReset: () => void;
}

const STATUS = {
  idle: null,
  running: { text: 'In esecuzione', Icon: LoaderCircle },
  ok: { text: 'Completato', Icon: CircleCheck },
  error: { text: 'Errore', Icon: CircleAlert },
} as const;

/** A lab snippet: header with run and reset, editor, and an output panel that states its status in words. */
export function CodeCell({ title, language, description, children, status, output, runLabel, onRun, onReset }: CodeCellProps) {
  const st = STATUS[status];
  const running = status === 'running';
  return (
    <section className="sb-code" aria-label={title}>
      <header className="sb-code-head">
        <h2>{title}</h2>
        <span className="sb-tag sb-tag-outline">{language}</span>
        <div className="sb-code-actions">
          <button type="button" className="sb-btn sb-btn-ghost sb-btn-sm" onClick={onReset} disabled={running}>
            <RotateCcw size={14} strokeWidth={1.75} aria-hidden />
            Ripristina
          </button>
          <button type="button" className="sb-btn sb-btn-primary sb-btn-sm" onClick={onRun} disabled={running}>
            <Play size={14} strokeWidth={1.75} aria-hidden />
            {runLabel ?? 'Esegui'}
          </button>
        </div>
      </header>
      {description && <p className="sb-code-desc">{description}</p>}
      <div className="sb-code-editor">{children}</div>
      <div className={`sb-code-out${status === 'error' ? ' sb-code-out-error' : ''}`} role="status">
        <div className="sb-code-out-head">
          Output
          {st && (
            <span className={`sb-code-status sb-code-status-${status}`}>
              <st.Icon size={14} strokeWidth={1.75} aria-hidden />
              {st.text}
            </span>
          )}
        </div>
        <pre>{output || 'Premi "Esegui" per vedere il risultato.'}</pre>
      </div>
    </section>
  );
}

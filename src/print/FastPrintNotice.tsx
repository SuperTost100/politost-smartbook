import { useId, useMemo, useState } from 'react';
import katex from 'katex';
import { Clock, Zap } from 'lucide-react';
import type { FormulaMode } from '../lib/printFormulaMode';

/** The formula of "Vedi la differenza": short, with a fraction, scripts and letters in both styles. */
const SAMPLE_TEX = String.raw`F_c = m a_c = \frac{m v^2}{R}`;

interface FastPrintNoticeProps {
  mode: FormulaMode;
  onChoose: (mode: FormulaMode) => void;
  /** Draws a formula as fast print does; null until fast print has loaded. */
  mathml: ((tex: string) => string | null) | null;
}

/** The same formula in each mode, on a piece of white paper, as it prints. */
function Samples({ mathml }: { mathml: (tex: string) => string | null }) {
  const best = useMemo(() => katex.renderToString(SAMPLE_TEX, { displayMode: true, output: 'html', throwOnError: false }), []);
  const fast = useMemo(() => mathml(SAMPLE_TEX), [mathml]);
  return (
    <div className="fast-print-samples">
      <figure className="fast-print-sample-figure">
        <div className="fast-print-sample" data-mode="best" dangerouslySetInnerHTML={{ __html: best }} />
        <figcaption>Migliore</figcaption>
      </figure>
      <figure className="fast-print-sample-figure">
        <div className="fast-print-sample" data-mode="fast" dangerouslySetInnerHTML={{ __html: fast ?? '' }} />
        <figcaption>Veloce</figcaption>
      </figure>
    </div>
  );
}

/**
 * The line above the sheet on a device judged slow (docs/Print.md, "Formule"). With fast print on,
 * it says so and offers the book's formulas; after the student went back to them by hand, it offers
 * fast print again.
 */
export function FastPrintNotice({ mode, onChoose, mathml }: FastPrintNoticeProps) {
  const [open, setOpen] = useState(false);
  const samplesId = useId();
  if (mode === 'best') {
    return (
      <section className="fast-print-notice fast-print-notice--quiet no-print" aria-label="Formule">
        <span className="fast-print-notice-icon" aria-hidden>
          <Clock size={18} strokeWidth={1.75} />
        </span>
        <p className="fast-print-notice-title">Formule migliori</p>
        <p className="fast-print-notice-text">Su questo dispositivo la stampa di un libro intero richiede più di un minuto.</p>
        <div className="fast-print-notice-actions">
          <button type="button" className="sb-btn sb-btn-sm" onClick={() => onChoose('fast')}>
            Passa alla stampa veloce
          </button>
        </div>
      </section>
    );
  }
  return (
    <section className="fast-print-notice no-print" aria-label="Stampa veloce">
      <span className="fast-print-notice-icon" aria-hidden>
        <Zap size={18} strokeWidth={1.75} />
      </span>
      <p className="fast-print-notice-title">
        Stampa veloce attiva<small>, scelta per questo dispositivo</small>
      </p>
      <p className="fast-print-notice-text">Il documento è pronto in circa un terzo del tempo. Le formule usano un altro carattere rispetto al libro.</p>
      <div className="fast-print-notice-actions">
        <button type="button" className="sb-btn sb-btn-sm" onClick={() => onChoose('best')}>
          Usa le formule migliori
        </button>
        <button
          type="button"
          className="print-options-link"
          aria-expanded={open}
          aria-controls={samplesId}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Nascondi il confronto' : 'Vedi la differenza'}
        </button>
      </div>
      <div id={samplesId} className="fast-print-notice-samples" hidden={!open}>
        {open && mathml && <Samples mathml={mathml} />}
      </div>
    </section>
  );
}

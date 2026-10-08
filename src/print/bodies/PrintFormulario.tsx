import { useRef } from 'react';
import type { Chapter } from '../../types/smartbook';
import { useWideFormulaCards } from '../../hooks/useWideFormulaCards';
import { renderFormulaLatex } from '../../lib/formulaRender';
import { sanitizeHtml } from '../../lib/sanitizeHtml';

interface PrintFormularioProps {
  chapters: Chapter[];
}

export function PrintFormulario({ chapters }: PrintFormularioProps) {
  const ref = useRef<HTMLDivElement>(null);
  useWideFormulaCards(ref, [chapters]);
  return (
    <div ref={ref}>
      {chapters.map((ch) => (
        <section key={ch.meta.id} className="formulario-chapter" data-print-chapter={ch.meta.id}>
          <h3>
            Capitolo {ch.meta.number} — {ch.meta.title}
          </h3>
          {ch.formulas.length === 0 ? (
            <p className="empty-note">Nessuna formula in questo capitolo.</p>
          ) : (
            <div className="formula-grid">
              {ch.formulas.map((f) => (
                <div key={f.id} className="formulario-card" id={`formula-${f.id}`}>
                  <div className="formulario-card-header">
                    <span className="formula-num">({f.id})</span>
                    <span className="formula-label">{f.label}</span>
                  </div>
                  <div
                    className="formulario-card-body"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(renderFormulaLatex(f.latex)),
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

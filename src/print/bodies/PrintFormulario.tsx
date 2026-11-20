import type { Chapter } from '../../types/smartbook';
import { renderFormulaLatex } from '../../lib/formulaRender';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import { printIds } from '../../lib/printLinks';

interface PrintFormularioProps {
  chapters: Chapter[];
  /** False when the document prints one chapter and its title names it already. */
  headings?: boolean;
}

/** Cards print two to a row; fitWideFormulas lets a wide formula's card span the row. */
export function PrintFormulario({ chapters, headings = true }: PrintFormularioProps) {
  return (
    <div>
      {chapters.map((ch) => (
        <section key={ch.meta.id} className="formulario-chapter" data-print-chapter={ch.meta.id}>
          {headings && (
            <h3>
              Capitolo {ch.meta.number}. {ch.meta.title}
            </h3>
          )}
          {ch.formulas.length === 0 ? (
            <p className="empty-note">Nessuna formula in questo capitolo.</p>
          ) : (
            <div className="formula-grid">
              {ch.formulas.map((f) => (
                <div key={f.id} className="formulario-card" id={printIds.formulaCard(f.id)}>
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

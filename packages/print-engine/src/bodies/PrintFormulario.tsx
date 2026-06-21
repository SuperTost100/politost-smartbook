import type { Chapter } from '@politost/content-core';
import { sanitizeHtml, renderFormulaLatex } from '@politost/content-core';

interface PrintFormularioProps {
  chapters: Chapter[];
}

export function PrintFormulario({ chapters }: PrintFormularioProps) {
  return (
    <>
      {chapters.map((ch) => (
        <section key={ch.meta.id} className="formulario-chapter">
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
    </>
  );
}

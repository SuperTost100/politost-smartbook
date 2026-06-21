import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { Chapter } from '../types/smartbook';
import { renderFormulaLatex } from '../lib/formulaRender';
import { sanitizeHtml } from '../lib/sanitizeHtml';
import { usePrintMode } from '../hooks/usePrintMode';

interface FormularioViewProps {
  bookId: string;
  chapters: Chapter[];
}

export function FormularioView({ bookId, chapters }: FormularioViewProps) {
  const location = useLocation();
  const print = usePrintMode();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      document.getElementById(`formula-${id}`)?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.hash]);

  const byChapter = chapters.map((ch) => ({
    chapter: ch.meta,
    formulas: ch.formulas,
  }));

  return (
    <div className="formulario-view">
      <div className="view-toolbar">
        <h2>Formulario</h2>
        <button
          type="button"
          className="btn-print no-print"
          onClick={() => print({ bookId, section: 'formulario' })}
        >
          Versione stampabile
        </button>
      </div>

      {byChapter.map(({ chapter, formulas }) => (
        <section key={chapter.id} className="formulario-chapter">
          <h3>Capitolo {chapter.number} — {chapter.title}</h3>
          {formulas.length === 0 ? (
            <p className="empty-note">Nessuna formula in questo capitolo.</p>
          ) : (
            <div className="formula-grid">
              {formulas.map((f) => (
                <div key={f.id} className="formulario-card" id={`formula-${f.id}`}>
                  <div className="formulario-card-header">
                    <span className="formula-num">({f.id})</span>
                    <span className="formula-label">{f.label}</span>
                  </div>
                  <div
                    className="formulario-card-body"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderFormulaLatex(f.latex)) }}
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

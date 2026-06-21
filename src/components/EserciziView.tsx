import type { Exercise } from '../types/smartbook';
import { ContentFlow } from './ContentFlow';
import { RevealBlock } from './RevealBlock';
import { preprocessContent } from '../lib/parser';
import { usePrintMode } from '../hooks/usePrintMode';
import type { PrintSection } from '../print/routes';

interface EserciziViewProps {
  bookId: string;
  exercises: Exercise[];
  title: string;
  printSection: PrintSection;
  printable?: boolean;
  resolveAsset?: (src: string) => string | undefined;
}

export function EserciziView({
  bookId,
  exercises,
  title,
  printSection,
  printable = true,
  resolveAsset,
}: EserciziViewProps) {
  const print = usePrintMode();
  return (
    <div className="esercizi-view">
      <div className="view-toolbar">
        <h2>{title}</h2>
        {printable && (
          <button
            type="button"
            className="btn-print no-print"
            onClick={() => print({ bookId, section: printSection })}
          >
            Versione stampabile
          </button>
        )}
      </div>

      {exercises.length === 0 ? (
        <p className="empty-note">Nessun esercizio disponibile.</p>
      ) : (
        <div className="exercise-list">
          {exercises.map((ex) => (
            <article key={ex.id} className="exercise-card" id={`ex-${ex.id}`}>
              <header className="exercise-header">
                <span className="exercise-id">{ex.id}</span>
                {ex.chapter && <span className="exercise-ch">Cap. {ex.chapter}</span>}
                {ex.difficulty && (
                  <span className={`difficulty difficulty-${ex.difficulty}`}>{ex.difficulty}</span>
                )}
              </header>

              <div className="exercise-question content-flow">
                <ContentFlow content={preprocessContent(ex.question)} resolveAsset={resolveAsset} />
              </div>

              <div className="exercise-actions">
                {ex.hint && (
                  <RevealBlock
                    label="Mostra suggerimento"
                    content={preprocessContent(ex.hint)}
                    variant="hint"
                    resolveAsset={resolveAsset}
                  />
                )}

                {ex.solution && (
                  <RevealBlock
                    label="Mostra soluzione"
                    content={preprocessContent(ex.solution)}
                    variant="solution"
                    resolveAsset={resolveAsset}
                  />
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

import type { Exercise, FormulaRef } from '../../types/smartbook';
import { preprocessContent } from '../../lib/parser';
import { ContentFlow } from '../../components/ContentFlow';

interface PrintExercisesProps {
  exercises: Exercise[];
  formulaIndex?: Map<string, FormulaRef>;
  resolveAsset?: (src: string) => string | undefined;
}

function PrintReveal({
  kind,
  label,
  content,
  formulaIndex,
  resolveAsset,
}: {
  kind: 'hint' | 'solution';
  label: string;
  content: string;
  formulaIndex?: Map<string, FormulaRef>;
  resolveAsset?: (src: string) => string | undefined;
}) {
  return (
    <div className={`print-reveal-block print-reveal-block--${kind}`}>
      <div className="print-reveal-header">{label}</div>
      <ContentFlow variant="print" content={content} formulaIndex={formulaIndex} resolveAsset={resolveAsset} />
    </div>
  );
}

export function PrintExercises({ exercises, formulaIndex, resolveAsset }: PrintExercisesProps) {
  if (exercises.length === 0) {
    return <p className="empty-note">Nessun esercizio disponibile.</p>;
  }

  return (
    <div className="exercise-list">
      {exercises.map((ex) => (
        <article key={ex.id} className="exercise-card" id={`ex-${ex.id}`}>
          <header className="exercise-header">
            <span className="exercise-id">{ex.id}</span>
            {ex.chapter != null && <span className="exercise-ch">Cap. {ex.chapter}</span>}
            {ex.difficulty && (
              <span className={`difficulty difficulty-${ex.difficulty}`}>{ex.difficulty}</span>
            )}
          </header>

          <div className="exercise-question">
            <ContentFlow
              variant="print"
              content={preprocessContent(ex.question)}
              formulaIndex={formulaIndex}
              resolveAsset={resolveAsset}
            />
          </div>

          {ex.hint && (
            <PrintReveal
              kind="hint"
              label="Suggerimento"
              content={preprocessContent(ex.hint)}
              formulaIndex={formulaIndex}
              resolveAsset={resolveAsset}
            />
          )}

          {ex.solution && (
            <PrintReveal
              kind="solution"
              label="Soluzione"
              content={preprocessContent(ex.solution)}
              formulaIndex={formulaIndex}
              resolveAsset={resolveAsset}
            />
          )}
        </article>
      ))}
    </div>
  );
}

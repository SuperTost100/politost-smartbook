import type { Exercise } from '@politost/content-core';
import { preprocessContent } from '@politost/content-core';
import { PrintContentFlow } from '../PrintContentFlow';

interface PrintExercisesProps {
  exercises: Exercise[];
  resolveAsset?: (src: string) => string | undefined;
}

function PrintReveal({
  kind,
  label,
  content,
  resolveAsset,
}: {
  kind: 'hint' | 'solution';
  label: string;
  content: string;
  resolveAsset?: (src: string) => string | undefined;
}) {
  return (
    <div className={`print-reveal-block print-reveal-block--${kind}`}>
      <div className="print-reveal-header">{label}</div>
      <PrintContentFlow content={content} resolveAsset={resolveAsset} />
    </div>
  );
}

export function PrintExercises({ exercises, resolveAsset }: PrintExercisesProps) {
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
            <PrintContentFlow
              content={preprocessContent(ex.question)}
              resolveAsset={resolveAsset}
            />
          </div>

          {ex.hint && (
            <PrintReveal
              kind="hint"
              label="Suggerimento"
              content={preprocessContent(ex.hint)}
              resolveAsset={resolveAsset}
            />
          )}

          {ex.solution && (
            <PrintReveal
              kind="solution"
              label="Soluzione"
              content={preprocessContent(ex.solution)}
              resolveAsset={resolveAsset}
            />
          )}
        </article>
      ))}
    </div>
  );
}

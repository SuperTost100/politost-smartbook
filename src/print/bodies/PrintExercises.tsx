import { memo } from 'react';
import type { Exercise, FormulaRef } from '../../types/smartbook';
import { preprocessContent } from '../../lib/parser';
import { ContentFlow } from '../../components/ContentFlow';
import { hrefTo, printIds } from '../../lib/printLinks';

type Heading = 'h2' | 'h3' | 'h4';
const NEXT_HEADING: Record<Heading, Heading> = { h2: 'h3', h3: 'h4', h4: 'h4' };

interface PrintExerciseSectionProps {
  exercises: Exercise[];
  /** "Esercizi del capitolo 3"; unset when the document is the exercises alone. */
  title?: string;
  /** The level of the title, or of "Soluzioni" when there is no title. */
  heading: Heading;
  /** Element ids: `ex-E3.1` for exercises, `esame-X1` for exam questions, so one document never repeats an id. */
  idPrefix: 'ex' | 'esame';
  /** The id the index links to. */
  id?: string;
  /** "Cap. 3" next to the id, where the section mixes chapters. */
  showChapter?: boolean;
  solutions: boolean;
  formulaIndex?: Map<string, FormulaRef>;
  resolveAsset?: (src: string) => string | undefined;
}

/**
 * The questions with their ids, then one "Soluzioni" block with each solution under the same id.
 * Hints are never printed.
 */
export const PrintExerciseSection = memo(function PrintExerciseSection({
  exercises,
  title,
  id,
  heading,
  idPrefix,
  showChapter = false,
  solutions,
  formulaIndex,
  resolveAsset,
}: PrintExerciseSectionProps) {
  const Title = heading;
  const SolutionsTitle = title ? NEXT_HEADING[heading] : heading;
  const withSolution = solutions
    ? exercises.flatMap((ex) => (ex.solution ? [{ id: ex.id, solution: ex.solution }] : []))
    : [];
  const solved = new Set(withSolution.map((ex) => ex.id));

  return (
    <section className="print-exercises" id={id}>
      {title && <Title className="print-exercises-title">{title}</Title>}
      <div className="exercise-list">
        {exercises.map((ex) => (
          <article key={ex.id} className="exercise-card" id={printIds.exercise(idPrefix, ex.id)}>
            <header className="exercise-header">
              {solved.has(ex.id) ? (
                <a className="exercise-id" href={hrefTo(printIds.solution(idPrefix, ex.id))}>
                  {ex.id}
                </a>
              ) : (
                <span className="exercise-id">{ex.id}</span>
              )}
              {showChapter && ex.chapter != null && <span className="exercise-ch">Cap. {ex.chapter}</span>}
              {ex.difficulty && <span className={`difficulty difficulty-${ex.difficulty}`}>{ex.difficulty}</span>}
            </header>
            <div className="exercise-question">
              <ContentFlow
                variant="print"
                content={preprocessContent(ex.question)}
                formulaIndex={formulaIndex}
                resolveAsset={resolveAsset}
              />
            </div>
          </article>
        ))}
      </div>
      {withSolution.length > 0 && (
        <section className="print-solutions">
          <SolutionsTitle className="print-solutions-title">Soluzioni</SolutionsTitle>
          {withSolution.map((ex) => (
            <div key={ex.id} className="print-solution" id={printIds.solution(idPrefix, ex.id)}>
              <a className="print-solution-id" href={hrefTo(printIds.exercise(idPrefix, ex.id))}>
                {ex.id}
              </a>
              <ContentFlow
                variant="print"
                content={preprocessContent(ex.solution)}
                formulaIndex={formulaIndex}
                resolveAsset={resolveAsset}
              />
            </div>
          ))}
        </section>
      )}
    </section>
  );
});

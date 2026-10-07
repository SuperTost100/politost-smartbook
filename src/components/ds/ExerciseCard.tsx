import type { ReactNode } from 'react';
import { DifficultyTag, type Difficulty } from './DifficultyTag';

interface ExerciseCardProps {
  id: string;
  chapter?: number;
  difficulty?: Difficulty;
  /** The question. */
  children: ReactNode;
  /** A RevealBlock with the hint. */
  hint?: ReactNode;
  /** A RevealBlock with the solution. */
  solution?: ReactNode;
}

/** An exercise or exam question with its id, chapter, difficulty, hint and solution. */
export function ExerciseCard({ id, chapter, difficulty, children, hint, solution }: ExerciseCardProps) {
  return (
    <article className="sb-ex" id={`ex-${id}`}>
      <header className="sb-ex-head">
        <span className="sb-ex-id">{id}</span>
        {chapter != null && <span className="sb-ex-ch">cap. {chapter}</span>}
        {difficulty && <DifficultyTag level={difficulty} />}
      </header>
      <div className="sb-ex-q">{children}</div>
      {(hint || solution) && (
        <div className="sb-ex-actions">
          {hint}
          {solution}
        </div>
      )}
    </article>
  );
}

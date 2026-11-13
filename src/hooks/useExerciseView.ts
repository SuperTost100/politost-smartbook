import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ChapterMeta, Exercise } from '../types/smartbook';
import {
  buildExerciseIndex,
  CHAPTER_PARAM,
  DIFFICULTY_PARAM,
  parseDifficulty,
  parseScope,
  type Difficulty,
  type ExerciseIndex,
  type ExerciseScope,
} from '../lib/exerciseNav';

export interface ExerciseView {
  /** Null for exam questions and for books whose exercises have no chapter. */
  index: ExerciseIndex | null;
  /** Null while the URL names no valid chapter. */
  scope: ExerciseScope | null;
  difficulty: Difficulty | null;
}

/** The chapter index and the view the URL asks for; the shell and the page read the same state. */
export function useExerciseView(exercises: Exercise[], chapters: ChapterMeta[], indexed: boolean): ExerciseView {
  const [params] = useSearchParams();
  const index = useMemo(() => (indexed ? buildExerciseIndex(exercises, chapters) : null), [indexed, exercises, chapters]);
  return {
    index,
    scope: parseScope(params.get(CHAPTER_PARAM), index),
    difficulty: parseDifficulty(params.get(DIFFICULTY_PARAM)),
  };
}

import { isSafeNextPath } from '../lib/safeNext';
import { CHAPTER_PARAM, DIFFICULTY_PARAM, type Difficulty, type ExerciseScope } from '../lib/exerciseNav';

export type PrintSection = 'capitolo' | 'formulario' | 'esercizi' | 'esami';

export interface PrintTarget {
  bookId: string;
  section: PrintSection;
  chapterId?: string;
  /** Exercises and exam questions print what the page shows: one chapter (or all) and one difficulty. */
  scope?: ExerciseScope;
  difficulty?: Difficulty;
}

export function buildPrintUrl(
  bookId: string,
  section: PrintSection,
  options?: { chapterId?: string; returnTo?: string; scope?: ExerciseScope; difficulty?: Difficulty },
): string {
  let path: string;
  switch (section) {
    case 'capitolo':
      if (!options?.chapterId) throw new Error('chapterId required for capitolo print');
      path = `/libro/${bookId}/stampa/capitolo/${options.chapterId}`;
      break;
    case 'formulario':
      path = `/libro/${bookId}/stampa/formulario`;
      break;
    case 'esercizi':
      path = `/libro/${bookId}/stampa/esercizi`;
      break;
    case 'esami':
      path = `/libro/${bookId}/stampa/esami`;
      break;
  }

  const params = new URLSearchParams();
  if (options?.scope != null) params.set(CHAPTER_PARAM, String(options.scope));
  if (options?.difficulty) params.set(DIFFICULTY_PARAM, options.difficulty);
  if (options?.returnTo) params.set('return', options.returnTo);
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

export function getReturnUrl(search: string, fallback: string): string {
  const ret = new URLSearchParams(search).get('return');
  return isSafeNextPath(ret) ? ret : fallback;
}

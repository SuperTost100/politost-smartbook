import { isSafeNextPath } from '../lib/safeNext';
import { CHAPTER_PARAM, DIFFICULTY_PARAM, type Difficulty, type ExerciseScope } from '../lib/exerciseNav';
import { PRINT_PARAMS } from '../lib/printOptions';

/** What a print route prints: one chapter, the whole book, the formula sheet, the exercises or the exam questions. */
export type PrintSection = 'capitolo' | 'libro' | 'formulario' | 'esercizi' | 'esami';

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
    case 'libro':
      path = `/libro/${bookId}/stampa/libro`;
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
  if (section === 'libro' && options?.chapterId) params.set(PRINT_PARAMS.from, options.chapterId);
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

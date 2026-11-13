import type { ChapterMeta, Exercise } from '../types/smartbook';

/**
 * The Esercizi section shows one chapter at a time, every exercise, or the ones without a chapter,
 * with an optional difficulty filter. Both live in the URL: `?capitolo=3&difficolta=medio`.
 */

export type Difficulty = NonNullable<Exercise['difficulty']>;
export const DIFFICULTIES: Difficulty[] = ['facile', 'medio', 'difficile'];

export const CHAPTER_PARAM = 'capitolo';
export const DIFFICULTY_PARAM = 'difficolta';

/** An index entry: a chapter number, or `altri` for exercises without a chapter of the book. */
export type EntryScope = number | 'altri';
/** What the page shows: one entry or `tutti`. */
export type ExerciseScope = EntryScope | 'tutti';

export interface ExerciseIndexEntry {
  scope: EntryScope;
  /** Unset for `altri`. */
  number?: number;
  title: string;
  count: number;
}

export interface ExerciseIndex {
  entries: ExerciseIndexEntry[];
  total: number;
  /** How many chapters the book has, for "Capitolo 3 di 17". */
  chapterCount: number;
}

export const OTHER_EXERCISES_TITLE = 'Senza capitolo';

type IndexChapter = Pick<ChapterMeta, 'number' | 'title'>;

/** The index by chapter, or null when no exercise belongs to a chapter of the book (one plain list). */
export function buildExerciseIndex(exercises: Exercise[], chapters: IndexChapter[]): ExerciseIndex | null {
  const known = new Set(chapters.map((c) => c.number));
  const counts = new Map<number, number>();
  let other = 0;
  for (const ex of exercises) {
    if (ex.chapter != null && known.has(ex.chapter)) counts.set(ex.chapter, (counts.get(ex.chapter) ?? 0) + 1);
    else other++;
  }
  if (counts.size === 0) return null;
  const entries: ExerciseIndexEntry[] = chapters.map((c) => ({
    scope: c.number,
    number: c.number,
    title: c.title,
    count: counts.get(c.number) ?? 0,
  }));
  if (other > 0) entries.push({ scope: 'altri', title: OTHER_EXERCISES_TITLE, count: other });
  return { entries, total: exercises.length, chapterCount: chapters.length };
}

/** The index entry an exercise is listed under. */
export function entryScopeOf(exercise: Exercise, index: ExerciseIndex): EntryScope {
  const n = exercise.chapter;
  return n != null && index.entries.some((e) => e.scope === n) ? n : 'altri';
}

export function findEntry(index: ExerciseIndex | null, scope: ExerciseScope | null): ExerciseIndexEntry | undefined {
  return index?.entries.find((e) => e.scope === scope);
}

/** The scope named in the URL, or null when it is missing or names nothing in this book. */
export function parseScope(value: string | null, index: ExerciseIndex | null): ExerciseScope | null {
  if (!index || value == null) return null;
  if (value === 'tutti') return 'tutti';
  const scope: EntryScope | null = value === 'altri' ? 'altri' : /^\d+$/.test(value) ? Number(value) : null;
  return scope != null && findEntry(index, scope) ? scope : null;
}

export function parseDifficulty(value: string | null): Difficulty | null {
  return DIFFICULTIES.find((d) => d === value) ?? null;
}

/** `?capitolo=3&difficolta=medio`, or an empty string when there is nothing to say. */
export function exerciseSearch(scope: ExerciseScope | null, difficulty: Difficulty | null): string {
  const params = new URLSearchParams();
  if (scope != null) params.set(CHAPTER_PARAM, String(scope));
  if (difficulty) params.set(DIFFICULTY_PARAM, difficulty);
  const search = params.toString();
  return search ? `?${search}` : '';
}

/** The exercises in the chosen scope, before the difficulty filter. */
export function exercisesInScope(exercises: Exercise[], index: ExerciseIndex | null, scope: ExerciseScope | null): Exercise[] {
  if (!index || scope == null || scope === 'tutti') return exercises;
  return exercises.filter((ex) => entryScopeOf(ex, index) === scope);
}

export function filterByDifficulty(exercises: Exercise[], difficulty: Difficulty | null): Exercise[] {
  return difficulty ? exercises.filter((ex) => ex.difficulty === difficulty) : exercises;
}

export function difficultyCounts(exercises: Exercise[]): Record<Difficulty, number> {
  const counts: Record<Difficulty, number> = { facile: 0, medio: 0, difficile: 0 };
  for (const ex of exercises) if (ex.difficulty) counts[ex.difficulty]++;
  return counts;
}

/**
 * Where the section opens without a chapter in the URL: the chapter the student was last reading,
 * or the first chapter with exercises when nothing is saved or that chapter has none.
 */
export function defaultScope(index: ExerciseIndex, lastReadChapter?: number): EntryScope {
  const withExercises = index.entries.filter((e) => e.count > 0);
  const last = withExercises.find((e) => e.scope === lastReadChapter);
  return (last ?? withExercises[0]).scope;
}

/** The exercise id a `#ex-<id>` hash points at. A hash that is not one, or cannot be decoded, gives null. */
export function linkedExerciseId(hash: string): string | null {
  if (!hash.startsWith('#ex-')) return null;
  try {
    return decodeURIComponent(hash.slice('#ex-'.length));
  } catch {
    // A broken escape such as "#ex-%" is not a link to any exercise.
    return null;
  }
}

/**
 * The search the page should replace its URL with, or null when the URL is fine as it is.
 * A link to one exercise (`#ex-E3.4`) opens its chapter with the difficulty filter cleared;
 * a URL without a chapter opens the default one.
 */
export function exerciseRedirect(
  view: { index: ExerciseIndex | null; scope: ExerciseScope | null; difficulty: Difficulty | null },
  linked: Exercise | undefined,
  lastReadChapter?: number,
): string | null {
  const { index, scope, difficulty } = view;
  if (linked) {
    const target = index ? entryScopeOf(linked, index) : null;
    return scope !== target || difficulty ? exerciseSearch(target, null) : null;
  }
  if (index && scope == null) return exerciseSearch(defaultScope(index, lastReadChapter), difficulty);
  return null;
}

/** The chapters before and after this one that have exercises; `altri` and `tutti` have none. */
export function neighbourEntries(index: ExerciseIndex, scope: ExerciseScope | null): {
  prev?: ExerciseIndexEntry;
  next?: ExerciseIndexEntry;
} {
  if (typeof scope !== 'number') return {};
  const chapters = index.entries.filter((e) => typeof e.scope === 'number');
  const at = chapters.findIndex((e) => e.scope === scope);
  if (at < 0) return {};
  return {
    prev: chapters.slice(0, at).reverse().find((e) => e.count > 0),
    next: chapters.slice(at + 1).find((e) => e.count > 0),
  };
}

/** "Esercizi · Capitolo 3. Formule · Livello difficile": the print document and its saved PDF. */
export function exerciseDocumentTitle(
  sectionLabel: string,
  entry: ExerciseIndexEntry | undefined,
  difficulty: Difficulty | null,
): string {
  const parts = [sectionLabel];
  if (entry) parts.push(entry.number != null ? `Capitolo ${entry.number}. ${entry.title}` : entry.title);
  if (difficulty) parts.push(`Livello ${difficulty}`);
  return parts.join(' · ');
}

/**
 * The "Esercitati" block at the end of a chapter: its exercises, and after the last chapter the exam
 * questions. A count is zero when its section is off, so the link is left out.
 */
export function practiceCounts(
  chapterNumber: number,
  isLastChapter: boolean,
  book: { esercizi: Exercise[]; esami: Exercise[]; exercisesEnabled: boolean; examsEnabled: boolean },
): { exercises: number; exams: number } {
  return {
    exercises: book.exercisesEnabled ? book.esercizi.filter((ex) => ex.chapter === chapterNumber).length : 0,
    exams: book.examsEnabled && isLastChapter ? book.esami.length : 0,
  };
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

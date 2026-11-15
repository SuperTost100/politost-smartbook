import type { Chapter, ChapterMeta, Exercise, FormulaRef } from '../types/smartbook';

/**
 * The Esercizi and Formulario sections show one chapter at a time or all of it, through the same
 * chapter index. Esercizi adds the exercises without a chapter and a difficulty filter. The view
 * lives in the URL: `?capitolo=3&difficolta=medio`, `?capitolo=tutti` for every exercise and
 * `?capitolo=tutte` for every formula.
 */

export type Difficulty = NonNullable<Exercise['difficulty']>;
export const DIFFICULTIES: Difficulty[] = ['facile', 'medio', 'difficile'];

export const CHAPTER_PARAM = 'capitolo';
export const DIFFICULTY_PARAM = 'difficolta';

/** An index entry: a chapter number, or `altri` for exercises without a chapter of the book. */
export type EntryScope = number | 'altri';
/** The word for "everything" in the URL, which agrees with the section's noun. */
export type AllScope = 'tutti' | 'tutte';
/** What the exercise page shows: one entry or `tutti`. */
export type ExerciseScope = EntryScope | 'tutti';
/** What the formula sheet shows: one chapter or `tutte`. */
export type FormulaScope = EntryScope | 'tutte';
export type IndexScope = EntryScope | AllScope;

export interface ChapterIndexEntry {
  scope: EntryScope;
  /** Unset for `altri`. */
  number?: number;
  title: string;
  count: number;
}

export interface ChapterIndex {
  entries: ChapterIndexEntry[];
  total: number;
  /** How many chapters the book has, for "Capitolo 3 di 17". */
  chapterCount: number;
}

export const OTHER_EXERCISES_TITLE = 'Senza capitolo';

type IndexChapter = Pick<ChapterMeta, 'number' | 'title'>;
/** An exercise or a formula: what the index files under a chapter. */
type IndexItem = { chapter?: number };

/**
 * The index by chapter, or null when fewer than `minChapters` chapters of the book have an item:
 * then the section stays one plain list. Exercises need one chapter, the formula sheet two.
 */
export function buildChapterIndex(items: IndexItem[], chapters: IndexChapter[], minChapters = 1): ChapterIndex | null {
  const known = new Set(chapters.map((c) => c.number));
  const counts = new Map<number, number>();
  let other = 0;
  for (const item of items) {
    if (item.chapter != null && known.has(item.chapter)) counts.set(item.chapter, (counts.get(item.chapter) ?? 0) + 1);
    else other++;
  }
  if (counts.size === 0 || counts.size < minChapters) return null;
  const entries: ChapterIndexEntry[] = chapters.map((c) => ({
    scope: c.number,
    number: c.number,
    title: c.title,
    count: counts.get(c.number) ?? 0,
  }));
  if (other > 0) entries.push({ scope: 'altri', title: OTHER_EXERCISES_TITLE, count: other });
  return { entries, total: items.length, chapterCount: chapters.length };
}

/** A formula sheet gets the index once its formulas fill two chapters; one chapter stays one page. */
export const FORMULA_INDEX_MIN_CHAPTERS = 2;

const formulaCache = new WeakMap<Chapter[], FormulaRef[]>();

/**
 * Every numbered formula of the book, filed under the chapter it is written in. Its id names a
 * chapter too ("3.1"), but a formula moved to another chapter keeps an id that no longer matches.
 * Cached per book, so the shell and the page share one list.
 */
export function bookFormulas(chapters: Chapter[]): FormulaRef[] {
  let list = formulaCache.get(chapters);
  if (!list) {
    list = chapters.flatMap((ch) =>
      ch.formulas.map((f) => (f.chapter === ch.meta.number ? f : { ...f, chapter: ch.meta.number })),
    );
    formulaCache.set(chapters, list);
  }
  return list;
}

/** The index entry an exercise or a formula is listed under. */
export function entryScopeOf(item: IndexItem, index: ChapterIndex): EntryScope {
  const n = item.chapter;
  return n != null && index.entries.some((e) => e.scope === n) ? n : 'altri';
}

function isEntryScope(scope: IndexScope): scope is EntryScope {
  return typeof scope === 'number' || scope === 'altri';
}

export function findEntry(index: ChapterIndex | null, scope: IndexScope | null): ChapterIndexEntry | undefined {
  return index?.entries.find((e) => e.scope === scope);
}

/** The scope named in the URL, or null when it is missing or names nothing in this book. */
export function parseScope<A extends AllScope>(value: string | null, index: ChapterIndex | null, all: A): EntryScope | A | null {
  if (!index || value == null) return null;
  if (value === all) return all;
  const scope: EntryScope | null = value === 'altri' ? 'altri' : /^\d+$/.test(value) ? Number(value) : null;
  return scope != null && findEntry(index, scope) ? scope : null;
}

export function parseDifficulty(value: string | null): Difficulty | null {
  return DIFFICULTIES.find((d) => d === value) ?? null;
}

/** `?capitolo=3&difficolta=medio`, or an empty string when there is nothing to say. */
export function scopeSearch(scope: IndexScope | null, difficulty: Difficulty | null): string {
  const params = new URLSearchParams();
  if (scope != null) params.set(CHAPTER_PARAM, String(scope));
  if (difficulty) params.set(DIFFICULTY_PARAM, difficulty);
  const search = params.toString();
  return search ? `?${search}` : '';
}

/** The exercises or formulas in the chosen scope, before the difficulty filter. */
export function itemsInScope<T extends IndexItem>(items: T[], index: ChapterIndex | null, scope: IndexScope | null): T[] {
  if (!index || scope == null || !isEntryScope(scope)) return items;
  return items.filter((item) => entryScopeOf(item, index) === scope);
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
 * or the first chapter with any when nothing is saved or that chapter has none.
 */
export function defaultScope(index: ChapterIndex, lastReadChapter?: number): EntryScope {
  const withExercises = index.entries.filter((e) => e.count > 0);
  const last = withExercises.find((e) => e.scope === lastReadChapter);
  return (last ?? withExercises[0]).scope;
}

/** How a link names one item of a section: `#ex-E3.4` for an exercise, `#formula-3.1` for a formula. */
export const EXERCISE_HASH = '#ex-';
export const FORMULA_HASH = '#formula-';

/** The id a `#ex-<id>` or `#formula-<id>` hash points at. Another hash, or one that cannot be decoded, gives null. */
export function linkedId(hash: string, prefix: typeof EXERCISE_HASH | typeof FORMULA_HASH): string | null {
  if (!hash.startsWith(prefix)) return null;
  try {
    return decodeURIComponent(hash.slice(prefix.length));
  } catch {
    // A broken escape such as "#ex-%" is not a link to anything.
    return null;
  }
}

/**
 * The search the page should replace its URL with, or null when the URL is fine as it is.
 * A link to one exercise (`#ex-E3.4`) or formula (`#formula-3.1`) opens its chapter with the
 * difficulty filter cleared; a URL without a chapter opens the default one.
 */
export function scopeRedirect(
  view: { index: ChapterIndex | null; scope: IndexScope | null; difficulty: Difficulty | null },
  linked: IndexItem | undefined,
  lastReadChapter?: number,
): string | null {
  const { index, scope, difficulty } = view;
  if (linked) {
    const target = index ? entryScopeOf(linked, index) : null;
    return scope !== target || difficulty ? scopeSearch(target, null) : null;
  }
  if (index && scope == null) return scopeSearch(defaultScope(index, lastReadChapter), difficulty);
  return null;
}

/** The chapters before and after this one that have items; `altri` and the whole section have none. */
export function neighbourEntries(index: ChapterIndex, scope: IndexScope | null): {
  prev?: ChapterIndexEntry;
  next?: ChapterIndexEntry;
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

/** The pager's count for a neighbouring chapter: what its page shows with the difficulty filter on. */
export function pagerNote(
  exercises: Exercise[],
  index: ChapterIndex,
  entry: ChapterIndexEntry,
  difficulty: Difficulty | null,
): string {
  const count = filterByDifficulty(itemsInScope(exercises, index, entry.scope), difficulty).length;
  return count === 0 && difficulty ? `Nessun esercizio ${difficulty}` : plural(count, 'esercizio', 'esercizi');
}

/** "Esercizi · Capitolo 3. Formule · Livello difficile": the print document and its saved PDF. */
export function scopeDocumentTitle(
  sectionLabel: string,
  entry: ChapterIndexEntry | undefined,
  difficulty: Difficulty | null,
): string {
  const parts = [sectionLabel];
  if (entry) parts.push(entry.number != null ? `Capitolo ${entry.number}. ${entry.title}` : entry.title);
  if (difficulty) parts.push(`Livello ${difficulty}`);
  return parts.join(' · ');
}

/**
 * The block at the end of a chapter: its formulas, its exercises, and after the last chapter the
 * exam questions. A count is zero when its section is off, so the link is left out.
 */
export function practiceCounts(
  chapterNumber: number,
  isLastChapter: boolean,
  book: {
    formulas: FormulaRef[];
    esercizi: Exercise[];
    esami: Exercise[];
    formulasEnabled: boolean;
    exercisesEnabled: boolean;
    examsEnabled: boolean;
  },
): { formulas: number; exercises: number; exams: number } {
  return {
    formulas: book.formulasEnabled ? book.formulas.filter((f) => f.chapter === chapterNumber).length : 0,
    exercises: book.exercisesEnabled ? book.esercizi.filter((ex) => ex.chapter === chapterNumber).length : 0,
    exams: book.examsEnabled && isLastChapter ? book.esami.length : 0,
  };
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

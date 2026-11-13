import type { Exercise } from '../types/smartbook';
import { DIFFICULTIES, plural } from './exerciseNav';

/**
 * The options of the print preview. They live in the URL, so a reload, a shared link and
 * "Torna al libro" keep them: `?capitoli=1,3&esercizi=5&formulario=1&esami=1&soluzioni=0`.
 * A missing or unknown value falls back to the default.
 */

export type ExerciseLimit = 'tutti' | 3 | 5 | 10;
export const EXERCISE_LIMITS: ExerciseLimit[] = ['tutti', 3, 5, 10];

export interface PrintOptions {
  /** Chapter numbers the whole book prints, in book order. */
  chapters: number[];
  /** Exercises after each chapter: how many, or null when they are off. */
  exercises: ExerciseLimit | null;
  formulario: boolean;
  exams: boolean;
  solutions: boolean;
}

export const PRINT_PARAMS = {
  chapters: 'capitoli',
  exercises: 'esercizi',
  formulario: 'formulario',
  exams: 'esami',
  solutions: 'soluzioni',
  /** The whole book remembers the chapter it was opened from, for "Questo capitolo". */
  from: 'da',
} as const;

export function defaultPrintOptions(printableChapters: number[]): PrintOptions {
  return { chapters: [...printableChapters], exercises: null, formulario: false, exams: false, solutions: true };
}

function parseFlag(value: string | null, fallback: boolean): boolean {
  if (value === '1') return true;
  if (value === '0') return false;
  return fallback;
}

function parseLimit(value: string | null): ExerciseLimit | null {
  return EXERCISE_LIMITS.find((limit) => String(limit) === value) ?? null;
}

/**
 * Every printable chapter when the parameter is missing, none when it is empty, and the default
 * again when it names no printable chapter at all.
 */
function parseChapters(value: string | null, printable: number[]): number[] {
  if (value == null) return [...printable];
  if (value === '') return [];
  const named = new Set(value.split(',').map((part) => part.trim()).filter((part) => /^\d+$/.test(part)).map(Number));
  const chosen = printable.filter((n) => named.has(n));
  return chosen.length > 0 ? chosen : [...printable];
}

export function parsePrintOptions(params: URLSearchParams, printableChapters: number[]): PrintOptions {
  const defaults = defaultPrintOptions(printableChapters);
  return {
    chapters: parseChapters(params.get(PRINT_PARAMS.chapters), printableChapters),
    exercises: parseLimit(params.get(PRINT_PARAMS.exercises)),
    formulario: parseFlag(params.get(PRINT_PARAMS.formulario), defaults.formulario),
    exams: parseFlag(params.get(PRINT_PARAMS.exams), defaults.exams),
    solutions: parseFlag(params.get(PRINT_PARAMS.solutions), defaults.solutions),
  };
}

/** A copy of `params` with the options written in: default values are left out, other parameters are kept. */
export function writePrintOptions(params: URLSearchParams, options: PrintOptions, printableChapters: number[]): URLSearchParams {
  const next = new URLSearchParams(params);
  const allChapters =
    options.chapters.length === printableChapters.length && printableChapters.every((n) => options.chapters.includes(n));
  const set = (key: string, value: string | null) => (value == null ? next.delete(key) : next.set(key, value));
  set(PRINT_PARAMS.chapters, allChapters ? null : options.chapters.join(','));
  set(PRINT_PARAMS.exercises, options.exercises == null ? null : String(options.exercises));
  set(PRINT_PARAMS.formulario, options.formulario ? '1' : null);
  set(PRINT_PARAMS.exams, options.exams ? '1' : null);
  set(PRINT_PARAMS.solutions, options.solutions ? null : '0');
  return next;
}

const PICK_ORDER: (Exercise['difficulty'] | undefined)[] = [...DIFFICULTIES, undefined];

/**
 * Up to `limit` exercises of one chapter, the same ones every time. The slots go to facile, medio
 * and difficile in turn (then to exercises without a difficulty), each difficulty's picks are
 * spaced evenly through the chapter, and the result is back in book order. A chapter with no more
 * exercises than the limit prints all of them.
 */
export function pickExercises(list: Exercise[], limit: ExerciseLimit): Exercise[] {
  if (limit === 'tutti' || list.length <= limit) return list;
  const groups = PICK_ORDER.map((difficulty) => list.filter((ex) => ex.difficulty === difficulty));
  const want = groups.map(() => 0);
  let taken = 0;
  while (taken < limit) {
    let moved = false;
    for (let i = 0; i < groups.length && taken < limit; i++) {
      if (want[i] < groups[i].length) {
        want[i]++;
        taken++;
        moved = true;
      }
    }
    if (!moved) break;
  }
  const chosen = new Set<Exercise>();
  groups.forEach((group, i) => {
    for (let t = 0; t < want[i]; t++) chosen.add(group[Math.floor(((t + 0.5) * group.length) / want[i])]);
  });
  return list.filter((ex) => chosen.has(ex));
}

export interface BookExercises {
  byChapter: Map<number, Exercise[]>;
  /** Exercises with no chapter, or with a chapter the book does not have: one section after the last chapter. */
  other: Exercise[];
}

/** The book's exercises by chapter number, in book order. */
export function groupExercises(exercises: Exercise[], bookChapters: number[]): BookExercises {
  const known = new Set(bookChapters);
  const byChapter = new Map<number, Exercise[]>();
  const other: Exercise[] = [];
  for (const ex of exercises) {
    if (ex.chapter != null && known.has(ex.chapter)) {
      const list = byChapter.get(ex.chapter);
      if (list) list.push(ex);
      else byChapter.set(ex.chapter, [ex]);
    } else other.push(ex);
  }
  return { byChapter, other };
}

export interface PrintSummaryInput {
  /** "17 capitoli" or "Capitolo 3"; unset when the document has no chapters (the exercise prints). */
  chapters?: string;
  /** Printed exercises, or null when they are off. */
  exercises: number | null;
  formulario: boolean;
  /** Printed exam questions, or null when they are off. */
  exams: number | null;
  solutions: boolean;
}

/** What the document contains, for the panel and the cover: "17 capitoli · 51 esercizi" and "Con le soluzioni". */
export function printSummary(input: PrintSummaryInput): { main: string; sub: string } {
  const parts: string[] = [];
  if (input.chapters) parts.push(input.chapters);
  if (input.exercises != null) parts.push(plural(input.exercises, 'esercizio', 'esercizi'));
  if (input.formulario) parts.push('formulario');
  if (input.exams != null) parts.push(plural(input.exams, "prova d'esame", "prove d'esame"));
  const hasSolutions = input.exercises != null || input.exams != null;
  return {
    main: parts.join(' · '),
    sub: hasSolutions ? (input.solutions ? 'Con le soluzioni' : 'Senza soluzioni') : '',
  };
}

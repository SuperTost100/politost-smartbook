import type { Chapter, Exercise, FormulaRef, SmartbookConfig } from '../types/smartbook';
import { OTHER_EXERCISES_TITLE } from '../lib/exerciseNav';
import { pickExercises, type BookExercises, type ExerciseLimit } from '../lib/printOptions';
import type { PrintPart } from './PrintDocument';
import { PrintCover, PrintIndex } from './bodies/PrintBookFront';
import { PrintChapter } from './bodies/PrintChapter';
import { PrintExerciseSection } from './bodies/PrintExercises';
import { PrintFormulario } from './bodies/PrintFormulario';

export interface PrintContext {
  formulaIndex: Map<string, FormulaRef>;
  resolveAsset: (src: string) => string | undefined;
}

const picks = new WeakMap<Exercise[], Map<ExerciseLimit, Exercise[]>>();

/** pickExercises, with the same array back for the same list and limit, so memoized sections skip re-rendering. */
export function cachedPick(list: Exercise[], limit: ExerciseLimit): Exercise[] {
  let byLimit = picks.get(list);
  if (!byLimit) picks.set(list, (byLimit = new Map()));
  let picked = byLimit.get(limit);
  if (!picked) byLimit.set(limit, (picked = pickExercises(list, limit)));
  return picked;
}

const NO_EXERCISES: Exercise[] = [];

/** What the whole book prints with the current options. */
export interface BookPlan {
  chapters: Chapter[];
  /** Printed exercises by chapter number; null when the option is off. */
  exercises: Map<number, Exercise[]> | null;
  /** Printed exercises without a chapter. */
  other: Exercise[];
  formulario: boolean;
  exams: Exercise[] | null;
}

export function planBook(
  chapters: Chapter[],
  grouped: BookExercises,
  esami: Exercise[],
  options: { chapters: number[]; exercises: ExerciseLimit | null; formulario: boolean; exams: boolean },
): BookPlan {
  const selected = chapters.filter((c) => options.chapters.includes(c.meta.number));
  const limit = options.exercises;
  let exercises: Map<number, Exercise[]> | null = null;
  if (limit != null) {
    exercises = new Map(selected.map((c) => [c.meta.number, cachedPick(grouped.byChapter.get(c.meta.number) ?? NO_EXERCISES, limit)]));
  }
  return {
    chapters: selected,
    exercises,
    other: limit != null && grouped.other.length > 0 ? cachedPick(grouped.other, limit) : NO_EXERCISES,
    formulario: options.formulario,
    exams: options.exams && esami.length > 0 ? esami : null,
  };
}

export function countPlanExercises(plan: BookPlan): number | null {
  if (!plan.exercises) return null;
  let total = plan.other.length;
  for (const list of plan.exercises.values()) total += list.length;
  return total;
}

function chapterHead(chapter: Chapter): string {
  return `Capitolo ${chapter.meta.number}. ${chapter.meta.title}`;
}

const OTHER_TITLE = `Esercizi ${OTHER_EXERCISES_TITLE.toLowerCase()}`;

/**
 * The whole book: cover, index, each chapter on a new page with its exercises after it, then the
 * exercises without a chapter, the formula sheet and the exam questions.
 */
export function bookParts(
  config: SmartbookConfig,
  plan: BookPlan,
  solutions: boolean,
  contents: string,
  ctx: PrintContext,
): PrintPart[] {
  const parts: PrintPart[] = [
    { key: 'copertina', label: 'la copertina', runningHead: { page: 'copertina', head: null }, node: <PrintCover config={config} contents={contents} /> },
    { key: 'indice', label: "l'indice", newPage: true, runningHead: { page: 'indice', head: 'Indice' }, node: <PrintIndex plan={plan} otherTitle={OTHER_TITLE} /> },
  ];
  for (const chapter of plan.chapters) {
    const n = chapter.meta.number;
    const runningHead = { page: `cap-${n}`, head: chapterHead(chapter) };
    parts.push({
      key: `cap-${n}`,
      label: `il capitolo ${n}`,
      newPage: true,
      runningHead,
      deferLayout: true,
      node: (
        <>
          <header className="print-chapter-opener">
            <p className="print-kicker">Capitolo {n}</p>
            <h2 className="print-chapter-title">{chapter.meta.title}</h2>
          </header>
          <PrintChapter chapter={chapter} formulaIndex={ctx.formulaIndex} resolveAsset={ctx.resolveAsset} heading="h3" />
        </>
      ),
    });
    const exercises = plan.exercises?.get(n);
    if (exercises && exercises.length > 0) {
      parts.push({
        key: `esercizi-${n}`,
        label: `gli esercizi del capitolo ${n}`,
        runningHead,
        deferLayout: true,
        node: (
          <PrintExerciseSection
            exercises={exercises}
            title={`Esercizi del capitolo ${n}`}
            heading="h3"
            idPrefix="ex"
            solutions={solutions}
            formulaIndex={ctx.formulaIndex}
            resolveAsset={ctx.resolveAsset}
          />
        ),
      });
    }
  }
  if (plan.other.length > 0) {
    parts.push({
      key: 'esercizi-altri',
      label: 'gli esercizi senza capitolo',
      newPage: true,
      runningHead: { page: 'esercizi-altri', head: OTHER_TITLE },
      deferLayout: true,
      node: (
        <>
          <h2 className="print-h2">{OTHER_TITLE}</h2>
          <PrintExerciseSection
            exercises={plan.other}
            heading="h3"
            idPrefix="ex"
            showChapter
            solutions={solutions}
            formulaIndex={ctx.formulaIndex}
            resolveAsset={ctx.resolveAsset}
          />
        </>
      ),
    });
  }
  if (plan.formulario) {
    parts.push({
      key: 'formulario',
      label: 'il formulario',
      newPage: true,
      runningHead: { page: 'formulario', head: 'Formulario' },
      node: (
        <>
          <h2 className="print-h2">Formulario</h2>
          <PrintFormulario chapters={plan.chapters} />
        </>
      ),
    });
  }
  if (plan.exams) {
    parts.push({
      key: 'esami',
      label: "le prove d'esame",
      newPage: true,
      runningHead: { page: 'esami', head: "Prove d'esame" },
      deferLayout: true,
      node: (
        <>
          <h2 className="print-h2">Prove d'esame</h2>
          <PrintExerciseSection
            exercises={plan.exams}
            heading="h3"
            idPrefix="esame"
            showChapter
            solutions={solutions}
            formulaIndex={ctx.formulaIndex}
            resolveAsset={ctx.resolveAsset}
          />
        </>
      ),
    });
  }
  return parts;
}

/** One chapter, and its exercises when the option is on. */
export function chapterParts(chapter: Chapter, exercises: Exercise[] | null, solutions: boolean, ctx: PrintContext): PrintPart[] {
  const n = chapter.meta.number;
  const parts: PrintPart[] = [
    {
      key: `cap-${n}`,
      label: `il capitolo ${n}`,
      node: <PrintChapter chapter={chapter} formulaIndex={ctx.formulaIndex} resolveAsset={ctx.resolveAsset} />,
    },
  ];
  if (exercises && exercises.length > 0) {
    parts.push({
      key: `esercizi-${n}`,
      label: `gli esercizi del capitolo ${n}`,
      node: (
        <PrintExerciseSection
          exercises={exercises}
          title={`Esercizi del capitolo ${n}`}
          heading="h2"
          idPrefix="ex"
          solutions={solutions}
          formulaIndex={ctx.formulaIndex}
          resolveAsset={ctx.resolveAsset}
        />
      ),
    });
  }
  return parts;
}

export interface ExerciseGroup {
  key: string;
  /** For the "preparing" status: "gli esercizi del capitolo 3". */
  label: string;
  /** "Capitolo 3. Formule"; unset when the print is one chapter or one list. */
  title?: string;
  exercises: Exercise[];
}

/** The separate print of exercises or exam questions: each group's questions, then its solutions. */
export function exerciseParts(
  groups: ExerciseGroup[],
  kind: 'esercizi' | 'esami',
  solutions: boolean,
  ctx: PrintContext,
): PrintPart[] {
  if (groups.every((g) => g.exercises.length === 0)) {
    const empty = kind === 'esercizi' ? 'Nessun esercizio disponibile.' : "Nessuna prova d'esame disponibile.";
    return [{ key: 'vuoto', label: 'il documento', node: <p className="empty-note">{empty}</p> }];
  }
  return groups
    .filter((g) => g.exercises.length > 0)
    .map((g) => ({
      key: g.key,
      label: g.label,
      deferLayout: true,
      node: (
        <PrintExerciseSection
          exercises={g.exercises}
          title={g.title}
          heading="h2"
          idPrefix={kind === 'esercizi' ? 'ex' : 'esame'}
          showChapter={kind === 'esami'}
          solutions={solutions}
          formulaIndex={ctx.formulaIndex}
          resolveAsset={ctx.resolveAsset}
        />
      ),
    }));
}

export function formularioParts(chapters: Chapter[]): PrintPart[] {
  return [{ key: 'formulario', label: 'il formulario', node: <PrintFormulario chapters={chapters} /> }];
}

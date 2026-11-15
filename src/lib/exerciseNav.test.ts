import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Chapter, Exercise, FormulaRef } from '../types/smartbook';
import {
  bookFormulas,
  buildChapterIndex,
  defaultScope,
  difficultyCounts,
  scopeDocumentTitle,
  scopeSearch,
  itemsInScope,
  filterByDifficulty,
  neighbourEntries,
  pagerNote,
  parseDifficulty,
  parseScope,
  practiceCounts,
  scopeRedirect,
  linkedId,
  EXERCISE_HASH,
  FORMULA_HASH,
  FORMULA_INDEX_MIN_CHAPTERS,
} from './exerciseNav.ts';
import { buildPrintUrl } from '../print/routes.ts';

const chapters = [
  { number: 1, title: 'Uno' },
  { number: 2, title: 'Due' },
  { number: 3, title: 'Tre' },
  { number: 4, title: 'Quattro' },
];

function ex(id: string, chapter?: number, difficulty?: Exercise['difficulty']): Exercise {
  return { id, chapter, difficulty, type: 'esercizio', question: id };
}

const exercises = [
  ex('E1.1', 1, 'facile'),
  ex('E1.2', 1, 'difficile'),
  ex('E3.1', 3, 'medio'),
  ex('E4.1', 4, 'facile'),
  ex('X', undefined, 'medio'),
  ex('E9.1', 9),
];

test('the index counts each chapter and puts exercises without a known chapter last', () => {
  const index = buildChapterIndex(exercises, chapters)!;
  assert.equal(index.total, 6);
  assert.equal(index.chapterCount, 4);
  assert.deepEqual(index.entries.map((e) => [e.scope, e.count]), [[1, 2], [2, 0], [3, 1], [4, 1], ['altri', 2]]);
});

test('a book where no exercise has a chapter gets no index', () => {
  assert.equal(buildChapterIndex([ex('A'), ex('B', 7)], chapters), null);
  assert.equal(buildChapterIndex([], chapters), null);
});

test('without exercises outside the chapters there is no "altri" entry', () => {
  const index = buildChapterIndex([ex('E1.1', 1)], chapters)!;
  assert.equal(index.entries.at(-1)?.scope, 4);
});

test('parseScope accepts chapters of the index, tutti and altri only', () => {
  const index = buildChapterIndex(exercises, chapters);
  assert.equal(parseScope('3', index, 'tutti'), 3);
  assert.equal(parseScope('2', index, 'tutti'), 2);
  assert.equal(parseScope('tutti', index, 'tutti'), 'tutti');
  assert.equal(parseScope('altri', index, 'tutti'), 'altri');
  for (const value of ['9', '03x', '', null, 'Tutti', 'tutte']) assert.equal(parseScope(value, index, 'tutti'), null);
  assert.equal(parseScope('altri', buildChapterIndex([ex('E1.1', 1)], chapters), 'tutti'), null);
  assert.equal(parseScope('1', null, 'tutti'), null);
});

test('parseDifficulty knows the three levels', () => {
  assert.equal(parseDifficulty('medio'), 'medio');
  assert.equal(parseDifficulty('tutte'), null);
  assert.equal(parseDifficulty(null), null);
});

test('scopeSearch writes only what is set', () => {
  assert.equal(scopeSearch(3, 'medio'), '?capitolo=3&difficolta=medio');
  assert.equal(scopeSearch('tutti', null), '?capitolo=tutti');
  assert.equal(scopeSearch(null, 'facile'), '?difficolta=facile');
  assert.equal(scopeSearch(null, null), '');
});

test('the scope and the difficulty filter the list', () => {
  const index = buildChapterIndex(exercises, chapters);
  assert.deepEqual(itemsInScope(exercises, index, 1).map((e) => e.id), ['E1.1', 'E1.2']);
  assert.deepEqual(itemsInScope(exercises, index, 'altri').map((e) => e.id), ['X', 'E9.1']);
  assert.equal(itemsInScope(exercises, index, 'tutti').length, 6);
  assert.equal(itemsInScope(exercises, null, 3).length, 6);
  assert.deepEqual(filterByDifficulty(exercises, 'facile').map((e) => e.id), ['E1.1', 'E4.1']);
  assert.equal(filterByDifficulty(exercises, null).length, 6);
  assert.deepEqual(difficultyCounts(exercises), { facile: 2, medio: 2, difficile: 1 });
});

test('the section opens on the last chapter read when it has exercises, else on the first one with exercises', () => {
  const index = buildChapterIndex(exercises, chapters)!;
  assert.equal(defaultScope(index, 3), 3);
  assert.equal(defaultScope(index, 2), 1);
  assert.equal(defaultScope(index, undefined), 1);
  assert.equal(defaultScope(buildChapterIndex([ex('E3.1', 3)], chapters)!), 3);
});

test('the pager skips chapters without exercises and stops at the last chapter', () => {
  const index = buildChapterIndex(exercises, chapters)!;
  const at = (scope: Parameters<typeof neighbourEntries>[1]) => {
    const { prev, next } = neighbourEntries(index, scope);
    return [prev?.scope, next?.scope];
  };
  assert.deepEqual(at(1), [undefined, 3]);
  assert.deepEqual(at(3), [1, 4]);
  assert.deepEqual(at(4), [3, undefined]);
  assert.deepEqual(at('tutti'), [undefined, undefined]);
  assert.deepEqual(at('altri'), [undefined, undefined]);
});

test('the pager note counts what the next page shows with the difficulty chosen', () => {
  const index = buildChapterIndex(exercises, chapters)!;
  const chapter1 = index.entries[0];
  assert.equal(pagerNote(exercises, index, chapter1, null), '2 esercizi');
  assert.equal(pagerNote(exercises, index, chapter1, 'difficile'), '1 esercizio');
  assert.equal(pagerNote(exercises, index, chapter1, 'medio'), 'Nessun esercizio medio');
  // The index keeps the chapter's total.
  assert.equal(chapter1.count, 2);
});

test('the print title names the chapter and the difficulty', () => {
  const index = buildChapterIndex(exercises, chapters)!;
  assert.equal(scopeDocumentTitle('Esercizi', index.entries[2], 'difficile'), 'Esercizi · Capitolo 3. Tre · Livello difficile');
  assert.equal(scopeDocumentTitle('Esercizi', index.entries[4], null), 'Esercizi · Senza capitolo');
  assert.equal(scopeDocumentTitle('Prove d\'esame', undefined, null), 'Prove d\'esame');
});

test('the print URL carries the chapter and the difficulty next to the return path', () => {
  assert.equal(
    buildPrintUrl('chimica', 'esercizi', { scope: 3, difficulty: 'medio', returnTo: '/libro/chimica/esercizi?capitolo=3' }),
    '/libro/chimica/stampa/esercizi?capitolo=3&difficolta=medio&return=%2Flibro%2Fchimica%2Fesercizi%3Fcapitolo%3D3',
  );
  assert.equal(buildPrintUrl('chimica', 'esami'), '/libro/chimica/stampa/esami');
});

test('the end of a chapter links its formulas and exercises, and the exams only after the last chapter', () => {
  const book = {
    formulas: [formula('1.1'), formula('1.2'), formula('4.1')],
    esercizi: exercises,
    esami: [ex('X1'), ex('X2')],
    formulasEnabled: true,
    exercisesEnabled: true,
    examsEnabled: true,
  };
  assert.deepEqual(practiceCounts(1, false, book), { formulas: 2, exercises: 2, exams: 0 });
  assert.deepEqual(practiceCounts(4, true, book), { formulas: 1, exercises: 1, exams: 2 });
  assert.deepEqual(practiceCounts(2, true, { ...book, examsEnabled: false }), { formulas: 0, exercises: 0, exams: 0 });
  assert.deepEqual(practiceCounts(1, false, { ...book, exercisesEnabled: false }), { formulas: 2, exercises: 0, exams: 0 });
  assert.deepEqual(practiceCounts(1, false, { ...book, formulasEnabled: false }), { formulas: 0, exercises: 2, exams: 0 });
});

test('a link to one exercise opens its chapter without a difficulty; a bare URL opens the default chapter', () => {
  const index = buildChapterIndex(exercises, chapters);
  const view = (scope: Parameters<typeof scopeRedirect>[0]['scope'], difficulty: Parameters<typeof scopeRedirect>[0]['difficulty'] = null) => ({ index, scope, difficulty });
  const e31 = exercises[2];
  assert.equal(scopeRedirect(view(null), e31), '?capitolo=3');
  assert.equal(scopeRedirect(view(1, 'facile'), e31), '?capitolo=3');
  assert.equal(scopeRedirect(view('tutti'), e31), '?capitolo=3');
  assert.equal(scopeRedirect(view(3, 'medio'), e31), '?capitolo=3');
  assert.equal(scopeRedirect(view(3), e31), null);
  assert.equal(scopeRedirect(view(null), exercises[4]), '?capitolo=altri');
  assert.equal(scopeRedirect(view(null, 'difficile'), undefined, 4), '?capitolo=4&difficolta=difficile');
  assert.equal(scopeRedirect(view(null), undefined, 2), '?capitolo=1');
  assert.equal(scopeRedirect(view('tutti', 'medio'), undefined), null);
  // Exam questions have no index: only the difficulty is cleared.
  const exams = { index: null, scope: null, difficulty: 'medio' as const };
  assert.equal(scopeRedirect(exams, exercises[4]), '');
  assert.equal(scopeRedirect({ ...exams, difficulty: null }, exercises[4]), null);
  assert.equal(scopeRedirect(exams, undefined), null);
});

test('a hash names an exercise only when it is a readable #ex- link', () => {
  assert.equal(linkedId('#ex-E3.4', EXERCISE_HASH), 'E3.4');
  assert.equal(linkedId('#ex-E%203', EXERCISE_HASH), 'E 3');
  assert.equal(linkedId('#p2', EXERCISE_HASH), null);
  assert.equal(linkedId('', EXERCISE_HASH), null);
  assert.equal(linkedId('#ex-%', EXERCISE_HASH), null);
  assert.equal(linkedId('#ex-%E0%A4%A', EXERCISE_HASH), null);
  assert.equal(linkedId('#formula-2.1', EXERCISE_HASH), null);
});

// The formula sheet: the same index, with "tutte" for the whole section and a second chapter needed.

function formula(id: string): FormulaRef {
  const [chapter, number] = id.split('.').map(Number);
  return { id, chapter, number, label: `Formula ${id}`, latex: 'x' };
}

function chapter(number: number, ids: string[]): Chapter {
  return { meta: { id: `c${number}`, number, title: `Capitolo ${number}`, file: '', printable: true }, paragraphs: [], formulas: ids.map(formula) };
}

test('a hash names a formula only when it is a readable #formula- link', () => {
  assert.equal(linkedId('#formula-2.1', FORMULA_HASH), '2.1');
  assert.equal(linkedId('#2.1', FORMULA_HASH), null);
  assert.equal(linkedId('#ex-E3.4', FORMULA_HASH), null);
  assert.equal(linkedId('#formula-%', FORMULA_HASH), null);
});

test('the formula sheet gets an index only when its formulas fill two chapters', () => {
  const two = [formula('1.1'), formula('3.1'), formula('3.2')];
  const index = buildChapterIndex(two, chapters, FORMULA_INDEX_MIN_CHAPTERS)!;
  assert.deepEqual(index.entries.map((e) => [e.scope, e.count]), [[1, 1], [2, 0], [3, 2], [4, 0]]);
  assert.equal(index.total, 3);
  assert.equal(buildChapterIndex([formula('3.1'), formula('3.2')], chapters, FORMULA_INDEX_MIN_CHAPTERS), null);
  assert.equal(buildChapterIndex([], chapters, FORMULA_INDEX_MIN_CHAPTERS), null);
  // Exercises keep their index with one chapter.
  assert.notEqual(buildChapterIndex([ex('E3.1', 3)], chapters), null);
});

test('the formula sheet reads "tutte", opens on a chapter, and a formula link opens its chapter', () => {
  const list = [formula('1.1'), formula('3.1'), formula('3.2')];
  const index = buildChapterIndex(list, chapters, FORMULA_INDEX_MIN_CHAPTERS);
  assert.equal(parseScope('tutte', index, 'tutte'), 'tutte');
  assert.equal(parseScope('tutti', index, 'tutte'), null);
  assert.equal(parseScope('2', index, 'tutte'), 2);
  assert.equal(scopeSearch('tutte', null), '?capitolo=tutte');
  assert.equal(itemsInScope(list, index, 'tutte').length, 3);
  assert.deepEqual(itemsInScope(list, index, 3).map((f) => f.id), ['3.1', '3.2']);
  const view = (scope: Parameters<typeof scopeRedirect>[0]['scope']) => ({ index, scope, difficulty: null });
  assert.equal(scopeRedirect(view(null), undefined, 2), '?capitolo=1');
  assert.equal(scopeRedirect(view(null), undefined, 3), '?capitolo=3');
  assert.equal(scopeRedirect(view('tutte'), list[1]), '?capitolo=3');
  assert.equal(scopeRedirect(view(1), list[1]), '?capitolo=3');
  assert.equal(scopeRedirect(view(3), list[1]), null);
  assert.equal(scopeRedirect(view('tutte'), undefined), null);
  // Without the index the sheet is one page: nothing to redirect.
  assert.equal(scopeRedirect({ index: null, scope: null, difficulty: null }, list[1], 3), null);
  const { prev, next } = neighbourEntries(index!, 1);
  assert.deepEqual([prev?.scope, next?.scope], [undefined, 3]);
  assert.equal(scopeDocumentTitle('Formulario', index!.entries[2], null), 'Formulario · Capitolo 3. Tre');
  assert.equal(scopeDocumentTitle('Formulario', undefined, null), 'Formulario');
});

test('the print URL of the formula sheet carries the chapter', () => {
  assert.equal(buildPrintUrl('fisica-1', 'formulario', { scope: 7 }), '/libro/fisica-1/stampa/formulario?capitolo=7');
  assert.equal(buildPrintUrl('fisica-1', 'formulario', { scope: 'tutte' }), '/libro/fisica-1/stampa/formulario?capitolo=tutte');
});

test('bookFormulas files each formula under the chapter it is written in, once per book', () => {
  const book = [chapter(1, ['1.1']), chapter(2, ['5.1', '2.1'])];
  const list = bookFormulas(book);
  assert.deepEqual(list.map((f) => [f.id, f.chapter]), [['1.1', 1], ['5.1', 2], ['2.1', 2]]);
  // A formula whose id already names its chapter is the same object.
  assert.equal(list[0], book[0].formulas[0]);
  assert.equal(bookFormulas(book), list);
});

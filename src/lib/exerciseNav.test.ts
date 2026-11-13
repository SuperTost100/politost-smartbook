import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Exercise } from '../types/smartbook';
import {
  buildExerciseIndex,
  defaultScope,
  difficultyCounts,
  exerciseDocumentTitle,
  exerciseSearch,
  exercisesInScope,
  filterByDifficulty,
  neighbourEntries,
  parseDifficulty,
  parseScope,
  practiceCounts,
  exerciseRedirect,
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
  const index = buildExerciseIndex(exercises, chapters)!;
  assert.equal(index.total, 6);
  assert.equal(index.chapterCount, 4);
  assert.deepEqual(index.entries.map((e) => [e.scope, e.count]), [[1, 2], [2, 0], [3, 1], [4, 1], ['altri', 2]]);
});

test('a book where no exercise has a chapter gets no index', () => {
  assert.equal(buildExerciseIndex([ex('A'), ex('B', 7)], chapters), null);
  assert.equal(buildExerciseIndex([], chapters), null);
});

test('without exercises outside the chapters there is no "altri" entry', () => {
  const index = buildExerciseIndex([ex('E1.1', 1)], chapters)!;
  assert.equal(index.entries.at(-1)?.scope, 4);
});

test('parseScope accepts chapters of the index, tutti and altri only', () => {
  const index = buildExerciseIndex(exercises, chapters);
  assert.equal(parseScope('3', index), 3);
  assert.equal(parseScope('2', index), 2);
  assert.equal(parseScope('tutti', index), 'tutti');
  assert.equal(parseScope('altri', index), 'altri');
  for (const value of ['9', '03x', '', null, 'Tutti']) assert.equal(parseScope(value, index), null);
  assert.equal(parseScope('altri', buildExerciseIndex([ex('E1.1', 1)], chapters)), null);
  assert.equal(parseScope('1', null), null);
});

test('parseDifficulty knows the three levels', () => {
  assert.equal(parseDifficulty('medio'), 'medio');
  assert.equal(parseDifficulty('tutte'), null);
  assert.equal(parseDifficulty(null), null);
});

test('exerciseSearch writes only what is set', () => {
  assert.equal(exerciseSearch(3, 'medio'), '?capitolo=3&difficolta=medio');
  assert.equal(exerciseSearch('tutti', null), '?capitolo=tutti');
  assert.equal(exerciseSearch(null, 'facile'), '?difficolta=facile');
  assert.equal(exerciseSearch(null, null), '');
});

test('the scope and the difficulty filter the list', () => {
  const index = buildExerciseIndex(exercises, chapters);
  assert.deepEqual(exercisesInScope(exercises, index, 1).map((e) => e.id), ['E1.1', 'E1.2']);
  assert.deepEqual(exercisesInScope(exercises, index, 'altri').map((e) => e.id), ['X', 'E9.1']);
  assert.equal(exercisesInScope(exercises, index, 'tutti').length, 6);
  assert.equal(exercisesInScope(exercises, null, 3).length, 6);
  assert.deepEqual(filterByDifficulty(exercises, 'facile').map((e) => e.id), ['E1.1', 'E4.1']);
  assert.equal(filterByDifficulty(exercises, null).length, 6);
  assert.deepEqual(difficultyCounts(exercises), { facile: 2, medio: 2, difficile: 1 });
});

test('the section opens on the last chapter read when it has exercises, else on the first one with exercises', () => {
  const index = buildExerciseIndex(exercises, chapters)!;
  assert.equal(defaultScope(index, 3), 3);
  assert.equal(defaultScope(index, 2), 1);
  assert.equal(defaultScope(index, undefined), 1);
  assert.equal(defaultScope(buildExerciseIndex([ex('E3.1', 3)], chapters)!), 3);
});

test('the pager skips chapters without exercises and stops at the last chapter', () => {
  const index = buildExerciseIndex(exercises, chapters)!;
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

test('the print title names the chapter and the difficulty', () => {
  const index = buildExerciseIndex(exercises, chapters)!;
  assert.equal(exerciseDocumentTitle('Esercizi', index.entries[2], 'difficile'), 'Esercizi · Capitolo 3. Tre · Livello difficile');
  assert.equal(exerciseDocumentTitle('Esercizi', index.entries[4], null), 'Esercizi · Senza capitolo');
  assert.equal(exerciseDocumentTitle('Prove d\'esame', undefined, null), 'Prove d\'esame');
});

test('the print URL carries the chapter and the difficulty next to the return path', () => {
  assert.equal(
    buildPrintUrl('chimica', 'esercizi', { scope: 3, difficulty: 'medio', returnTo: '/libro/chimica/esercizi?capitolo=3' }),
    '/libro/chimica/stampa/esercizi?capitolo=3&difficolta=medio&return=%2Flibro%2Fchimica%2Fesercizi%3Fcapitolo%3D3',
  );
  assert.equal(buildPrintUrl('chimica', 'esami'), '/libro/chimica/stampa/esami');
});

test('the end of a chapter links its exercises, and the exams only after the last chapter', () => {
  const book = { esercizi: exercises, esami: [ex('X1'), ex('X2')], exercisesEnabled: true, examsEnabled: true };
  assert.deepEqual(practiceCounts(1, false, book), { exercises: 2, exams: 0 });
  assert.deepEqual(practiceCounts(4, true, book), { exercises: 1, exams: 2 });
  assert.deepEqual(practiceCounts(2, true, { ...book, examsEnabled: false }), { exercises: 0, exams: 0 });
  assert.deepEqual(practiceCounts(1, false, { ...book, exercisesEnabled: false }), { exercises: 0, exams: 0 });
});

test('a link to one exercise opens its chapter without a difficulty; a bare URL opens the default chapter', () => {
  const index = buildExerciseIndex(exercises, chapters);
  const view = (scope: Parameters<typeof exerciseRedirect>[0]['scope'], difficulty: Parameters<typeof exerciseRedirect>[0]['difficulty'] = null) => ({ index, scope, difficulty });
  const e31 = exercises[2];
  assert.equal(exerciseRedirect(view(null), e31), '?capitolo=3');
  assert.equal(exerciseRedirect(view(1, 'facile'), e31), '?capitolo=3');
  assert.equal(exerciseRedirect(view('tutti'), e31), '?capitolo=3');
  assert.equal(exerciseRedirect(view(3, 'medio'), e31), '?capitolo=3');
  assert.equal(exerciseRedirect(view(3), e31), null);
  assert.equal(exerciseRedirect(view(null), exercises[4]), '?capitolo=altri');
  assert.equal(exerciseRedirect(view(null, 'difficile'), undefined, 4), '?capitolo=4&difficolta=difficile');
  assert.equal(exerciseRedirect(view(null), undefined, 2), '?capitolo=1');
  assert.equal(exerciseRedirect(view('tutti', 'medio'), undefined), null);
  // Exam questions have no index: only the difficulty is cleared.
  const exams = { index: null, scope: null, difficulty: 'medio' as const };
  assert.equal(exerciseRedirect(exams, exercises[4]), '');
  assert.equal(exerciseRedirect({ ...exams, difficulty: null }, exercises[4]), null);
  assert.equal(exerciseRedirect(exams, undefined), null);
});

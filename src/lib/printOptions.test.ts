import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Exercise } from '../types/smartbook';
import {
  defaultPrintOptions,
  groupExercises,
  parsePrintOptions,
  pickExercises,
  printSummary,
  writePrintOptions,
} from './printOptions.ts';
import { buildPrintUrl } from '../print/routes.ts';

function ex(id: string, chapter?: number, difficulty?: Exercise['difficulty']): Exercise {
  return { id, chapter, difficulty, type: 'esercizio', question: id };
}

const printable = [1, 2, 3, 5];
const parse = (search: string) => parsePrintOptions(new URLSearchParams(search), printable);

test('no parameters print the book alone, with solutions on for when exercises are added', () => {
  assert.deepEqual(parse(''), { chapters: [1, 2, 3, 5], exercises: null, formulario: false, exams: false, solutions: true });
  assert.deepEqual(parse(''), defaultPrintOptions(printable));
});

test('the URL sets every option', () => {
  assert.deepEqual(parse('capitoli=3,1&esercizi=5&formulario=1&esami=1&soluzioni=0'), {
    chapters: [1, 3],
    exercises: 5,
    formulario: true,
    exams: true,
    solutions: false,
  });
  assert.equal(parse('esercizi=tutti').exercises, 'tutti');
});

test('invalid values fall back to the defaults', () => {
  const options = parse('capitoli=4,abc&esercizi=7&formulario=si&esami=2&soluzioni=forse');
  assert.deepEqual(options, defaultPrintOptions(printable));
  // A chapter that is not printable is dropped; the others stay.
  assert.deepEqual(parse('capitoli=2,4').chapters, [2]);
});

test('an empty chapter list means none chosen', () => {
  assert.deepEqual(parse('capitoli=').chapters, []);
});

test('writing the options leaves out defaults and keeps the other parameters', () => {
  const base = new URLSearchParams('da=intro&return=%2Flibro%2Fx');
  const all = writePrintOptions(base, { ...defaultPrintOptions(printable), exercises: 3 }, printable);
  assert.equal(all.toString(), 'da=intro&return=%2Flibro%2Fx&esercizi=3');
  const some = writePrintOptions(all, { chapters: [2, 5], exercises: null, formulario: true, exams: true, solutions: false }, printable);
  assert.equal(some.toString(), 'da=intro&return=%2Flibro%2Fx&capitoli=2%2C5&formulario=1&esami=1&soluzioni=0');
  assert.equal(writePrintOptions(some, { ...defaultPrintOptions(printable), chapters: [] }, printable).get('capitoli'), '');
  // What is written reads back the same.
  assert.deepEqual(parsePrintOptions(some, printable), { chapters: [2, 5], exercises: null, formulario: true, exams: true, solutions: false });
});

test('a limit spreads the picks over the difficulties and keeps book order', () => {
  const list = [
    ex('E1', 1, 'facile'),
    ex('E2', 1, 'medio'),
    ex('E3', 1, 'facile'),
    ex('E4', 1, 'difficile'),
    ex('E5', 1, 'facile'),
    ex('E6', 1, 'medio'),
    ex('E7', 1, 'facile'),
    ex('E8', 1, 'difficile'),
  ];
  // One slot each, the middle one of each difficulty: facile E1 E3 E5 E7 -> E5, medio E2 E6 -> E6, difficile E4 E8 -> E8.
  assert.deepEqual(pickExercises(list, 3).map((x) => x.id), ['E5', 'E6', 'E8']);
  // Five slots: facile 2, medio 2, difficile 1. Two of the four facile ones, spaced: the 2nd and the 4th.
  assert.deepEqual(pickExercises(list, 5).map((x) => x.id), ['E2', 'E3', 'E6', 'E7', 'E8']);
  assert.deepEqual(pickExercises(list, 3), pickExercises(list, 3));
});

test('a difficulty that runs out gives its slots to the others', () => {
  const list = [ex('A', 1, 'facile'), ex('B', 1, 'facile'), ex('C', 1, 'facile'), ex('D', 1, 'facile'), ex('E', 1, 'difficile')];
  assert.deepEqual(pickExercises(list, 3).map((x) => x.id), ['B', 'D', 'E']);
});

test('exercises without a difficulty take their turn after difficile', () => {
  const list = [ex('A', 1, 'facile'), ex('B', 1), ex('C', 1), ex('D', 1, 'medio')];
  assert.deepEqual(pickExercises(list, 3).map((x) => x.id), ['A', 'C', 'D']);
});

test('a chapter with no more exercises than the limit prints all of them', () => {
  const list = [ex('A', 1, 'facile'), ex('B', 1, 'medio')];
  assert.equal(pickExercises(list, 3), list);
  assert.equal(pickExercises(list, 'tutti'), list);
});

test('exercises group by chapter; no chapter or an unknown one goes to the others', () => {
  const grouped = groupExercises([ex('E1.1', 1), ex('X', undefined), ex('E3.1', 3), ex('E1.2', 1), ex('E9.1', 9)], [1, 2, 3]);
  assert.deepEqual([...grouped.byChapter].map(([n, list]) => [n, list.map((x) => x.id)]), [
    [1, ['E1.1', 'E1.2']],
    [3, ['E3.1']],
  ]);
  assert.deepEqual(grouped.other.map((x) => x.id), ['X', 'E9.1']);
});

test('the summary names what the document contains', () => {
  assert.deepEqual(printSummary({ chapters: '17 capitoli', exercises: null, formulario: false, exams: null, solutions: true }), {
    main: '17 capitoli',
    sub: '',
  });
  assert.deepEqual(printSummary({ chapters: '17 capitoli', exercises: 51, formulario: true, exams: 23, solutions: true }), {
    main: "17 capitoli · 51 esercizi · formulario · 23 prove d'esame",
    sub: 'Con le soluzioni',
  });
  assert.deepEqual(printSummary({ exercises: null, formulario: false, exams: 1, solutions: false }), {
    main: "1 prova d'esame",
    sub: 'Senza soluzioni',
  });
});

test('the whole book has its own print URL and remembers the chapter it came from', () => {
  assert.equal(buildPrintUrl('chimica', 'libro'), '/libro/chimica/stampa/libro');
  assert.equal(
    buildPrintUrl('chimica', 'libro', { chapterId: 'atomi', returnTo: '/libro/chimica/capitolo/atomi' }),
    '/libro/chimica/stampa/libro?da=atomi&return=%2Flibro%2Fchimica%2Fcapitolo%2Fatomi',
  );
});

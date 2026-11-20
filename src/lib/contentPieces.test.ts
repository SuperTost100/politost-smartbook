import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { parseChapterMarkdown, parseContentBlocks, preprocessContent } from '../../packages/content-core/src/index.ts';
import { mountOrder, pieceForHash, splitContentPieces } from './contentPieces.ts';

before(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  (globalThis as typeof globalThis & { window: Window }).window = dom.window as unknown as Window;
});

const sameBlocks = (content: string, minChars: number) => {
  const pieces = splitContentPieces(content, minChars);
  assert.equal(pieces.join(''), content);
  assert.deepEqual(pieces.flatMap((piece) => parseContentBlocks(piece)), parseContentBlocks(content));
  return pieces;
};

const tricky = preprocessContent(
  [
    'Testo con $a_1$ e una lista:',
    '',
    '- primo punto',
    '- secondo punto con $$x^2$$',
    '',
    ':::formula{id="1.1" label="Prima"}\n$$E = mc^2$$\n:::',
    '',
    '```\ncodice <!--FORMULA:9.9--> dentro\n```',
    '',
    '1. uno',
    '2. due',
    '',
    ':::image{src="assets/a.svg" alt="A" caption="Fig. 1.1 — Una figura"}\n:::',
    '',
    '> citazione con **grassetto**',
    '',
    '<!--FORMULA:1.2 senza chiusura',
    '',
    'Fine del paragrafo.',
  ].join('\n'),
);

test('the pieces of a paragraph parse to the blocks of the whole paragraph', () => {
  for (const minChars of [0, 1, 40, 200, 100_000]) sameBlocks(tricky, minChars);
  assert.ok(splitContentPieces(tricky, 0).length > 2, 'the sample has markers to cut at');
});

test('every paragraph of the bundled books splits without changing its blocks', () => {
  const root = new URL('../content/', import.meta.url);
  for (const book of readdirSync(root)) {
    const chapters = new URL(`${book}/chapters/`, root);
    for (const file of readdirSync(chapters)) {
      const chapter = parseChapterMarkdown(readFileSync(new URL(file, chapters), 'utf8'), 1);
      for (const paragraph of chapter.paragraphs) {
        for (const minChars of [0, 500]) sameBlocks(preprocessContent(paragraph.content), minChars);
      }
    }
  }
});

test('a piece is cut only at a formula or a figure, once it has reached the minimum', () => {
  const content = 'a'.repeat(50) + '<!--FORMULA:1.1-->' + 'b'.repeat(10) + '<!--FORMULA:1.2-->' + 'c'.repeat(50);
  assert.deepEqual(splitContentPieces(content, 40), ['a'.repeat(50), '<!--FORMULA:1.1-->' + 'b'.repeat(10) + '<!--FORMULA:1.2-->' + 'c'.repeat(50)]);
  assert.deepEqual(splitContentPieces('solo testo', 1), ['solo testo']);
});

test('a link lands in the piece of its paragraph or of its formula', () => {
  const pieces = [['intro'], ['a', 'b <!--FORMULA:3.2--> c', 'd'], ['e']];
  const ids = ['p1', 'p2', 'p3'];
  assert.deepEqual(pieceForHash(pieces, ids, '#p3'), [2, 0]);
  assert.deepEqual(pieceForHash(pieces, ids, '#formula-3.2'), [1, 1]);
  assert.equal(pieceForHash(pieces, ids, '#formula-9.9'), null);
  assert.equal(pieceForHash(pieces, ids, ''), null);
});

test('the pieces appear from the landing to the end, then upwards from the landing', () => {
  const pieces = [['a'], ['b', 'c'], ['d']];
  const key = (order: readonly (readonly [number, number])[]) => order.map(([i, j]) => `${i}.${j}`).join(' ');
  assert.equal(key(mountOrder(pieces, null)), '0.0 1.0 1.1 2.0');
  assert.equal(key(mountOrder(pieces, [1, 1])), '1.1 2.0 1.0 0.0');
});

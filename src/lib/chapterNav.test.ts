import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Chapter } from '../types/smartbook';
import { firstChapterPath, refLabel, withLoadedChapter } from './chapterNav.ts';

test('withLoadedChapter replaces the matching shell chapter', () => {
  const shell = { meta: { id: 'c1', number: 2, title: 'T', file: 'a.md', printable: true }, paragraphs: [], formulas: [] } as Chapter;
  const loaded = {
    ...shell,
    formulas: [{ id: '2.1', chapter: 2, number: 1, label: 'Test', latex: '$$x$$' }],
  } as Chapter;
  const list = withLoadedChapter([shell], loaded);
  assert.equal(list.length, 1);
  assert.equal(list[0].formulas[0]?.id, '2.1');
});

test('firstChapterPath skips an empty chapter list', () => {
  assert.equal(firstChapterPath('demo', []), null);
  assert.equal(firstChapterPath('demo', [{ id: 'nel-libro' }]), '/libro/demo/capitolo/nel-libro');
});

test('refLabel gives readable labels for internal refs', () => {
  assert.equal(refLabel('chapter/1#p6'), '§1.6');
  assert.equal(refLabel('formula/2.3'), '(2.3)');
  assert.equal(refLabel('other'), 'other');
});

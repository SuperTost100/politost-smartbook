import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chapterProgress } from './chapterProgress';

test('the first paragraph is 0 and the last is 100', () => {
  assert.equal(chapterProgress(0, 6), 0);
  assert.equal(chapterProgress(5, 6), 100);
  assert.equal(chapterProgress(1, 6), 20);
});

test('a one-paragraph chapter counts as 100', () => {
  assert.equal(chapterProgress(0, 1), 100);
});

test('no paragraph or an unknown one is 0', () => {
  assert.equal(chapterProgress(-1, 6), 0);
  assert.equal(chapterProgress(0, 0), 0);
});

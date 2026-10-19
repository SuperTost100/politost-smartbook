import { test } from 'node:test';
import assert from 'node:assert/strict';
import { closestIntersectingParagraph } from './activeParagraph.ts';

const entry = (top: number, isIntersecting = true) => ({
  isIntersecting,
  target: { getBoundingClientRect: () => ({ top }) },
});

test('no intersections have no active paragraph', () => {
  assert.equal(closestIntersectingParagraph([]), undefined);
});

test('one intersection is active', () => {
  const only = entry(100);
  assert.equal(closestIntersectingParagraph([only]), only);
});

test('the higher paragraph wins when the lower paragraph is last', () => {
  const higher = entry(90);
  assert.equal(closestIntersectingParagraph([higher, entry(200)]), higher);
});

test('non-intersecting entries are ignored', () => {
  const visible = entry(100);
  assert.equal(closestIntersectingParagraph([visible, entry(0, false)]), visible);
  assert.equal(closestIntersectingParagraph([entry(0, false)]), undefined);
});

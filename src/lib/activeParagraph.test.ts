import { test } from 'node:test';
import assert from 'node:assert/strict';
import { closestIntersectingParagraph } from './activeParagraph.ts';

const entry = (top: number, isIntersecting = true) => ({
  isIntersecting,
  target: { getBoundingClientRect: () => ({ top }) },
});

const BAND_TOP = 88;
const BAND_BOTTOM = 385;

test('no intersections have no active paragraph', () => {
  assert.equal(closestIntersectingParagraph([], BAND_TOP, BAND_BOTTOM), undefined);
});

test('one intersection is active', () => {
  const only = entry(100);
  assert.equal(closestIntersectingParagraph([only], BAND_TOP, BAND_BOTTOM), only);
});

test('a later paragraph in the band does not take over from the first', () => {
  const higher = entry(120);
  assert.equal(closestIntersectingParagraph([higher, entry(300)], BAND_TOP, BAND_BOTTOM), higher);
});

test('a heading in the band wins over a paragraph that only has its tail there', () => {
  const tail = entry(-334);
  const current = entry(308);
  assert.equal(closestIntersectingParagraph([tail, current], BAND_TOP, BAND_BOTTOM), current);
  assert.equal(closestIntersectingParagraph([current, tail], BAND_TOP, BAND_BOTTOM), current);
});

test('non-intersecting entries are ignored', () => {
  const visible = entry(100);
  assert.equal(closestIntersectingParagraph([visible, entry(0, false)], BAND_TOP, BAND_BOTTOM), visible);
  assert.equal(closestIntersectingParagraph([entry(0, false)], BAND_TOP, BAND_BOTTOM), undefined);
});

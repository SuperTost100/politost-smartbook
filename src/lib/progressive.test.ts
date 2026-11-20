import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareBatch } from './progressive.ts';

test('a batch prepares items until the time budget is spent', () => {
  let clock = 0;
  const prepared: number[] = [];
  const next = prepareBatch(2, 10, (i) => { prepared.push(i); clock += 3; }, 8, () => clock);
  assert.deepEqual(prepared, [2, 3, 4]);
  assert.equal(next, 5);
});

test('a batch prepares one item even when that item alone is over the budget', () => {
  let clock = 0;
  assert.equal(prepareBatch(0, 5, () => { clock += 100; }, 8, () => clock), 1);
});

test('a batch stops at the last item', () => {
  assert.equal(prepareBatch(3, 4, () => undefined, 8, () => 0), 4);
});

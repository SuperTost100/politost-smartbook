import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareBatch, runWhenIdle } from './progressive.ts';

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

test('idle tasks all run in order, and stop when cancelled', async () => {
  const ran: number[] = [];
  runWhenIdle([0, 1, 2].map((i) => () => ran.push(i)));
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.deepEqual(ran, [0, 1, 2]);

  const stopped: number[] = [];
  const stop = runWhenIdle([0, 1, 2].map((i) => () => stopped.push(i)));
  stop();
  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.deepEqual(stopped, []);
});

test('idle tasks wait while the page is busy', async () => {
  const ran: number[] = [];
  let busy = true;
  const stop = runWhenIdle([0, 1].map((i) => () => ran.push(i)), () => busy);
  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.deepEqual(ran, []);
  busy = false;
  await new Promise((resolve) => setTimeout(resolve, 600));
  assert.deepEqual(ran, [0, 1]);
  stop();
});

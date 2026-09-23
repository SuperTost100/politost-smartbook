import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshGlobals } from './pythonIsolate.ts';

test('a name defined in run 1 is absent in run 2', () => {
  const run = (assign: boolean) => {
    const globals = freshGlobals(() => new Map<string, string>());
    if (assign) globals.set('nome', 'persist_test');
    return globals;
  };
  const first = run(true);
  const second = run(false);
  assert.equal(first.get('nome'), 'persist_test');
  assert.equal(second.has('nome'), false);
});

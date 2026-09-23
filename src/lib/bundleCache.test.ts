import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cachedByBundle } from './bundleCache.ts';

test('second load of the same bundle does not parse again', () => {
  const cache = new Map();
  const bundle = { id: 'esempio' };
  let builds = 0;
  const first = cachedByBundle(cache, 'esempio', bundle, () => {
    builds += 1;
    return { n: builds };
  });
  const second = cachedByBundle(cache, 'esempio', bundle, () => {
    builds += 1;
    return { n: builds };
  });
  assert.equal(first, second);
  assert.equal(builds, 1);

  const replaced = { id: 'esempio' };
  const third = cachedByBundle(cache, 'esempio', replaced, () => {
    builds += 1;
    return { n: builds };
  });
  assert.equal(third.n, 2);
});

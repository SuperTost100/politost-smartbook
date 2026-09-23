import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSafeNextPath, withSafeNext } from './safeNext.ts';

test('safe next accepts an in-app path and rejects protocol-relative URLs', () => {
  assert.equal(isSafeNextPath('/redeem'), true);
  assert.equal(isSafeNextPath('//evil.example'), false);
  assert.equal(isSafeNextPath('https://evil.example'), false);
  assert.equal(isSafeNextPath(null), false);
});

test('authorize URL appends next only for a safe path', () => {
  const base = '/auth/google/authorize';
  assert.equal(withSafeNext(base, '/redeem'), '/auth/google/authorize?next=%2Fredeem');
  assert.equal(withSafeNext(base, '//evil.example'), base);
  assert.equal(withSafeNext(base, null), base);
});

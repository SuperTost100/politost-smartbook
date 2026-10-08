import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSafeNextPath, withSafeNext } from './safeNext.ts';
import { getReturnUrl } from '../print/routes.ts';

test('safe next accepts an in-app path and rejects protocol-relative URLs', () => {
  assert.equal(isSafeNextPath('/redeem'), true);
  assert.equal(isSafeNextPath('//evil.example'), false);
  assert.equal(isSafeNextPath('/\\evil.example'), false);
  assert.equal(isSafeNextPath('https://evil.example'), false);
  assert.equal(isSafeNextPath(null), false);
});

test('authorize URL appends next only for a safe path', () => {
  const base = '/auth/google/authorize';
  assert.equal(withSafeNext(base, '/redeem'), '/auth/google/authorize?next=%2Fredeem');
  assert.equal(withSafeNext(base, '//evil.example'), base);
  assert.equal(withSafeNext(base, null), base);
});

test('print preview goes back only to an in-app path', () => {
  assert.equal(getReturnUrl('return=%2Flibro%2Fx%2Fformulario', '/libro/x'), '/libro/x/formulario');
  assert.equal(getReturnUrl('return=%2F%2Fevil.example', '/libro/x'), '/libro/x');
  assert.equal(getReturnUrl('', '/libro/x'), '/libro/x');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mathTrustedFor } from './mathTrust.ts';
import type { SmartbookData } from './loader.ts';

const copy = (mathTrusted: boolean) => ({ mathTrusted }) as SmartbookData;

test('formulas skip DOMPurify only for a trusted copy that is still the one served', () => {
  const catalog = copy(true);
  const imported = copy(false);
  assert.equal(mathTrustedFor(catalog, catalog), true);
  assert.equal(mathTrustedFor(imported, imported), false);
  assert.equal(mathTrustedFor(catalog, imported), false, 'an import replaced the open catalog copy');
  assert.equal(mathTrustedFor(imported, catalog), false, 'the import was removed while it was open');
  assert.equal(mathTrustedFor(null, catalog), false, 'outside a book');
  assert.equal(mathTrustedFor(catalog, null), false);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { licensePhaseFromAccess } from './licenseGateState.ts';

test('license fetch failure is error and a refused license stays denied', () => {
  assert.equal(licensePhaseFromAccess(null), 'error');
  assert.equal(licensePhaseFromAccess({ has_license: false }), 'denied');
  assert.equal(licensePhaseFromAccess({ has_license: true }), 'ok');
});

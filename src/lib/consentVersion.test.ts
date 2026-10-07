import assert from 'node:assert/strict';
import test from 'node:test';
import { consentIsCurrent } from './consentVersion.ts';

const versions = { tos: '2026-09-23', privacy: '2026-09-23' };

test('current acceptance matches both published versions', () => {
  assert.equal(
    consentIsCurrent({ has_consent: true, tos_version: '2026-09-23', privacy_version: '2026-09-23' }, versions),
    true,
  );
});

test('an older acceptance is not current', () => {
  assert.equal(
    consentIsCurrent({ has_consent: true, tos_version: '2026-06-19', privacy_version: '2026-06-19' }, versions),
    false,
  );
});

test('a missing row is not current', () => {
  assert.equal(consentIsCurrent({ has_consent: false }, versions), false);
});

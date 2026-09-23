import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { StoredBookBundle } from '../types/ptsb';
import { filterUploadedForUser } from './ptsbStore.ts';

function row(id: string, userId?: string): StoredBookBundle {
  return {
    config: { id, title: id, subject: '', sections: {} as StoredBookBundle['config']['sections'], chapters: [] },
    chapterFiles: {},
    eserciziRaw: '',
    esamiRaw: '',
    ide: [],
    grafici: [],
    importedAt: '',
    userId,
  };
}

test('uploaded listing is limited to the current user', () => {
  const rows = [row('a', 'user-a'), row('b', 'user-b'), row('anon')];
  assert.deepEqual(filterUploadedForUser(rows, 'user-a').map((r) => r.config.id), ['a']);
  assert.deepEqual(filterUploadedForUser(rows, null).map((r) => r.config.id), ['anon']);
});

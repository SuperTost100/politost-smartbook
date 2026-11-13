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

/** An `indexedDB` with one empty store, enough to count connections. */
function fakeIndexedDb() {
  const connections: { closed: boolean; onversionchange: (() => void) | null; onclose: (() => void) | null }[] = [];
  const indexedDB = {
    open() {
      const req: { result?: unknown; onsuccess?: () => void } = {};
      const db = {
        closed: false,
        onversionchange: null as (() => void) | null,
        onclose: null as (() => void) | null,
        close() { db.closed = true; },
        transaction() {
          if (db.closed) throw new DOMException('The database connection is closing.', 'InvalidStateError');
          return {
            objectStore: () => ({
              getAll() {
                const get: { result?: unknown[]; onsuccess?: () => void } = {};
                queueMicrotask(() => { get.result = []; get.onsuccess?.(); });
                return get;
              },
            }),
          };
        },
      };
      connections.push(db);
      queueMicrotask(() => { req.result = db; req.onsuccess?.(); });
      return req;
    },
  };
  return { indexedDB, connections };
}

test('one connection serves every call and closes when another tab upgrades the database', async (t) => {
  const fake = fakeIndexedDb();
  Object.assign(globalThis, { indexedDB: fake.indexedDB });
  t.after(() => { delete (globalThis as { indexedDB?: unknown }).indexedDB; });
  const { listUploaded } = await import('./ptsbStore.ts');

  await listUploaded(null);
  await listUploaded('user-a');
  assert.equal(fake.connections.length, 1);

  fake.connections[0].onversionchange?.();
  assert.equal(fake.connections[0].closed, true, 'an upgrade in another tab must not wait on this one');
  await listUploaded(null);
  assert.equal(fake.connections.length, 2, 'the next call opens a new connection');
});

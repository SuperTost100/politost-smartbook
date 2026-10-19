import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import type { StoredBookBundle } from '../types/ptsb.ts';

function book(id: string): StoredBookBundle {
  return {
    config: { id, title: id, subject: 'Fisica', chapters: [] },
    chapterFiles: {}, eserciziRaw: '', esamiRaw: '', ide: [], grafici: [],
    assets: { 'assets/image.svg': new TextEncoder().encode('<svg/>') },
    importedAt: '2026-10-19',
  } as StoredBookBundle;
}

test('uploaded registry ignores stale loads and releases only replaced URLs', async (t) => {
  // Vite expands loader.ts import.meta.glob just as it does for the app.
  const server = await createServer({
    server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [{
      name: 'test-upload-store',
      enforce: 'pre',
      resolveId(id) { if (id === './ptsbStore') return '\0test-upload-store'; },
      load(id) {
        if (id === '\0test-upload-store') return `
          export const pending = [];
          export const listUploaded = () => new Promise(resolve => pending.push(resolve));
          export const getRemoteCached = async () => undefined;
          export const saveRemoteCached = async () => {};
        `;
      },
    }],
  });
  try {
    const store = await server.ssrLoadModule('\0test-upload-store');
    const loader = await server.ssrLoadModule('/src/lib/loader.ts');
    const created: string[] = [];
    const revoked: string[] = [];
    t.mock.method(URL, 'createObjectURL', () => {
      const url = `blob:test-${created.length}`;
      created.push(url);
      return url;
    });
    t.mock.method(URL, 'revokeObjectURL', (url: string) => revoked.push(url));

    const initial = loader.initUploadedBooks(null);
    store.pending.shift()([book('initial')]);
    await initial;
    const oldUrl = created[0];

    const stale = loader.initUploadedBooks(null);
    const current = loader.initUploadedBooks('student');
    const [resolveStale, resolveCurrent] = store.pending.splice(0);
    assert.deepEqual(revoked, [], 'loading must not revoke the current book');
    resolveCurrent([book('current')]);
    await current;
    const currentData = loader.loadSmartbook('current');
    assert.ok(currentData);
    assert.deepEqual(revoked, [oldUrl]);

    resolveStale([book('stale')]);
    await stale;
    assert.equal(loader.loadSmartbook('current'), currentData);
    assert.equal(loader.loadSmartbook('stale'), null);
    assert.equal(created.length, 2, 'stale results must not allocate blob URLs');
    assert.deepEqual(revoked, [oldUrl]);

    const next = loader.initUploadedBooks('student');
    store.pending.shift()([]);
    await next;
    assert.deepEqual(revoked, created, 'the winning load replaces and releases current URLs');
  } finally {
    await server.close();
  }
});

test('opening another book evicts parsed data without invalidating bundle assets', async () => {
  const server = await createServer({ server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const loader = await server.ssrLoadModule('/src/lib/loader.ts');
    loader.registerUploadedBook(book('a'));
    loader.registerUploadedBook(book('b'));
    const first = loader.loadSmartbook('a');
    assert.equal(loader.loadSmartbook('a'), first);
    loader.loadSmartbook('b');
    const reopened = loader.loadSmartbook('a');
    assert.notEqual(reopened, first);
    assert.equal(reopened.assets, first.assets);
    const response = await fetch(reopened.assets['assets/image.svg']);
    assert.equal(await response.text(), '<svg/>');
    loader.unregisterUploadedBook('a');
    loader.unregisterUploadedBook('b');
  } finally {
    await server.close();
  }
});

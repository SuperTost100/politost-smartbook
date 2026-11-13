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

    const stale = loader.initUploadedBooks('other');
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

    const next = loader.initUploadedBooks(null);
    store.pending.shift()([]);
    await next;
    assert.deepEqual(revoked, created, 'the winning load replaces and releases current URLs');
  } finally {
    await server.close();
  }
});

test('a second load for the same user keeps the registry and its blob URLs', async (t) => {
  const server = await createServer({
    server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [{
      name: 'test-upload-store',
      enforce: 'pre',
      resolveId(id) { if (id === './ptsbStore') return '\0test-upload-store'; },
      load(id) {
        if (id === '\0test-upload-store') return `
          export const calls = [];
          export const listUploaded = async (userId) => { calls.push(userId); return [{
            config: { id: 'kept', title: 'kept', subject: 'Fisica', chapters: [] },
            chapterFiles: {}, eserciziRaw: '', esamiRaw: '', ide: [], grafici: [],
            assets: { 'assets/image.svg': new TextEncoder().encode('<svg/>') }, importedAt: '',
          }]; };
          export const getRemoteCached = async () => undefined;
          export const saveRemoteCached = async () => {};
        `;
      },
    }],
  });
  try {
    const store = await server.ssrLoadModule('\0test-upload-store');
    const loader = await server.ssrLoadModule('/src/lib/loader.ts');
    t.mock.method(URL, 'createObjectURL', () => 'blob:kept');
    const revoked: string[] = [];
    t.mock.method(URL, 'revokeObjectURL', (url: string) => revoked.push(url));

    await loader.initUploadedBooks(null);
    const opened = loader.loadSmartbook('kept');
    assert.ok(opened);
    await loader.initUploadedBooks(null);
    assert.deepEqual(store.calls, [null], 'the same user must not read IndexedDB again');
    assert.deepEqual(revoked, [], 'an open book keeps its image URLs');
    assert.equal(loader.loadSmartbook('kept'), opened);

    await loader.initUploadedBooks('student');
    assert.deepEqual(store.calls, [null, 'student'], 'another user reloads');
  } finally {
    await server.close();
  }
});

test('an uploaded copy shadows the remote one, and removing it brings the remote one back', async () => {
  const server = await createServer({
    server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [{
      name: 'test-remote-catalog',
      enforce: 'pre',
      resolveId(id) { if (id === './remoteCatalog') return '\0test-remote-catalog'; },
      load(id) {
        if (id === '\0test-remote-catalog') return `
          export const fetched = [];
          export const booksBaseUrl = () => 'https://books.test';
          export const fetchRemoteCatalog = async () => [{
            id: 'shared', title: 'Remote copy', subject: 'Fisica', version: '1.0.0',
            packageUrl: 'https://books.test/shared.ptsb', bytes: 1, sha256: '',
          }];
          export const fetchRemoteBook = async (entry) => {
            fetched.push(entry.id);
            return { config: { id: 'shared', title: 'Remote copy', subject: 'Fisica', chapters: [] },
              chapterFiles: {}, eserciziRaw: '', esamiRaw: '', ide: [], grafici: [], importedAt: '' };
          };
        `;
      },
    }],
  });
  try {
    const remote = await server.ssrLoadModule('\0test-remote-catalog');
    const loader = await server.ssrLoadModule('/src/lib/loader.ts');
    const uploaded = book('shared');
    uploaded.config.title = 'Uploaded copy';
    loader.registerUploadedBook(uploaded);
    await loader.initRemoteBooks();

    const entry = () => loader.getCatalog().find((e: { id: string }) => e.id === 'shared');
    assert.equal(entry().source, 'uploaded');
    await loader.ensureBookContent('shared');
    assert.equal(loader.loadSmartbook('shared').config.title, 'Uploaded copy');
    assert.deepEqual(remote.fetched, [], 'the shadowed remote copy is not downloaded');

    loader.unregisterUploadedBook('shared');
    assert.equal(entry().source, 'remote');
    assert.equal(entry().title, 'Remote copy');
    await loader.ensureBookContent('shared');
    assert.deepEqual(remote.fetched, ['shared']);
    assert.equal(loader.loadSmartbook('shared').config.title, 'Remote copy');
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

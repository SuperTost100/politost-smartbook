import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRemoteCatalog } from './remoteCatalog.ts';

const BASE = 'https://books.example.org';
const SHA = 'a'.repeat(64);

function book(overrides: Record<string, unknown> = {}) {
  return {
    id: 'analisi-1',
    title: 'Analisi 1',
    subject: 'Matematica',
    authors: ['Mario Rossi'],
    version: '1.2.0',
    specVersion: '1.2',
    chapters: 12,
    package: 'books/analisi-1@1.2.0.ptsb',
    bytes: 834221,
    sha256: SHA,
    ...overrides,
  };
}

const catalog = (...books: unknown[]) => ({ catalogVersion: 1, generatedAt: '2026-10-12T00:00:00Z', books });

test('resolves package paths against the books site', () => {
  const [entry] = parseRemoteCatalog(catalog(book()), BASE);
  assert.equal(entry.packageUrl, 'https://books.example.org/books/analisi-1@1.2.0.ptsb');
  assert.deepEqual(entry.authors, ['Mario Rossi']);
});

test('rejects an unknown catalog format', () => {
  assert.throws(() => parseRemoteCatalog({ catalogVersion: 2, books: [] }, BASE), /formato/);
  assert.throws(() => parseRemoteCatalog([], BASE), /formato/);
});

test('leaves out entries the reader must not fetch or cannot read', () => {
  const entries = parseRemoteCatalog(
    catalog(
      book({ id: 'other-site', package: 'https://evil.example.com/x.ptsb' }),
      book({ id: 'Bad Id' }),
      book({ id: 'future', specVersion: '9.0' }),
      book({ id: 'no-hash', sha256: 'abc' }),
      book({ id: 'too-big', bytes: 60 * 1024 * 1024 }),
      book({ id: 'no-version', version: '' }),
      book(),
      book({ title: 'Duplicate' }),
    ),
    BASE,
  );
  assert.deepEqual(entries.map((e) => [e.id, e.title]), [['analisi-1', 'Analisi 1']]);
});

test('package timeout rejects even when response headers arrive but the body hangs', async (t) => {
  const { fetchRemoteBook } = await import('./remoteCatalog.ts');
  const [entry] = parseRemoteCatalog(catalog(book()), BASE);
  const controller = new AbortController();
  t.mock.method(AbortSignal, 'timeout', (milliseconds: number) => {
    assert.equal(milliseconds, 10_000);
    return controller.signal;
  });
  t.mock.method(globalThis, 'fetch', async (_url: unknown, options?: RequestInit) => {
    assert.equal(options?.signal, controller.signal);
    return new Response(new ReadableStream({
      start(stream) {
        controller.signal.addEventListener('abort', () => stream.error(controller.signal.reason));
        queueMicrotask(() => controller.abort(new DOMException('Timed out', 'TimeoutError')));
      },
    }));
  });
  await assert.rejects(fetchRemoteBook(entry), { name: 'TimeoutError' });
});

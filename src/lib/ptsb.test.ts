import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strToU8, zipSync } from 'fflate';
import { parsePtsbFile } from './ptsb.ts';

test('uploaded future-format books retain their compatibility warning', async () => {
  const bytes = zipSync({
    'smartbook.json': strToU8(JSON.stringify({
      id: 'future-book',
      title: 'Future book',
      subject: 'Test',
      specVersion: '2.0',
      sections: {},
      chapters: [{ id: 'intro', number: 1, title: 'Intro', file: 'intro.md', printable: true }],
    })),
    'chapters/intro.md': strToU8('## p1 | Intro\n\nTesto.\n'),
  });
  const bundle = await parsePtsbFile(new File([new Uint8Array(bytes).buffer], 'future.ptsb'));
  assert.equal(bundle.config.id, 'future-book');
  assert.ok(bundle.warnings?.some((warning) => warning.includes('formato 2.0')));
  assert.ok(bundle.importedAt);
});

const book = (chapter: string) => zipSync({
  'ptsb.json': strToU8(JSON.stringify({ formatVersion: 1, packageType: 'smartbook', encrypted: false, access: 'public', createdAt: '2026-11-20T00:00:00Z' })),
  'smartbook.json': strToU8(JSON.stringify({
    id: 'verificato',
    title: 'Libro verificato',
    subject: 'Fisica',
    version: '1.0.0',
    sections: {},
    chapters: [{ id: 'intro', number: 1, title: 'Intro', file: '01-intro.md', printable: true }],
  })),
  'chapters/01-intro.md': strToU8(chapter),
  'esercizi.md': strToU8('---\ntype: esercizi\n---\n'),
  'grafici.json': strToU8('[]'),
  'assets/fig.svg': strToU8('<svg xmlns="http://www.w3.org/2000/svg"/>'),
});

const open = (bytes: Uint8Array, options?: { latex?: boolean }) =>
  parsePtsbFile(new File([new Uint8Array(bytes).buffer], 'book.ptsb'), options);

test('a package verified against the catalog opens with a formula KaTeX refuses', async () => {
  const bytes = book('## p1 | Intro\n\nUna formula rotta $\\frac{1}{$.\n');
  assert.equal((await open(bytes, { latex: false })).config.id, 'verificato');
});

test('an imported file with a formula KaTeX refuses is rejected', async () => {
  const bytes = book('## p1 | Intro\n\nUna formula rotta $\\frac{1}{$.\n');
  await assert.rejects(open(bytes), /LaTeX/);
});

test('a verified package with a broken structure is still rejected', async () => {
  await assert.rejects(open(zipSync({ 'chapters/01.md': strToU8('## p1 | A') }), { latex: false }), /smartbook\.json/);
  await assert.rejects(open(book('Testo senza paragrafi.\n'), { latex: false }), /paragrafo/i);
  await assert.rejects(open(zipSync({ '../fuori.md': strToU8('x') }), { latex: false }), /non consentito/);
});

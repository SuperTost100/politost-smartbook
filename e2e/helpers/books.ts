import { createHash } from 'node:crypto';
import { expect, type Page } from '@playwright/test';
import { strToU8, zipSync } from 'fflate';

/** The e2e build points VITE_BOOKS_URL here. Nothing answers unless a test routes it. */
export const BOOKS_URL = 'https://books.e2e.invalid';

export interface TestBook {
  id: string;
  title: string;
  chapters: { id: string; number: number; title: string; markdown: string }[];
  esercizi?: string;
  esami?: string;
}

/**
 * Serves `book` as the only book of the books site and downloads it from its card on Home, so a test
 * can open any page of a book it writes itself.
 */
export async function openTestBook(page: Page, book: TestBook): Promise<void> {
  const config = {
    id: book.id,
    title: book.title,
    subject: 'Prova',
    authors: ['PoliTost'],
    version: '1.0.0',
    specVersion: '1.2',
    sections: Object.fromEntries(
      ['smartbook', 'formulario', 'esercizi', 'esami', 'ide', 'grafici', 'risposte'].map((key) => [
        key,
        { enabled: ['smartbook', 'formulario', 'esercizi', 'esami'].includes(key), label: key },
      ]),
    ),
    chapters: book.chapters.map(({ id, number, title }) => ({ id, number, title, file: `${id}.md`, printable: true })),
  };
  const files: Record<string, Uint8Array> = {
    'ptsb.json': strToU8(JSON.stringify({
      formatVersion: 1, packageType: 'smartbook', encrypted: false, access: 'public', createdAt: '2026-11-01T00:00:00Z',
    })),
    'smartbook.json': strToU8(JSON.stringify(config)),
  };
  for (const chapter of book.chapters) files[`chapters/${chapter.id}.md`] = strToU8(chapter.markdown);
  if (book.esercizi) files['esercizi.md'] = strToU8(book.esercizi);
  if (book.esami) files['esami.md'] = strToU8(book.esami);
  const pkg = zipSync(files);
  const catalog = {
    catalogVersion: 1,
    generatedAt: '2026-11-01T00:00:00Z',
    books: [{
      id: book.id,
      title: book.title,
      subject: 'Prova',
      authors: ['PoliTost'],
      version: '1.0.0',
      specVersion: '1.2',
      chapters: book.chapters.length,
      package: `books/${book.id}@1.0.0.ptsb`,
      bytes: pkg.byteLength,
      sha256: createHash('sha256').update(pkg).digest('hex'),
    }],
  };
  await page.route(`${BOOKS_URL}/catalog.json`, (route) => route.fulfill({ json: catalog }));
  await page.route(`${BOOKS_URL}/books/**`, (route) =>
    route.fulfill({ body: Buffer.from(pkg), contentType: 'application/octet-stream' }));
  await page.goto('/');
  await page.getByRole('link', { name: `Apri ${book.title}` }).click();
  await expect(page.locator('.sb-prose').first()).toBeVisible();
}

/** A display formula about twice as wide as the printed text column. */
const WIDE = Array.from({ length: 40 }, (_, i) => `a_{${i + 1}}b_{${i + 1}}`).join(' + ');
const many = Array.from({ length: 40 }, (_, i) => `:::formula{id="2.${i + 1}" label="Formula ${i + 1}"}\n$$y = ${i + 1}x$$\n:::\n`).join('\n');

/** Wide formulas in every kind of print block, and a formula sheet long enough to scroll. */
export const WIDE_BOOK: TestBook = {
  id: 'formule-lunghe',
  title: 'Formule lunghe',
  chapters: [
    {
      id: 'lunghe',
      number: 1,
      title: 'Lunghe',
      markdown: [
        '---', 'chapter: 1', 'title: Lunghe', '---', '',
        '## p1 | Una somma lunga', '',
        'Una formula più larga della colonna:', '',
        `$$S = ${WIDE}$$`, '',
        ':::formula{id="1.1" label="Una formula numerata lunga"}', `$$S = ${WIDE}$$`, ':::', '',
        '- In un elenco:', '',
        `  $$S = ${WIDE}$$`, '',
        ':::formula{id="1.2" label="Una formula corta"}', '$$s = a + b$$', ':::', '',
      ].join('\n'),
    },
    {
      id: 'tante',
      number: 2,
      title: 'Tante formule',
      markdown: ['---', 'chapter: 2', 'title: Tante formule', '---', '', '## p1 | Quaranta formule', '', many].join('\n'),
    },
  ],
  esercizi: [
    '---', 'type: esercizi', 'printable: true', '---', '',
    ':::exercise{id="E1.1" chapter="1" difficulty="facile"}', '## Domanda', 'Calcola la somma:', '', `$$S = ${WIDE}$$`, '',
    ':::solution', `$$S = ${WIDE}$$`, ':::', ':::', '',
  ].join('\n'),
  esami: [
    '---', 'type: esami', 'printable: true', '---', '',
    ':::exercise{id="X1" type="esame" difficulty="medio"}', '## Domanda', 'Calcola la somma:', '', `$$S = ${WIDE}$$`, '',
    ':::solution', `$$S = ${WIDE}$$`, ':::', ':::', '',
  ].join('\n'),
};

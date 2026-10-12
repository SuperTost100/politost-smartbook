import { createHash } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { strToU8, zipSync } from 'fflate';
import { BOOKS_URL } from './helpers/books';

const CONFIG = {
  id: 'remoto',
  title: 'Libro remoto',
  subject: 'Fisica',
  authors: ['Ada Lovelace'],
  version: '1.0.0',
  specVersion: '1.2',
  sections: Object.fromEntries(
    ['smartbook', 'formulario', 'esercizi', 'esami', 'ide', 'grafici', 'risposte'].map((key) => [
      key,
      { enabled: key === 'smartbook', label: key },
    ]),
  ),
  chapters: [{ id: 'primo', number: 1, title: 'Primo capitolo', file: '01-primo.md', printable: true }],
};

const PACKAGE = zipSync({
  'ptsb.json': strToU8(JSON.stringify({
    formatVersion: 1, packageType: 'smartbook', encrypted: false, access: 'public', createdAt: '2026-10-12T00:00:00Z',
  })),
  'smartbook.json': strToU8(JSON.stringify(CONFIG)),
  'chapters/01-primo.md': strToU8('## p1 | Dal sito dei libri\n\nQuesto capitolo arriva dal catalogo remoto, con $E = mc^2$.\n'),
});

function catalog(overrides: Record<string, unknown> = {}) {
  return {
    catalogVersion: 1,
    generatedAt: '2026-10-12T00:00:00Z',
    books: [{
      id: 'remoto',
      title: 'Libro remoto',
      subject: 'Fisica',
      authors: ['Ada Lovelace'],
      version: '1.0.0',
      specVersion: '1.2',
      chapters: 1,
      package: 'books/remoto@1.0.0.ptsb',
      bytes: PACKAGE.byteLength,
      sha256: createHash('sha256').update(PACKAGE).digest('hex'),
      ...overrides,
    }],
  };
}

async function serveBooks(page: Page, body: unknown, packageBytes: Uint8Array = PACKAGE) {
  await page.route(`${BOOKS_URL}/catalog.json`, (route) => route.fulfill({ json: body }));
  await page.route(`${BOOKS_URL}/books/**`, (route) =>
    route.fulfill({ body: Buffer.from(packageBytes), contentType: 'application/octet-stream' }));
}

test.describe('Remote books', () => {
  test('lists a book from the books site and opens it', async ({ page }) => {
    await serveBooks(page, catalog());
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Libro remoto' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Guida di esempio' })).toBeVisible();

    await page.getByRole('link', { name: 'Apri Libro remoto' }).click();
    await expect(page.getByText('Questo capitolo arriva dal catalogo remoto')).toBeVisible();
    await expect(page.locator('.katex').first()).toBeVisible();
  });

  test('keeps the builtin books when the catalog is unreachable', async ({ page }) => {
    await page.route(`${BOOKS_URL}/catalog.json`, (route) => route.fulfill({ status: 503 }));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Guida di esempio' })).toBeVisible();
    await expect(page.locator('.sb-book')).toHaveCount(1);
  });

  test('refuses a package that does not match the catalog hash', async ({ page }) => {
    await serveBooks(page, catalog({ sha256: '0'.repeat(64) }));
    await page.goto('/libro/remoto');
    await expect(page.getByRole('alert')).toContainText('non corrisponde al catalogo');
  });
});

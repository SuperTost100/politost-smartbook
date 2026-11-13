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

function pack(chapter: string) {
  return zipSync({
  'ptsb.json': strToU8(JSON.stringify({
    formatVersion: 1, packageType: 'smartbook', encrypted: false, access: 'public', createdAt: '2026-10-12T00:00:00Z',
  })),
  'smartbook.json': strToU8(JSON.stringify(CONFIG)),
  'chapters/01-primo.md': strToU8(chapter),
  });
}

const PACKAGE = pack('## p1 | Dal sito dei libri\n\nQuesto capitolo arriva dal catalogo remoto, con $E = mc^2$.\n');

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

  test('a long inline formula scrolls inside its line and punctuation stays with its formula', async ({ page }) => {
    const equation = String.raw`\mathrm{Ca_3(PO_4)_2 + SiO_2 + C \to P_4 + CaSiO_3 + CO + CO_2 + Ca_3(PO_4)_2}`;
    const wide = pack(`## p1 | Prova\n\nBilancia l'equazione $${equation}$. Poi $x = 1$, e basta.\n`);
    await serveBooks(page, catalog({ bytes: wide.byteLength, sha256: createHash('sha256').update(wide).digest('hex') }), wide);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/libro/remoto/capitolo/primo');
    await expect(page.locator('.katex').first()).toBeVisible();

    const wideMath = page.locator('.katex[data-wide]');
    await expect(wideMath).toHaveCount(1);
    expect(await wideMath.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    // The short formula stays ordinary text, tied to the comma after it.
    const glued = page.locator('.math-glue:has(.katex:not([data-wide]))');
    await expect(glued).toHaveCount(1);
    expect((await glued.textContent())?.endsWith(',')).toBe(true);
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

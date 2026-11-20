import { test, expect, type Page } from '@playwright/test';
import { openTestBook, packTestBook, type TestBook } from './helpers/books';

// Catalog books render KaTeX's output without DOMPurify; imported files keep full sanitizing.
// The hostile formulas parse cleanly, since an import refuses a book whose formulas KaTeX rejects,
// so the catalog copy renders them on the path without DOMPurify.

const FORMULAS: TestBook = {
  id: 'formule-fidate',
  title: 'Libro dal catalogo',
  chapters: [{
    id: 'formule',
    number: 1,
    title: 'Formule',
    markdown: [
      '## p1 | Formule',
      '',
      'La definizione è $f \\overset{\\mathrm{def}}{=} g$ e la massa vale $m = 54,0\\,\\mathrm{g}$, con **$\\alpha$** in grassetto.',
      '',
      '$$\\int_0^1 x^2\\,dx = \\frac{1}{3} \\qquad \\cancel{x}$$',
      '',
      ':::formula{id="1.1" label="Energia"}',
      '$$E = mc^2$$',
      ':::',
      '',
      'Si veda {{formula:1.1}}.',
      '',
    ].join('\n'),
  }],
};

const HOSTILE: TestBook = {
  id: 'formule-ostili',
  title: 'Libro ostile',
  chapters: [{
    id: 'ostile',
    number: 1,
    title: 'Ostile',
    markdown: [
      '## p1 | Ostile',
      '',
      'Link $\\href{javascript:alert(1)}{x}$, dati $\\htmlData{onclick=alert(1)}{y}$, testo $\\text{<img src=x onerror=alert(1)>}$, indirizzo $\\url{javascript:alert(1)}$, immagine $\\includegraphics{javascript:alert(1)}$.',
      '',
      'Grezzo <img src=x onerror=alert(1)> e <script>alert(1)</script>.',
      '',
      '$$\\def\\x{<script>}\\x \\verb|<img src=x onerror=alert(2)>| \\htmlClass{evil}{w}$$',
      '',
    ].join('\n'),
  }],
};

/**
 * Imports `book` from disk on Home, as a reader would, and opens it. `fromBook` goes back to Home
 * through the header link, so the app (and its caches) stay the same as when the open book rendered.
 */
async function importBook(page: Page, book: TestBook, fromBook = false) {
  if (fromBook) await page.getByRole('link', { name: 'Smartbook, torna alla libreria' }).click();
  else await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles({
    name: `${book.id}.ptsb`,
    mimeType: 'application/octet-stream',
    buffer: Buffer.from(packTestBook(book)),
  });
  await expect(page.getByText(`"${book.title}" caricato su questo dispositivo.`)).toBeVisible();
  await page.getByRole('link', { name: `Apri ${book.title}` }).click();
  await expect(page.locator('.sb-prose').first()).toBeVisible();
}

/** The HTML part of every formula in the chapter: what the reader sees. */
async function visibleFormulas(page: Page, count: number): Promise<string[]> {
  const formulas = page.locator('.sb-prose .katex-html');
  await expect(formulas).toHaveCount(count);
  return formulas.evaluateAll((els) => els.map((el) => el.outerHTML));
}

async function expectNothingActive(page: Page) {
  const prose = page.locator('.sb-prose');
  await expect(prose.locator('.katex').first()).toBeVisible();
  for (const selector of ['img', 'script', 'a[href^="javascript"]', '[onclick]', '[onerror]', '[data-onclick]', '.evil', '[style*="url("]']) {
    await expect(prose.locator(selector), selector).toHaveCount(0);
  }
}

test.describe('Trusted math', () => {
  test('a catalog copy and an imported copy of the same book show the same formulas', async ({ page }) => {
    await openTestBook(page, FORMULAS);
    const catalog = await visibleFormulas(page, 5);
    // Only the catalog copy keeps the MathML that DOMPurify drops from \overset.
    await expect(page.locator('.sb-prose mo > mover')).toHaveCount(1);

    // The same id imported from disk in the same session wins, and is sanitized again.
    await importBook(page, { ...FORMULAS, title: 'Copia importata' }, true);
    await expect(page.locator('.sb-prose').first()).toContainText('La definizione');
    expect(await visibleFormulas(page, 5)).toEqual(catalog);
    await expect(page.locator('.sb-prose mo > mover')).toHaveCount(0);
  });

  test('hostile formulas render inert, imported and from the catalog', async ({ page }) => {
    const dialogs: string[] = [];
    page.on('dialog', (dialog) => {
      dialogs.push(dialog.message());
      void dialog.dismiss();
    });
    await importBook(page, HOSTILE);
    await expectNothingActive(page);
    await openTestBook(page, { ...HOSTILE, id: 'formule-ostili-catalogo', title: 'Libro ostile dal catalogo' });
    await expectNothingActive(page);
    expect(dialogs).toEqual([]);
  });
});

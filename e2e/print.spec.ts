import { test, expect } from '@playwright/test';
import { PRINT_ROUTES, assertPrintMediaHidesChrome, assertPrintPreview, assertUniqueIds } from './helpers/print';
import { preparePlatformShell, PRINT_GOTO_OPTIONS } from './helpers/platform';

test.describe('Print preview', () => {
  test.beforeEach(async ({ page }) => {
    await preparePlatformShell(page);
  });

  for (const route of PRINT_ROUTES) {
    test(route.name, async ({ page }) => {
      await page.goto(route.url, PRINT_GOTO_OPTIONS);
      await assertPrintPreview(page, route);
    });
  }

  test('print media shows only the sheet', async ({ page }) => {
    await page.goto(PRINT_ROUTES[0].url, PRINT_GOTO_OPTIONS);
    await assertPrintPreview(page, PRINT_ROUTES[0]);
    await assertPrintMediaHidesChrome(page);
  });

  test('chapter prints to a multi-page A4 PDF with running heads', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'page.pdf is Chromium-only');
    await page.goto(PRINT_ROUTES[0].url, PRINT_GOTO_OPTIONS);
    await assertPrintPreview(page, PRINT_ROUTES[0]);
    const pdf = await page.pdf({ format: 'A4' });
    expect(pdf.byteLength).toBeGreaterThan(10_000);
    const pageCount = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    expect(pageCount).toBeGreaterThanOrEqual(1);
  });

  test('whole book with every extra prints to a PDF with a page per chapter', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'page.pdf is Chromium-only');
    await page.goto('/libro/esempio/stampa/libro?esercizi=tutti&formulario=1&esami=1', PRINT_GOTO_OPTIONS);
    const sheet = page.locator('.print-sheet');
    await expect(page.getByRole('button', { name: 'Stampa o salva PDF' })).toBeEnabled();
    await expect(sheet).toHaveAttribute('aria-busy', 'false');
    await expect(page.getByRole('status').filter({ hasText: 'Il documento contiene' })).toContainText(
      "3 capitoli · 3 esercizi · formulario · 1 prova d'esame",
    );
    await expect(sheet.locator('.print-cover-title')).toHaveText('Guida di esempio');
    await expect(sheet.locator('.print-index > li')).toHaveCount(5);
    await expect(sheet.locator('.print-chapter-title')).toHaveText(['Benvenuto', 'Cosa trovi nel libro', 'Prova tu']);
    await expect(sheet.locator('.print-exercises-title')).toHaveCount(3);
    // Questions first, then their solutions; hints are never printed.
    await expect(sheet.locator('[id="ex-E3.1"]')).toBeVisible();
    await expect(sheet.locator('[id="esame-X1"]')).toBeVisible();
    await expect(sheet.locator('.print-solutions')).toHaveCount(4);
    await expect(sheet.getByText('Suggerimento', { exact: true })).toHaveCount(0);
    await expect(sheet.locator('.formulario-card').first()).toBeVisible();
    await assertUniqueIds(page);
    await expect(page).toHaveTitle('Guida di esempio · Tutto il libro');

    const pdf = await page.pdf({ format: 'A4' });
    const pageCount = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    // Cover, index, three chapters, formula sheet and exams each start a page.
    expect(pageCount).toBeGreaterThanOrEqual(7);
  });

  test('the panel switches between this chapter and the whole book, and the URL keeps the options', async ({ page }) => {
    await page.goto('/libro/esempio/capitolo/nel-libro', PRINT_GOTO_OPTIONS);
    await page.getByRole('banner').getByRole('button', { name: 'Versione stampabile' }).click();
    await expect(page).toHaveURL(/\/stampa\/capitolo\/nel-libro/);
    await expect(page).toHaveTitle('Guida di esempio · Capitolo 2. Cosa trovi nel libro');
    await expect(page.locator('.print-toolbar-title')).toHaveText('Guida di esempio · Capitolo 2. Cosa trovi nel libro');

    // This chapter: exercises off by default, solutions on but waiting for them.
    const exercises = page.getByRole('switch', { name: 'Esercizi alla fine del capitolo' });
    await expect(exercises).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByRole('switch', { name: 'Soluzioni' })).toBeDisabled();
    await expect(page.getByRole('switch', { name: 'Formulario in fondo' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Tutto il libro' }).click();
    await expect(page).toHaveURL(/\/stampa\/libro\?da=nel-libro&return=/);
    await expect(page.locator('.print-cover-title')).toBeVisible();

    await page.getByRole('switch', { name: 'Esercizi alla fine di ogni capitolo' }).click();
    await page.getByRole('group', { name: 'Quanti per capitolo' }).getByRole('button', { name: '3' }).click();
    await page.getByRole('switch', { name: 'Soluzioni' }).click();
    await expect(page).toHaveURL(/esercizi=3/);
    await expect(page).toHaveURL(/soluzioni=0/);
    await expect(page.locator('.print-sheet .print-solutions')).toHaveCount(0);

    // A reload keeps the options.
    await page.reload(PRINT_GOTO_OPTIONS);
    await expect(page.getByRole('switch', { name: 'Esercizi alla fine di ogni capitolo' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('switch', { name: 'Soluzioni' })).toHaveAttribute('aria-checked', 'false');

    // Back to this chapter: the exercise settings come along.
    await page.getByRole('button', { name: 'Questo capitolo' }).click();
    await expect(page).toHaveURL(/\/stampa\/capitolo\/nel-libro\?esercizi=3&soluzioni=0&return=/);
    await page.getByRole('link', { name: 'Torna al libro' }).click();
    await expect(page).toHaveURL(/\/libro\/esempio\/capitolo\/nel-libro$/);
  });

  test('with no chapter chosen the sheet says what to do and printing waits', async ({ page }) => {
    await page.goto('/libro/esempio/stampa/libro', PRINT_GOTO_OPTIONS);
    await page.getByRole('button', { name: 'Deseleziona tutti' }).click();
    await expect(page).toHaveURL(/capitoli=(&|$)/);
    await expect(page.locator('.print-message')).toContainText('Scegli almeno un capitolo');
    await expect(page.getByRole('button', { name: 'Stampa o salva PDF' })).toBeDisabled();
    await page.getByRole('checkbox', { name: /Prova tu/ }).check();
    await expect(page.locator('.print-chapter-title')).toHaveText(['Prova tu']);
    await expect(page.getByRole('button', { name: 'Seleziona tutti' })).toBeVisible();
  });

  test('invalid options fall back to the defaults', async ({ page }) => {
    await page.goto('/libro/esempio/stampa/libro?capitoli=9,x&esercizi=7&formulario=forse&soluzioni=2', PRINT_GOTO_OPTIONS);
    await expect(page.locator('.print-chapter-title')).toHaveCount(3);
    await expect(page.getByRole('switch', { name: 'Esercizi alla fine di ogni capitolo' })).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByRole('switch', { name: 'Formulario in fondo' })).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByRole('switch', { name: 'Soluzioni' })).toHaveAttribute('aria-checked', 'true');
  });

  test('exercises print the questions, then the solutions under the same ids', async ({ page }) => {
    await page.goto('/libro/esempio/stampa/esercizi?capitolo=tutti', PRINT_GOTO_OPTIONS);
    const sheet = page.locator('.print-sheet');
    await expect(sheet.locator('.print-exercises-title')).toHaveText([/^Capitolo 1\./, /^Capitolo 2\./, /^Capitolo 3\./]);
    await expect(sheet.locator('.print-solution-id')).toHaveText(['E1.1', 'E2.1', 'E3.1']);
    await expect(sheet.getByText('Suggerimento', { exact: true })).toHaveCount(0);
    // The only option here is the solutions switch.
    await expect(page.getByRole('switch')).toHaveCount(1);
    await page.getByRole('switch', { name: 'Soluzioni' }).click();
    await expect(page).toHaveURL(/capitolo=tutti&soluzioni=0/);
    await expect(sheet.locator('.print-solutions')).toHaveCount(0);
    await expect(sheet.locator('.exercise-card')).toHaveCount(3);
  });

  test('the formula sheet has no options panel', async ({ page }) => {
    await page.goto('/libro/esempio/stampa/formulario', PRINT_GOTO_OPTIONS);
    await expect(page.locator('.print-sheet')).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Opzioni di stampa' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Opzioni' })).toHaveCount(0);
  });

  test('on a phone the options open in a sheet that keeps and returns focus', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/libro/esempio/stampa/capitolo/nel-libro', PRINT_GOTO_OPTIONS);
    await expect(page.getByRole('complementary', { name: 'Opzioni di stampa' })).toHaveCount(0);
    const opener = page.getByRole('button', { name: 'Opzioni' });
    await opener.click();
    const dialog = page.getByRole('dialog', { name: 'Opzioni di stampa' });
    await expect(dialog).toBeVisible();
    await expect(opener).toHaveAttribute('aria-expanded', 'true');
    // Tab stays inside the sheet.
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }
    await dialog.getByRole('switch', { name: 'Esercizi alla fine del capitolo' }).click();
    await expect(dialog.getByRole('status')).toContainText('Capitolo 2 · 1 esercizio');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
    await opener.click();
    await page.getByRole('button', { name: 'Mostra anteprima' }).click();
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
    await expect(page.locator('.print-sheet .print-exercises-title')).toHaveText('Esercizi del capitolo 2');
  });

  test('back link returns to the chapter', async ({ page }) => {
    await page.goto('/libro/esempio/capitolo/nel-libro', PRINT_GOTO_OPTIONS);
    await page.getByRole('banner').getByRole('button', { name: 'Versione stampabile' }).click();
    await expect(page).toHaveURL(/\/stampa\/capitolo\/nel-libro/);
    await assertPrintPreview(page, PRINT_ROUTES[0]);
    await page.getByRole('link', { name: 'Torna al libro' }).click();
    await expect(page).toHaveURL(/\/libro\/esempio\/capitolo\/nel-libro$/);
  });
});

test.describe('Print preview of a book loaded one chapter at a time', () => {
  test.skip(process.env.VITE_PLATFORM_ENABLED !== 'true', 'Cloud books need the platform build.');

  test.beforeEach(async ({ page }) => {
    await preparePlatformShell(page);
    await page.route('**/api/catalog', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          books: [
            {
              id: 'nuvola',
              title: 'Libro in cloud',
              subject: 'Prova',
              access: 'public',
              delivery: 'cloud',
              chapters: [
                { id: 'primo', number: 1, title: 'Primo', file: '01-primo.md' },
                { id: 'secondo', number: 2, title: 'Secondo', file: '02-secondo.md' },
              ],
            },
          ],
        }),
      }),
    );
    await page.route('**/api/books/nuvola/chapters/*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          smartbook_id: 'nuvola',
          chapter_id: 'primo',
          markdown: '---\nchapter: 1\ntitle: Primo\n---\n\n## p1 | Inizio\n\nUn paragrafo del primo capitolo.\n',
        }),
      }),
    );
  });

  test('prints this chapter only; the whole book is not offered', async ({ page }) => {
    await page.goto('/libro/nuvola/stampa/capitolo/primo', PRINT_GOTO_OPTIONS);
    await expect(page.locator('.print-sheet')).toContainText('Un paragrafo del primo capitolo.');
    await expect(page.getByRole('button', { name: 'Stampa o salva PDF' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Tutto il libro' })).toHaveCount(0);
    await page.goto('/libro/nuvola/stampa/libro', PRINT_GOTO_OPTIONS);
    await expect(page.locator('.print-message')).toContainText('un capitolo alla volta');
    await expect(page.locator('.print-sheet')).toHaveCount(0);
  });
});

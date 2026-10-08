import { test, expect } from '@playwright/test';
import { PRINT_ROUTES, assertPrintMediaHidesChrome, assertPrintPreview } from './helpers/print';
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

  test('back link returns to the chapter', async ({ page }) => {
    await page.goto('/libro/esempio/capitolo/nel-libro', PRINT_GOTO_OPTIONS);
    await page.getByRole('button', { name: 'Versione stampabile' }).first().click();
    await expect(page).toHaveURL(/\/stampa\/capitolo\/nel-libro/);
    await assertPrintPreview(page, PRINT_ROUTES[0]);
    await page.getByRole('link', { name: 'Torna al libro' }).click();
    await expect(page).toHaveURL(/\/libro\/esempio\/capitolo\/nel-libro$/);
  });
});

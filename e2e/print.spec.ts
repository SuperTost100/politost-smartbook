import { test, expect } from '@playwright/test';
import { PRINT_ROUTES, assertPrintPreview, assertNoParentStyleLeakage } from './helpers/print';
import { preparePlatformShell, PRINT_GOTO_OPTIONS } from './helpers/platform';

test.describe('Print preview', () => {
  test.beforeEach(async ({ page }) => {
    await preparePlatformShell(page);
  });

  for (const route of PRINT_ROUTES) {
    test(route.name, async ({ page }) => {
      await page.goto(route.url, PRINT_GOTO_OPTIONS);
      const pageCount = await assertPrintPreview(page, route);
      expect(pageCount).toBeGreaterThanOrEqual(route.minPages);
    });
  }

  test('no Paged.js style leakage after navigating between print routes', async ({ page }) => {
    await page.goto(PRINT_ROUTES[0].url, PRINT_GOTO_OPTIONS);
    await assertPrintPreview(page, PRINT_ROUTES[0]);

    await page.goto(PRINT_ROUTES[1].url, PRINT_GOTO_OPTIONS);
    await assertPrintPreview(page, PRINT_ROUTES[1]);

    await assertNoParentStyleLeakage(page);
  });
});

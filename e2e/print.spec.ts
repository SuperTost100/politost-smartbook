import { test, expect } from '@playwright/test';
import { PRINT_ROUTES, assertPrintPreview, assertNoParentStyleLeakage } from './helpers/print';

test.describe('Print preview', () => {
  for (const route of PRINT_ROUTES) {
    test(route.name, async ({ page }) => {
      await page.goto(route.url, { waitUntil: 'networkidle' });
      const pageCount = await assertPrintPreview(page, route);
      expect(pageCount).toBeGreaterThanOrEqual(route.minPages);
    });
  }

  test('no Paged.js style leakage after navigating between print routes', async ({ page }) => {
    await page.goto(PRINT_ROUTES[0].url, { waitUntil: 'networkidle' });
    await assertPrintPreview(page, PRINT_ROUTES[0]);

    await page.goto(PRINT_ROUTES[1].url, { waitUntil: 'networkidle' });
    await assertPrintPreview(page, PRINT_ROUTES[1]);

    await assertNoParentStyleLeakage(page);
  });
});

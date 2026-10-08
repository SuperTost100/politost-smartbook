import type { Page } from '@playwright/test';

/** Stub the platform API so preview builds do not hang on /api/*. */
export async function preparePlatformShell(page: Page): Promise<void> {
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
  );
  await page.route('**/api/consent/status', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
  );
  await page.route('**/api/catalog', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ books: [] }),
    }),
  );
  await page.route('**/api/books/*/chapters/*', (route) =>
    route.fulfill({ status: 404, contentType: 'application/json', body: '{"detail":"not found"}' }),
  );
  await page.route('**/api/books/*/manifest', (route) =>
    route.fulfill({ status: 404, contentType: 'application/json', body: '{"detail":"not found"}' }),
  );
  await page.route('**/api/books/*/access', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ has_license: true, authenticated: false }),
    }),
  );
}

export const PRINT_GOTO_OPTIONS = { waitUntil: 'load' as const };

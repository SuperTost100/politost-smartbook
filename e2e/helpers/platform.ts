import type { Page } from '@playwright/test';

const CC_COOKIE =
  '{"categories":["necessary","functional"],"revision":0,"data":null,"consentTimestamp":"2020-01-01T00:00:00.000Z","consentId":"e2e","services":{"necessary":[],"functional":[]},"lastConsentTimestamp":"2020-01-01T00:00:00.000Z","languageCode":"it","expirationTime":4102444800000}';

/** Dismiss cookie banner + stub platform API so preview builds do not hang on /api/*. */
export async function preparePlatformShell(page: Page): Promise<void> {
  await page.addInitScript((cookie) => {
    localStorage.setItem('cc_cookie', cookie);
  }, CC_COOKIE);
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

import { test, expect } from '@playwright/test';

// Auth UI is disabled in the OSS reader (ReaderConfig.features.auth === false).
test.describe.skip('Auth form', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('cc_cookie', '{"categories":["necessary","functional"],"revision":0,"data":null,"consentTimestamp":"2020-01-01T00:00:00.000Z","consentId":"e2e","services":{"necessary":[],"functional":[]},"lastConsentTimestamp":"2020-01-01T00:00:00.000Z"}');
    });
    await page.route('**/api/auth/me', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
    );
    await page.goto('/auth');
    await expect(page.locator('main#main-content')).toBeVisible();
  });

  test('login tab and submit button are distinct', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Accedi' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('form.auth-form').getByRole('button', { name: 'Accedi' })).toBeVisible();
  });

  test('register requires accepting terms', async ({ page }) => {
    await page.getByRole('tab', { name: 'Registrati' }).click();
    await page.getByLabel('Email').fill('nuovo@esempio.it');
    await page.getByLabel('Password').fill('password123');
    await page.locator('form.auth-form').getByRole('button', { name: 'Crea account' }).click();

    await expect(page.getByRole('alert')).toContainText('Devi accettare Termini e Privacy');
  });

  test('shows server error on invalid login', async ({ page }) => {
    await page.route('**/auth/jwt/login', (route) =>
      route.fulfill({ status: 400, contentType: 'text/plain', body: 'Credenziali non valide' }),
    );

    await page.getByLabel('Email').fill('sbagliato@esempio.it');
    await page.getByLabel('Password').fill('password123');
    await page.locator('form.auth-form').getByRole('button', { name: 'Accedi' }).click();

    await expect(page.getByRole('alert')).toContainText('Credenziali non valide');
  });

  test('successful login redirects home', async ({ page }) => {
    const user = {
      id: 'user-1',
      email: 'studente@esempio.it',
      display_name: null,
      is_admin: false,
    };

    let authed = false;
    await page.route('**/api/auth/me', (route) => {
      if (authed) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
      } else {
        route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
      }
    });
    await page.route('**/auth/jwt/login', (route) => {
      authed = true;
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.route('**/api/consent/status', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ has_consent: true }),
      }),
    );

    await page.goto('/auth');
    await expect(page.locator('form.auth-form')).toBeVisible();

    await page.locator('form.auth-form input[type="email"]').fill(user.email);
    await page.locator('form.auth-form input[type="password"]').fill('password123');
    await page.locator('form.auth-form').getByRole('button', { name: 'Accedi' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Smartbook disponibili' })).toBeVisible();
  });
});

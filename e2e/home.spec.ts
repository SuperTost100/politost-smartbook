import { test, expect } from '@playwright/test';

test.describe('Home', () => {
  test('shows catalog with builtin smartbooks', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Smartbook disponibili' })).toBeVisible();

    await expect(page.getByRole('link', { name: /Guida di esempio/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Guida di esempio/ })).toHaveCount(1);
  });

  test('shows ptsb upload area', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Hai un libro digitale?')).toBeVisible();
    await page.locator('.home-import-details').evaluate((el) => el.setAttribute('open', ''));
    await expect(page.getByRole('button', { name: 'Carica un file smartbook in formato ptsb' })).toBeVisible();
  });
});

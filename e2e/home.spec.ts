import { test, expect } from '@playwright/test';

test.describe('Home', () => {
  test('shows catalog with builtin smartbooks', async ({ page }) => {
    const platformRequests: string[] = [];
    page.on('request', (request) => {
      if (/\/(api|auth|users)\//.test(new URL(request.url()).pathname)) platformRequests.push(request.url());
    });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Smartbook disponibili' })).toBeVisible();

    await expect(page.getByRole('link', { name: /Guida di esempio/ })).toBeVisible();
    await expect(page.locator('.sb-book')).toHaveCount(1);
    if (process.env.VITE_PLATFORM_ENABLED !== 'true') {
      await expect(page.getByRole('link', { name: 'Accedi' })).toHaveCount(0);
      expect(platformRequests).toEqual([]);
    }
  });

  test('shows ptsb upload area', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Hai un libro digitale?')).toBeVisible();
    await expect(page.getByRole('button', { name: /file \.ptsb/ })).toBeVisible();
  });
});

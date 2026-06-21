import { test, expect } from '@playwright/test';

test.describe('Reader', () => {
  test('esempio chapter renders formulas and figure', async ({ page }) => {
    await page.goto('/libro/esempio/capitolo/nel-libro');
    await expect(page.getByRole('heading', { name: /Cosa trovi nel libro/ })).toBeVisible();

    await expect(page.locator('.numbered-formula').first()).toBeVisible();
    await expect(page.locator('.katex').first()).toBeVisible();

    const figure = page.locator('.smartbook-figure img').first();
    await expect(figure).toBeVisible();
    await expect(figure).toHaveAttribute('src', /cosa-trovi/);
  });

  test('formulario tab loads formula cards', async ({ page }) => {
    await page.goto('/libro/esempio/formulario');
    await expect(page.locator('.formulario-view')).toBeVisible();
    await expect(page.locator('.formulario-card').first()).toBeVisible();
    await expect(page.locator('.formulario-card .katex').first()).toBeVisible();
  });
});

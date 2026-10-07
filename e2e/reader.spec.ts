import { test, expect } from '@playwright/test';

test.describe('Reader', () => {
  test('esempio chapter renders formulas and figure', async ({ page }) => {
    await page.goto('/libro/esempio/capitolo/nel-libro');
    await expect(page.getByRole('heading', { name: /Cosa trovi nel libro/ })).toBeVisible();

    await expect(page.locator('.sb-formula').first()).toBeVisible();
    await expect(page.locator('.katex').first()).toBeVisible();

    const figure = page.locator('.sb-figure img').first();
    await expect(figure).toBeVisible();
    await expect(figure).toHaveAttribute('src', /cosa-trovi/);
  });

  test('formulario tab loads formula cards', async ({ page }) => {
    await page.goto('/libro/esempio/formulario');
    await expect(page.locator('.formulario-view')).toBeVisible();
    await expect(page.locator('.sb-fcard').first()).toBeVisible();
    await expect(page.locator('.sb-fcard .katex').first()).toBeVisible();
  });

  test('reader shell follows the theme after toggling on Home and reopening a book', async ({ page }) => {
    const siderMatchesTheme = () =>
      page.evaluate(() => {
        const sider = document.querySelector('.ant-pro-sider');
        const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
        const probe = document.createElement('div');
        probe.style.backgroundColor = bg;
        document.body.appendChild(probe);
        const want = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return sider ? getComputedStyle(sider).backgroundColor === want : false;
      });

    await page.goto('/libro/esempio/capitolo/benvenuto');
    await page.locator('.theme-toggle').click();
    await expect.poll(siderMatchesTheme).toBe(true);
    await page.locator('.sb-header-brand').click();
    await page.locator('.theme-toggle').click();
    await page.getByRole('link', { name: 'Apri Guida di esempio' }).click();
    await expect(page.locator('.ant-pro-sider')).toBeVisible();
    await expect.poll(siderMatchesTheme).toBe(true);
  });
});

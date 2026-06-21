import { test, expect } from '@playwright/test';
import { waitForPrintPagination } from './helpers/print';

test.describe('Accessibility landmarks', () => {
  test('home has a main landmark', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Smartbook disponibili' })).toBeVisible();
  });

  test.skip('auth page has a main landmark and tab panel', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page.getByRole('tablist', { name: 'Modalità accesso' })).toBeVisible();
    await expect(page.locator('#auth-panel[role="tabpanel"]')).toBeVisible();
  });

  test('reader chapter has a main landmark', async ({ page }) => {
    await page.goto('/libro/esempio/capitolo/nel-libro');
    await expect(page.locator('main.app-main')).toBeVisible();
  });

  test('formulario and exercises use main landmark', async ({ page }) => {
    await page.goto('/libro/esempio/formulario');
    await expect(page.locator('main.app-main')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Formulario' })).toBeVisible();

    await page.goto('/libro/esempio/esercizi');
    await expect(page.locator('main.app-main')).toBeVisible();
  });

  test('book navigation landmarks are labeled', async ({ page }) => {
    await page.goto('/libro/esempio/capitolo/nel-libro');
    await expect(page.getByRole('navigation', { name: 'Sezioni del libro' })).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Indice capitoli' })).toBeVisible();
  });

  test('print preview has a main landmark', async ({ page }) => {
    await page.goto('/libro/esempio/stampa/capitolo/nel-libro', { waitUntil: 'networkidle' });
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page.locator('.print-preview-frame')).toBeVisible();
  });

  test('print preview toolbar has labeled actions', async ({ page }) => {
    await page.goto('/libro/esempio/stampa/capitolo/nel-libro', { waitUntil: 'networkidle' });
    await expect(page.getByRole('banner', { name: 'Barra strumenti anteprima di stampa' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Torna al libro' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Stampa' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Attiva tema scuro' })).toBeVisible();
  });

  test('cookie consent banner exposes labeled actions', async ({ page, context }) => {
    await context.clearCookies();
    await page.addInitScript(() => {
      localStorage.removeItem('cc_cookie');
    });
    await page.goto('/');
    await expect(page.locator('#cc-main .cm__title')).toHaveText('Utilizziamo i cookie');
    await expect(page.getByRole('button', { name: 'Accetta tutti' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Solo necessari' })).toBeVisible();
  });
});

test.describe('Dark mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('politost-theme', 'light');
    });
  });

  test('theme toggle updates CSS tokens on home', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    const lightBg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim(),
    );
    expect(lightBg).toBe('#f0f2f7');

    await page.getByRole('button', { name: 'Attiva tema scuro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    const darkBg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim(),
    );
    expect(darkBg).toBe('#0b0f19');
  });

  test('theme toggle updates body colors on reader', async ({ page }) => {
    await page.goto('/libro/esempio/capitolo/nel-libro');
    await page.getByRole('button', { name: 'Attiva tema scuro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await expect
      .poll(async () =>
        page.evaluate(() => getComputedStyle(document.body).backgroundColor),
      )
      .toBe('rgb(11, 15, 25)');

    const textColor = await page.evaluate(() => {
      const paragraph = document.querySelector('.content-paragraph');
      return paragraph ? getComputedStyle(paragraph).color : getComputedStyle(document.body).color;
    });
    expect(textColor).toBe('rgb(228, 232, 241)');
  });

  test('formulario and difficulty badges stay readable in dark mode', async ({ page }) => {
    await page.goto('/libro/esempio/formulario');
    await page.getByRole('button', { name: 'Attiva tema scuro' }).click();

    const formulaColor = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.formulario-card-body .katex')!).color,
    );
    expect(formulaColor).toBe('rgb(228, 232, 241)');

    await page.goto('/libro/esempio/esercizi');
    await page.getByRole('button', { name: 'Attiva tema scuro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const badge = page.locator('.difficulty').first();
    if (await badge.count()) {
      const badgeColor = await badge.evaluate((el) => getComputedStyle(el).color);
      expect(badgeColor).not.toBe('rgb(0, 0, 0)');
    }
  });

  test('theme toggle updates print preview shell in dark mode', async ({ page }) => {
    await page.goto('/libro/esempio/stampa/capitolo/nel-libro', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Attiva tema scuro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await expect
      .poll(async () =>
        page.evaluate(() => getComputedStyle(document.querySelector('.print-page-shell')!).backgroundColor),
      )
      .toBe('rgb(11, 15, 25)');

    const titleColor = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.print-toolbar-title')!).color,
    );
    expect(titleColor).toBe('rgb(228, 232, 241)');

    await waitForPrintPagination(page);
    const frameShadow = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.print-preview-frame')!).boxShadow,
    );
    expect(frameShadow).toContain('rgba(255, 255, 255, 0.06)');
  });
});

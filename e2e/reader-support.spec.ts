import { test, expect } from '@playwright/test';
import { preparePlatformShell } from './helpers/platform';

const chapter = '/libro/esempio/capitolo/benvenuto';

test.beforeEach(async ({ page }) => {
  await preparePlatformShell(page);
});

test('promotions stay inside books, rotate on reopening and never contact destinations', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => {
    if (/tiktok|t\.me|politost\.it\/pyxis|google-analytics|googletagmanager|googlesyndication|fundingchoices/.test(request.url())) external.push(request.url());
  });
  await page.goto('/');
  await expect(page.getByRole('complementary', { name: 'Promozione PoliTost' })).toHaveCount(0);
  await page.goto(chapter);
  const banner = page.getByRole('complementary', { name: 'Promozione PoliTost' });
  await expect(banner.getByRole('link')).toHaveAttribute('href', 'https://politost.it/pyxis/');
  await page.getByTitle('Formulario', { exact: true }).click();
  await expect(banner.getByRole('link')).toHaveAttribute('href', 'https://politost.it/pyxis/');
  await page.locator('.sb-header-brand').click();
  await expect(banner).toHaveCount(0);
  await page.getByRole('link', { name: 'Apri Guida di esempio' }).click();
  await expect(banner.getByRole('link')).toHaveAttribute('href', 'https://t.me/politost_community');
  await page.locator('.sb-header-brand').click();
  await page.getByRole('link', { name: 'Apri Guida di esempio' }).click();
  await expect(banner.getByRole('link')).toHaveAttribute('href', 'https://www.tiktok.com/@politost');
  expect(external).toEqual([]);
});

test('dismissal survives navigation and reload, with no banner in print', async ({ page }) => {
  await page.goto(chapter);
  const banner = page.getByRole('complementary', { name: 'Promozione PoliTost' });
  await banner.getByRole('button', { name: 'Chiudi la promozione per questa sessione' }).click();
  await expect(banner).toHaveCount(0);
  await expect(page.locator('#main-content')).toBeFocused();
  await page.reload();
  await expect(page.locator('.smartbook-view')).toBeVisible();
  await expect(banner).toHaveCount(0);
  await page.goto('/libro/esempio/stampa/capitolo/benvenuto');
  await expect(page.locator('.print-sheet')).toBeVisible();
  await expect(banner).toHaveCount(0);
});

test('mobile banner reserves space, exposes privacy controls and disappears from print', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(chapter);
  const banner = page.getByRole('complementary', { name: 'Promozione PoliTost' });
  await expect(banner).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const support = document.querySelector('.reader-support')!;
    return parseFloat(getComputedStyle(document.querySelector('.site-footer')!).paddingBottom) >= support.getBoundingClientRect().height;
  })).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const cta = banner.getByRole('link');
  expect(await cta.evaluate((node) => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  await banner.getByRole('button', { name: 'Preferenze privacy', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Le tue preferenze privacy' })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Statistiche con Google Analytics' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.emulateMedia({ media: 'print' });
  await expect(banner).toBeHidden();
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.site-footer')!).paddingBottom)).toBe('0px');
});

test('the install prompt is captured in a book and shown only on the catalog', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(chapter);
  await expect(page.locator('.reader-support')).toBeVisible();
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(event, { prompt: async () => undefined, userChoice: Promise.resolve({ outcome: 'dismissed' }) });
    window.dispatchEvent(event);
    window.scrollTo({ top: 300, behavior: 'instant' });
    window.dispatchEvent(new Event('scroll'));
  });
  await expect(page.getByRole('region', { name: "Installa l'app" })).toHaveCount(0);
  await page.locator('.sb-header-brand').click();
  await expect(page.getByRole('button', { name: 'Aggiungi alla Home' })).toBeVisible();
  await page.getByRole('button', { name: 'Aggiungi alla Home' }).click();
  await expect(page.getByRole('region', { name: "Installa l'app" })).toHaveCount(0);
});

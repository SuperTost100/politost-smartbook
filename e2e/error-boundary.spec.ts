import { test, expect } from '@playwright/test';
import { preparePlatformShell } from './helpers/platform';

test.use({ serviceWorkers: 'block' });

test('a lab chunk that fails to load shows a way out instead of a blank page', async ({ page }) => {
  await preparePlatformShell(page);
  // What a student sees offline, or after a deploy replaced the chunk.
  await page.route(/\/assets\/IdeView-[^/]+\.js$/, (route) => route.abort());

  await page.goto('/libro/esempio/capitolo/nel-libro');
  await expect(page.getByRole('heading', { name: /Cosa trovi nel libro/ })).toBeVisible();
  await page.locator('nav[aria-label="Sezioni del libro"] a[href$="/laboratorio"]').first().click();

  await expect(page.getByRole('heading', { name: 'Non riesco a mostrare questa pagina' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Riprova' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Torna alla libreria' })).toBeVisible();

  // Leaving the broken page clears the error.
  await page.goBack();
  await expect(page.getByRole('heading', { name: /Cosa trovi nel libro/ })).toBeVisible();

  await page.locator('nav[aria-label="Sezioni del libro"] a[href$="/laboratorio"]').first().click();
  await page.getByRole('link', { name: 'Torna alla libreria' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'I tuoi libri' })).toBeVisible();
});

import { test, expect, type Page } from '@playwright/test';
import { preparePlatformShell, PRINT_GOTO_OPTIONS } from './helpers/platform';

const index = (page: Page) => page.getByRole('navigation', { name: 'Esercizi per capitolo' });
const filter = (page: Page) => page.getByRole('group', { name: 'Difficoltà' });
const title = (page: Page) => page.getByRole('heading', { level: 1 });

test.describe('Exercises by chapter', () => {
  test.beforeEach(async ({ page }) => {
    await preparePlatformShell(page);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('the section opens on the first chapter with exercises and names it', async ({ page }) => {
    await page.goto('/libro/esempio/esercizi');
    await expect(page).toHaveURL(/\/esercizi\?capitolo=1$/);
    await expect(title(page)).toHaveText('Benvenuto');
    await expect(page.locator('.sb-chhead .sb-eyebrow')).toHaveText('Capitolo 1');
    await expect(index(page).locator('[aria-current="page"]')).toContainText('Benvenuto');
    await expect(page.locator('.sb-ex')).toHaveCount(1);
    await expect(page).toHaveTitle('1. Benvenuto · Esercizi · Guida di esempio · PoliTost Smartbook');
  });

  test('the section opens on the chapter the student was reading', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('politost-last-read', JSON.stringify({
        esempio: { chapterId: 'prova-tu', chapterNumber: 3, chapterTitle: 'Prova tu', readAt: 1 },
      }));
    });
    await page.goto('/libro/esempio/formulario');
    await page.getByRole('navigation', { name: 'Sezioni del libro' }).getByRole('link', { name: 'Esercizi' }).click();
    await expect(page).toHaveURL(/\/esercizi\?capitolo=3$/);
    await expect(title(page)).toHaveText('Prova tu');
  });

  test('the difficulty stays on across chapters, and an empty chapter offers to show every level', async ({ page }) => {
    await page.goto('/libro/esempio/esercizi?capitolo=1');
    await filter(page).getByRole('button', { name: /Facile/ }).click();
    await expect(page).toHaveURL(/capitolo=1&difficolta=facile$/);
    await expect(filter(page).getByRole('button', { name: /Facile/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(filter(page).getByRole('button', { name: /Facile/ })).toBeFocused();

    await index(page).getByRole('link', { name: /Prova tu/ }).click();
    await expect(page).toHaveURL(/capitolo=3&difficolta=facile$/);
    await expect(title(page)).toBeFocused();
    await expect(page.getByText('Nessun esercizio di livello facile in questo capitolo.')).toBeVisible();
    await page.getByRole('button', { name: 'Mostra tutte le difficoltà' }).click();
    await expect(page).toHaveURL(/capitolo=3$/);
    await expect(page.locator('[id="ex-E3.1"]')).toBeVisible();
    await expect(filter(page).getByRole('button', { name: /Tutte/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(filter(page).getByRole('button', { name: /Tutte/ })).toBeFocused();
  });

  test('the pager moves between chapters and the back button returns', async ({ page }) => {
    await page.goto('/libro/esempio/esercizi?capitolo=1&difficolta=facile');
    const pager = page.getByRole('navigation', { name: 'Altri capitoli' });
    await expect(pager.getByRole('link')).toHaveCount(1);
    await pager.getByRole('link', { name: /Capitolo successivo · 1 esercizio/ }).click();
    await expect(page).toHaveURL(/capitolo=2&difficolta=facile$/);
    await expect(title(page)).toHaveText('Cosa trovi nel libro');
    await page.goBack();
    await expect(page).toHaveURL(/capitolo=1&difficolta=facile$/);
    await expect(title(page)).toHaveText('Benvenuto');
  });

  test('a link to one exercise opens its chapter without the difficulty filter', async ({ page }) => {
    await page.goto('/libro/esempio/esercizi?capitolo=1&difficolta=facile#ex-E3.1');
    await expect(page).toHaveURL(/\/esercizi\?capitolo=3#ex-E3\.1$/);
    await expect(page.locator('[id="ex-E3.1"]')).toBeInViewport();
  });

  test('"Tutti" groups every exercise under its chapter', async ({ page }) => {
    await page.goto('/libro/esempio/esercizi?capitolo=tutti');
    await expect(title(page)).toHaveText('Esercizi');
    await expect(page.locator('.sb-exgroup-head')).toHaveText([/Benvenuto/, /Cosa trovi nel libro/, /Prova tu/]);
    await expect(page.locator('.sb-ex')).toHaveCount(3);
    await expect(index(page).getByRole('link', { name: /Tutti/ })).toHaveAttribute('aria-current', 'page');
    await expect(page).toHaveTitle('Esercizi · Guida di esempio · PoliTost Smartbook');
  });

  test('exam questions are one list with the difficulty filter and no index', async ({ page }) => {
    await page.goto('/libro/esempio/esami');
    await expect(title(page)).toHaveText("Prove d'esame");
    await expect(index(page)).toHaveCount(0);
    await expect(page.locator('.sb-ex')).toHaveCount(1);
    await filter(page).getByRole('button', { name: /Medio/ }).click();
    await expect(page).toHaveURL(/\/esami\?difficolta=medio$/);
    await expect(page.locator('[id="ex-X1"]')).toBeVisible();
  });

  test('printing prints the chapter and the difficulty on screen', async ({ page }) => {
    await page.goto('/libro/esempio/esercizi?capitolo=3&difficolta=medio');
    await page.getByRole('banner').getByRole('button', { name: 'Versione stampabile' }).click();
    await expect(page).toHaveURL(/\/stampa\/esercizi\?capitolo=3&difficolta=medio&return=/);
    const sheet = page.locator('.print-sheet');
    await expect(sheet.locator('.print-opener-title')).toHaveText('Esercizi · Capitolo 3. Prova tu · Livello medio');
    await expect(sheet.locator('.exercise-card')).toHaveCount(1);
    await expect(sheet.locator('[id="ex-E3.1"]')).toBeVisible();
    await page.getByRole('link', { name: 'Torna al libro' }).click();
    await expect(page).toHaveURL(/\/esercizi\?capitolo=3&difficolta=medio$/);
  });

  test('the end of a chapter links its exercises, and the last one the exam questions', async ({ page }) => {
    await page.goto('/libro/esempio/capitolo/benvenuto', PRINT_GOTO_OPTIONS);
    const practice = page.getByRole('navigation', { name: 'Esercitati' });
    await expect(practice.getByRole('link')).toHaveCount(1);
    await page.goto('/libro/esempio/capitolo/prova-tu', PRINT_GOTO_OPTIONS);
    await expect(practice.getByRole('link')).toHaveText([/Esercizi di questo capitolo/, /Prove d'esame/]);
    await practice.getByRole('link', { name: /Esercizi di questo capitolo.*1 esercizio/ }).click();
    await expect(page).toHaveURL(/\/esercizi\?capitolo=3$/);
    await expect(title(page)).toHaveText('Prova tu');
  });

  test('page headers have no print button; the top bar keeps it', async ({ page }) => {
    for (const path of ['/libro/esempio/capitolo/benvenuto', '/libro/esempio/formulario', '/libro/esempio/esercizi?capitolo=1', '/libro/esempio/esami']) {
      await page.goto(path);
      await expect(title(page)).toBeVisible();
      await expect(page.locator('.sb-chhead').getByRole('button', { name: 'Versione stampabile' })).toHaveCount(0);
      await expect(page.getByRole('banner').getByRole('button', { name: 'Versione stampabile' })).toBeVisible();
    }
  });
});

test.describe('Exercises by chapter on a phone', () => {
  test.beforeEach(async ({ page }) => {
    await preparePlatformShell(page);
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test('the chapter control and the menu button open the exercise index', async ({ page }) => {
    await page.goto('/libro/esempio/esercizi?capitolo=1');
    const picker = page.getByRole('button', { name: /^Capitolo 1 di 3.*scegli il capitolo/ });
    await expect(picker).toHaveAttribute('aria-expanded', 'false');
    await picker.click();
    // antd names the drawer after its title, the book.
    const drawer = page.getByRole('dialog', { name: 'Guida di esempio' });
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('[aria-current="page"]')).toBeFocused();
    await drawer.getByRole('link', { name: /Cosa trovi nel libro/ }).click();
    await expect(page).toHaveURL(/capitolo=2$/);
    await expect(drawer).toBeHidden();
    // Focus returns to the control, which now names the new chapter.
    await expect(page.getByRole('button', { name: /^Capitolo 2 di 3.*scegli il capitolo/ })).toBeFocused();

    await page.getByRole('button', { name: 'Apri indice esercizi' }).click();
    await expect(drawer).toBeVisible();
    await drawer.getByRole('link', { name: /Tutti/ }).click();
    await expect(page).toHaveURL(/capitolo=tutti$/);
    await expect(page.getByRole('button', { name: /^Tutti i capitoli.*scegli il capitolo/ })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBe(false);
  });
});

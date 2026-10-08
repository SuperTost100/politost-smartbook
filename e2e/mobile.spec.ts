import { test, expect } from '@playwright/test';

async function assertNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth > root.clientWidth + 1;
  });
  expect(overflow).toBe(false);
}

test.describe('Mobile (iPhone 13 viewport)', () => {
  test('home catalog renders in single column without horizontal scroll', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Smartbook disponibili' })).toBeVisible();

    const columnCount = await page.locator('.book-grid').evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length,
    );
    expect(columnCount).toBe(1);

    await assertNoHorizontalOverflow(page);
  });

  test('chapter content is visible without scrolling past chapter drawer chrome', async ({ page }) => {
    await page.goto('/libro/esempio/capitolo/nel-libro');

    await expect(page.getByRole('button', { name: /Apri indice capitoli/ })).toBeVisible();
    await expect(page.locator('.smartbook-view .paragraph-section').first()).toBeVisible();

    const contentBox = await page.locator('.smartbook-view .paragraph-section').first().boundingBox();
    const viewport = page.viewportSize();
    expect(contentBox).toBeTruthy();
    expect(viewport).toBeTruthy();
    if (contentBox && viewport) {
      expect(contentBox.y).toBeLessThan(viewport.height * 0.7);
    }

    await assertNoHorizontalOverflow(page);
  });

  test('formulario loads without horizontal scroll', async ({ page }) => {
    await page.goto('/libro/esempio/formulario');
    await expect(page.locator('.formulario-view')).toBeVisible();
    await expect(page.locator('.sb-fcard').first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test('ptsb upload control is present and clickable', async ({ page }) => {
    await page.goto('/');
    const upload = page.getByRole('button', { name: /file \.ptsb/ });
    await expect(upload).toBeVisible();
    await expect(upload).toBeEnabled();

    const box = await upload.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(40);
      expect(box.width).toBeGreaterThanOrEqual(40);
    }
  });

  test('hides the lab but keeps graphs in the section nav', async ({ page }) => {
    await page.goto('/libro/esempio/capitolo/nel-libro');
    // on phones the section switcher lives in the drawer next to the chapter index
    await page.getByRole('button', { name: /Apri indice capitoli/ }).click();
    const sectionNav = page.getByRole('navigation', { name: 'Sezioni del libro' });
    await expect(sectionNav.getByRole('link', { name: 'Formulario' })).toBeVisible();
    await expect(sectionNav.getByRole('link', { name: 'Laboratorio' })).toHaveCount(0);
    await sectionNav.getByRole('link', { name: 'Grafici & Calcoli' }).click();
    await expect(page.locator('.js-plotly-plot')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    // a finger on the plot scrolls the page until the graph tools are on
    const dragmode = () => page.locator('.js-plotly-plot').evaluate((el) => (el as unknown as { _fullLayout: { dragmode: unknown } })._fullLayout.dragmode);
    expect(await dragmode()).toBe(false);
    await page.getByRole('button', { name: 'Strumenti grafico' }).click();
    await expect.poll(dragmode).not.toBe(false);
  });

  test('serves web app manifest for PWA install', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.ok()).toBeTruthy();
    expect(res.headers()['content-type']).toMatch(/manifest|json/);

    const manifest = await res.json();
    expect(manifest.name).toBe('Politost Smartbook');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons?.length).toBeGreaterThan(0);
    expect(manifest.start_url).toBe('/');
  });
});

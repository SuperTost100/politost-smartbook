import { test, expect } from '@playwright/test';

async function assertNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth > root.clientWidth + 1;
  });
  expect(overflow).toBe(false);
}

test.describe('Mobile (iPhone 13 viewport)', () => {
  test('home catalog renders in two columns without horizontal scroll', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'I tuoi libri', exact: true })).toBeVisible();

    const columnCount = await page.locator('.book-grid').evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length,
    );
    expect(columnCount).toBe(2);

    await assertNoHorizontalOverflow(page);
  });

  test('the resume button stays inside its book card', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('politost-last-read', JSON.stringify({
        esempio: { chapterId: 'nel-libro', chapterNumber: 2, chapterTitle: 'Cosa trovi nel libro', paragraphId: 'p3', readAt: 1 },
      }));
    });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const card = page.locator('.sb-book').filter({ has: page.locator('.sb-book-foot') }).first();
    const [cardBox, buttonBox] = await Promise.all([card.boundingBox(), card.locator('.sb-book-foot .sb-btn').first().boundingBox()]);
    expect(cardBox && buttonBox).toBeTruthy();
    if (cardBox && buttonBox) expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width);
  });

  test('a tapped formula reference opens the formula in the formulario', async ({ page }) => {
    await page.goto('/libro/esempio/capitolo/nel-libro');
    await page.locator('.sb-fref-chip').first().tap();
    await page.getByRole('button', { name: 'Apri nel formulario' }).tap();
    await expect(page).toHaveURL(/\/libro\/esempio\/formulario#2\.1$/);
  });

  test('a formula popover keeps 16px from both screen edges', async ({ page }) => {
    await page.goto('/libro/esempio/capitolo/nel-libro');
    // Push the first reference to the right edge, where antd shifts the popover to fit.
    await page.addStyleTag({ content: '.sb-fref-chip { display: block; width: fit-content; margin-left: auto; }' });
    await page.locator('.sb-fref-chip').first().tap();
    const card = page.locator('.ant-popover-container').first();
    await expect(card).toBeVisible();
    const width = page.viewportSize()!.width;
    // The popover slides into place, so poll until it settles.
    const right = async () => {
      const box = await card.boundingBox();
      return box ? box.x + box.width : Infinity;
    };
    await expect.poll(right, { timeout: 3000 }).toBeLessThanOrEqual(width - 16);
    expect((await card.boundingBox())!.x).toBeGreaterThanOrEqual(16);
  });

  test('chapter labels in the formula sheet stay on one line', async ({ page }) => {
    await page.goto('/libro/esempio/formulario');
    const label = page.locator('.sb-fcard-head .sb-eyebrow').first();
    await expect(label).toBeVisible();
    await expect(label).toHaveCSS('white-space', 'nowrap');
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
    // on phones the section switcher is a bar at the bottom of the screen
    const sectionNav = page.getByRole('navigation', { name: 'Sezioni del libro' });
    // iOS Safari stops painting a fixed bar inside the sticky header while scrolling, so it lives outside it.
    expect(await sectionNav.evaluate((el) => el.closest('.sb-rtop') === null)).toBe(true);
    // ...but it still comes before the chapter in keyboard order.
    expect(await sectionNav.evaluate((el) => !!(el.compareDocumentPosition(document.getElementById('main-content')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
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

  for (const width of [390, 360]) {
    test(`the section bar fits ${width}px wide, without scrolling, and keeps the full labels`, async ({ page }) => {
      await page.setViewportSize({ width, height: 780 });
      await page.goto('/libro/esempio/capitolo/nel-libro');
      const nav = page.getByRole('navigation', { name: 'Sezioni del libro' });
      const links = nav.getByRole('link');
      await expect(links).toHaveCount(5);
      expect(await nav.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
      for (const box of await links.evaluateAll((els) => els.map((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right, textFits: el.querySelector('span')!.scrollWidth <= el.querySelector('span')!.clientWidth };
      }))) {
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(width);
        expect(box.textFits).toBe(true);
      }
      // the full label is the accessible name; the short one is what shows
      for (const [name, shown] of [['Capitoli', 'Capitoli'], ['Formulario', 'Formule'], ['Esercizi', 'Esercizi'], ["Prove d'esame", 'Esami'], ['Grafici & Calcoli', 'Grafici']]) {
        await expect(nav.getByRole('link', { name, exact: true })).toHaveText(shown);
      }
    });
  }

  test('the install prompt is captured in a book and shown only on the catalog', async ({ page }) => {
    await page.goto('/libro/esempio/capitolo/benvenuto');
    await expect(page.locator('.smartbook-view')).toBeVisible();
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
  });

  test('serves web app manifest for PWA install', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.ok()).toBeTruthy();
    expect(res.headers()['content-type']).toMatch(/manifest|json/);

    const manifest = await res.json();
    expect(manifest.name).toBe('PoliTost Smartbook');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons?.length).toBeGreaterThan(0);
    // Relative to the manifest, so the app also installs from a subfolder such as /reader/.
    expect(new URL(manifest.start_url, res.url()).pathname).toBe('/');
    expect(new URL(manifest.scope, res.url()).pathname).toBe('/');
    for (const icon of manifest.icons as { src: string }[]) {
      expect((await request.get(new URL(icon.src, res.url()).href)).ok(), icon.src).toBeTruthy();
    }
  });
});

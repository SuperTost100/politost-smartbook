import { test, expect } from '@playwright/test';
import { preparePlatformShell } from './helpers/platform';

test.describe('Reader', () => {
  test.beforeEach(async ({ page }) => {
    await preparePlatformShell(page);
  });

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
        const sider = document.querySelector('.sb-toc');
        const bg = getComputedStyle(document.documentElement).getPropertyValue('--surface-raised').trim();
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
    await expect(page.locator('.sb-toc')).toBeVisible();
    await expect.poll(siderMatchesTheme).toBe(true);
  });

  test('hovering a formula reference previews the formula', async ({ page }) => {
    await page.goto('/libro/esempio/capitolo/nel-libro');
    await page.locator('.sb-fref-chip').first().hover();
    await expect(page.locator('.sb-fref-pop')).toBeVisible();
  });

  test('lists render bold and italic, not asterisks', async ({ page }) => {
    await page.goto('/libro/esempio/capitolo/benvenuto');
    const prose = page.locator('.sb-prose').first();
    await expect(prose).toBeVisible();
    await expect(page.locator('.sb-prose li strong').first()).toBeVisible();
    const text = await page.locator('#main-content').innerText();
    expect(text).not.toMatch(/\*\*?[^\s*][^*\n]*\*/);
  });

  test('graphs: side list, prev/next and the selected graph in the URL', async ({ page }) => {
    await page.goto('/libro/esempio/grafici');
    const list = page.getByRole('navigation', { name: 'Elenco grafici' });
    const title = page.locator('.sb-graph-head h2');
    await expect(list.getByRole('button')).toHaveCount(2);
    await expect(title).toHaveText('Curva di esempio');
    await expect(page.locator('.js-plotly-plot')).toBeVisible();

    await page.getByRole('button', { name: /Successivo/ }).click();
    await expect(title).toHaveText('Confronto valori');
    await expect(page).toHaveURL(/grafico=/);
    await expect(list.getByRole('button', { name: /Confronto valori/ })).toHaveAttribute('aria-current', 'true');

    await page.reload();
    await expect(title).toHaveText('Confronto valori');

    await list.getByRole('button', { name: /Curva di esempio/ }).click();
    await expect(title).toHaveText('Curva di esempio');
    await expect(page.getByRole('button', { name: /Precedente/ })).toHaveCount(0);
  });

  test('Home offers to resume where the reader left off', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /^Riprendi/ })).toHaveCount(0);

    await page.setViewportSize({ width: 1280, height: 700 });
    await page.goto('/libro/esempio/capitolo/nel-libro');
    await page.locator('#p3').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -80));
    await expect.poll(() => page.evaluate(() => localStorage.getItem('politost-last-read'))).toContain('"paragraphId":"p3"');

    await page.locator('.sb-header-brand').click();
    await expect(page.getByRole('heading', { level: 1, name: 'Cosa trovi nel libro' })).toBeVisible();
    await expect(page.getByText('L’ultima volta eri al paragrafo 2.3')).toBeVisible();
    const resume = page.getByRole('link', { name: 'Riprendi Guida di esempio: Capitolo 2 · Cosa trovi nel libro' });
    await expect(resume).toBeVisible();
    await resume.click();
    await expect(page).toHaveURL(/\/capitolo\/nel-libro#p3$/);
    await expect(page.locator('#p3')).toBeInViewport();

    await page.locator('.sb-header-brand').click();
    await page.getByRole('link', { name: 'Riprendi dal paragrafo 2.3' }).click();
    await expect(page).toHaveURL(/\/capitolo\/nel-libro#p3$/);
  });

  test('the chapter outline is listed once: on the right when it fits, in the index when it does not', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/libro/esempio/capitolo/nel-libro');
    await expect(page.getByRole('complementary', { name: 'Paragrafi del capitolo' })).toBeVisible();
    await expect(page.locator('.sb-toc-para')).toHaveCount(0);
    // The top of a chapter is 0 % read, not the first paragraph's share.
    await expect(page.locator('.sb-rail-progress')).toContainText('0 %');

    await page.setViewportSize({ width: 1200, height: 900 });
    await expect(page.getByRole('complementary', { name: 'Paragrafi del capitolo' })).toHaveCount(0);
    await expect(page.locator('.sb-toc-para').first()).toBeVisible();
  });

  test('the index and the outline stay below the header at the end of the page', async ({ page }) => {
    // Short enough that the panels fill the space between the header and the footer.
    await page.setViewportSize({ width: 1440, height: 260 });
    await page.goto('/libro/esempio/capitolo/nel-libro');
    await expect(page.locator('.sb-rail')).toBeVisible();
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    const headerBottom = await page.locator('.sb-rtop').evaluate((el) => el.getBoundingClientRect().bottom);
    for (const panel of ['.sb-toc', '.sb-rail']) {
      expect(await page.locator(panel).evaluate((el) => el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(headerBottom);
    }
  });

  test('the Capitoli tab returns to the chapter you were reading', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 700 });
    await page.goto('/libro/esempio/capitolo/prova-tu');
    await page.locator('#p2').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -80));
    await expect.poll(() => page.evaluate(() => localStorage.getItem('politost-last-read'))).toContain('"chapterId":"prova-tu"');

    await page.getByRole('navigation', { name: 'Sezioni del libro' }).getByRole('link', { name: 'Esercizi' }).click();
    await expect(page).toHaveURL(/\/esercizi/);
    await page.getByRole('navigation', { name: 'Sezioni del libro' }).getByRole('link', { name: 'Capitoli' }).click();
    await expect(page).toHaveURL(/\/capitolo\/prova-tu(#p2)?$/);
  });

  test('the Capitoli tab opens the first chapter when nothing is saved', async ({ page }) => {
    await page.goto('/libro/esempio/formulario');
    await page.getByRole('navigation', { name: 'Sezioni del libro' }).getByRole('link', { name: 'Capitoli' }).click();
    await expect(page).toHaveURL(/\/capitolo\/benvenuto$/);
  });

  test('Home resumes a position saved before paragraph titles were stored', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('politost-last-read', JSON.stringify({
        esempio: { chapterId: 'nel-libro', chapterNumber: 2, chapterTitle: 'Cosa trovi nel libro', paragraphId: 'p3' },
      }));
    });
    await page.goto('/');
    await expect(page.getByText('L’ultima volta eri a metà del capitolo.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Dall’inizio del capitolo' })).toHaveAttribute('href', '/libro/esempio/capitolo/nel-libro');
    await page.getByRole('link', { name: 'Riprendi da dove eri' }).click();
    await expect(page).toHaveURL(/\/capitolo\/nel-libro#p3$/);
  });

  for (const path of ['/docs', '/libro/esempio/laboratorio']) {
    test(`footer sits at the bottom edge: ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 1600 });
      await page.goto(path);
      await expect(page.locator('.site-footer')).toBeVisible();
      const gap = await page.evaluate(() => {
        const footer = document.querySelector('.site-footer')!.getBoundingClientRect();
        return Math.round(document.documentElement.scrollHeight - footer.bottom - window.scrollY);
      });
      expect(gap).toBe(0);
    });
  }

  test('theme choice survives a reload, with no cookie banner', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Accetta tutti' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Attiva tema scuro' }).click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('Ctrl+P opens the print preview of the current chapter', async ({ page }) => {
    await page.goto('/libro/esempio/capitolo/nel-libro');
    await expect(page.locator('.sb-prose').first()).toBeVisible();
    await page.keyboard.press('ControlOrMeta+p');
    await expect(page).toHaveURL(/\/stampa\/capitolo\/nel-libro/);
    await expect(page.locator('.print-sheet')).toBeVisible();
  });

  test('a function graph draws its curve and both graphs show axis titles', async ({ page }) => {
    await page.goto('/libro/esempio/grafici?grafico=sinusoide');
    await expect(page.locator('.scatterlayer path.js-line')).toHaveAttribute('d', /^M[\d.]+,[\d.]+L/);
    await expect(page.locator('.g-xtitle')).toHaveText('x');
    await page.goto('/libro/esempio/grafici?grafico=confronto');
    await expect(page.locator('.g-xtitle')).toHaveText('Giorno');
    await expect(page.locator('.g-ytitle')).toHaveText('Ore');
  });

  test('a formula reference in an exercise hint shows its number', async ({ page }) => {
    await page.goto('/libro/esempio/esercizi?capitolo=3');
    const card = page.locator('[id="ex-E3.1"]');
    await card.getByRole('button', { name: 'Mostra suggerimento' }).click();
    await expect(card.locator('.sb-reveal-hint')).toContainText('nella formula (3.1)');
  });

  test('the next chapter opens at the top', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 700 });
    await page.goto('/libro/esempio/capitolo/nel-libro');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.getByRole('link', { name: /Capitolo successivo/ }).click();
    await expect(page).toHaveURL(/capitolo\/prova-tu$/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect(page).toHaveTitle('3. Prova tu · Guida di esempio · PoliTost Smartbook');
  });

  test('changing section jumps to the top instead of sliding there', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 400 });
    await page.goto('/libro/esempio/capitolo/nel-libro');
    await expect(page.getByRole('heading', { name: /Cosa trovi nel libro/ })).toBeVisible();
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    const from = await page.evaluate(() => window.scrollY);
    expect(from).toBeGreaterThan(800);
    await page.evaluate(() => {
      const seen: number[] = [];
      (window as unknown as { __seen: number[] }).__seen = seen;
      window.addEventListener('scroll', () => seen.push(window.scrollY));
    });
    await page.getByRole('navigation', { name: 'Sezioni del libro' }).getByRole('link', { name: 'Formulario' }).click();
    await expect(page).toHaveURL(/\/formulario$/);
    await expect(page.locator('.formulario-view')).toBeVisible();
    await page.waitForTimeout(800);
    // A slide would leave positions between where the reader was and the top.
    const seen = await page.evaluate(() => (window as unknown as { __seen: number[] }).__seen);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect(seen.filter((y) => y > 0 && y < from - 50)).toEqual([]);
  });

  test('an unknown chapter, book or address each show the same notice with a way on', async ({ page }) => {
    await page.goto('/libro/esempio/capitolo/non-esiste');
    await expect(page.getByRole('heading', { level: 1, name: 'Capitolo non trovato' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Sezioni del libro' })).toBeVisible();
    await page.getByRole('link', { name: 'Vai al primo capitolo' }).click();
    await expect(page).toHaveURL(/\/capitolo\/benvenuto$/);

    for (const [path, title] of [['/libro/non-esiste', 'Smartbook non trovato'], ['/non-esiste', 'Pagina non trovata']]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByRole('contentinfo')).toBeVisible();
      await page.getByRole('link', { name: 'Torna alla libreria' }).click();
      await expect(page).toHaveURL(/\/$/);
    }
  });

  test('an unknown address shows a not-found page', async ({ page }) => {
    for (const path of ['/pagina-che-non-esiste', '/libro/esempio/sezione-che-non-esiste']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: 'Pagina non trovata' })).toBeVisible();
    }
  });

  test('book footer: copyright on the left edge, links on the right', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/libro/esempio/grafici');
    const footer = page.locator('.site-footer');
    await footer.scrollIntoViewIfNeeded();
    const edges = await footer.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const copy = el.querySelector('.site-footer-inner > span')!.getBoundingClientRect();
      const links = el.querySelector('.site-footer-links')!.getBoundingClientRect();
      return { left: Math.round(copy.left - box.left), right: Math.round(box.right - links.right) };
    });
    expect(edges.left).toBeLessThanOrEqual(40);
    expect(edges.right).toBeLessThanOrEqual(40);
  });
});

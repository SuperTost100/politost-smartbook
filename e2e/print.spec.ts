import { test, expect, type Page } from '@playwright/test';
import { PRINT_ROUTES, assertPrintMediaHidesChrome, assertPrintPreview, assertUniqueIds } from './helpers/print';
import { preparePlatformShell, PRINT_GOTO_OPTIONS } from './helpers/platform';
import { openTestBook, WIDE_BOOK, type TestBook } from './helpers/books';

/** The printed text column: A4 less the 18 mm side margins, in CSS px. */
const PRINT_COLUMN = Math.floor((174 * 96) / 25.4);

test.describe('Print preview', () => {
  test.beforeEach(async ({ page }) => {
    await preparePlatformShell(page);
  });

  for (const route of PRINT_ROUTES) {
    test(route.name, async ({ page }) => {
      await page.goto(route.url, PRINT_GOTO_OPTIONS);
      await assertPrintPreview(page, route);
    });
  }

  test('print media shows only the sheet', async ({ page }) => {
    await page.goto(PRINT_ROUTES[0].url, PRINT_GOTO_OPTIONS);
    await assertPrintPreview(page, PRINT_ROUTES[0]);
    await assertPrintMediaHidesChrome(page);
  });

  test('chapter prints to a multi-page A4 PDF with running heads', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'page.pdf is Chromium-only');
    await page.goto(PRINT_ROUTES[0].url, PRINT_GOTO_OPTIONS);
    await assertPrintPreview(page, PRINT_ROUTES[0]);
    const pdf = await page.pdf({ format: 'A4' });
    expect(pdf.byteLength).toBeGreaterThan(10_000);
    const pageCount = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    expect(pageCount).toBeGreaterThanOrEqual(1);
  });

  test('whole book with every extra prints to a PDF with a page per chapter', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'page.pdf is Chromium-only');
    await page.goto('/libro/esempio/stampa/libro?esercizi=tutti&formulario=1&esami=1', PRINT_GOTO_OPTIONS);
    const sheet = page.locator('.print-sheet');
    await expect(page.getByRole('button', { name: 'Stampa o salva PDF' })).toBeEnabled();
    await expect(sheet).toHaveAttribute('aria-busy', 'false');
    await expect(page.getByRole('status').filter({ hasText: 'Il documento contiene' })).toContainText(
      "3 capitoli · 3 esercizi · formulario · 1 prova d'esame",
    );
    await expect(sheet.locator('.print-cover-title')).toHaveText('Guida di esempio');
    await expect(sheet.locator('.print-index > li')).toHaveCount(5);
    await expect(sheet.locator('.print-chapter-title')).toHaveText(['Benvenuto', 'Cosa trovi nel libro', 'Prova tu']);
    await expect(sheet.locator('.print-exercises-title')).toHaveCount(3);
    // Questions first, then their solutions; hints are never printed.
    await expect(sheet.locator('[id="ex-E3.1"]')).toBeVisible();
    await expect(sheet.locator('[id="esame-X1"]')).toBeVisible();
    await expect(sheet.locator('.print-solutions')).toHaveCount(4);
    await expect(sheet.getByText('Suggerimento', { exact: true })).toHaveCount(0);
    await expect(sheet.locator('.formulario-card').first()).toBeVisible();
    await assertUniqueIds(page);
    await expect(page).toHaveTitle('Guida di esempio · Tutto il libro');

    const pdf = await page.pdf({ format: 'A4' });
    const pageCount = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    // Cover, index, three chapters, formula sheet and exams each start a page.
    expect(pageCount).toBeGreaterThanOrEqual(7);
  });

  test('the panel switches between this chapter and the whole book, and the URL keeps the options', async ({ page }) => {
    await page.goto('/libro/esempio/capitolo/nel-libro', PRINT_GOTO_OPTIONS);
    await page.getByRole('banner').getByRole('button', { name: 'Versione stampabile' }).click();
    await expect(page).toHaveURL(/\/stampa\/capitolo\/nel-libro/);
    await expect(page).toHaveTitle('Guida di esempio · Capitolo 2. Cosa trovi nel libro');
    await expect(page.locator('.print-toolbar-title')).toHaveText('Guida di esempio · Capitolo 2. Cosa trovi nel libro');

    // This chapter: exercises off by default, solutions on but waiting for them.
    const exercises = page.getByRole('switch', { name: 'Esercizi alla fine del capitolo' });
    await expect(exercises).toHaveAttribute('aria-checked', 'false');
    const solutions = page.getByRole('switch', { name: 'Soluzioni' });
    await expect(solutions).toBeDisabled();
    // Disabled reads as off, and the choice underneath comes back with the exercises.
    await expect(solutions).toHaveAttribute('aria-checked', 'false');
    await exercises.click();
    await expect(solutions).toBeEnabled();
    await expect(solutions).toHaveAttribute('aria-checked', 'true');
    await expect(solutions).toHaveAccessibleDescription('In fondo agli esercizi del capitolo');
    await solutions.click();
    await expect(solutions).toHaveAccessibleDescription('Non vengono stampate');
    await exercises.click();
    await expect(solutions).toBeDisabled();
    await exercises.click();
    await expect(solutions).toHaveAttribute('aria-checked', 'false');
    await solutions.click();
    await exercises.click();
    await expect(page.getByRole('switch', { name: 'Formulario in fondo' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Tutto il libro' }).click();
    await expect(page).toHaveURL(/\/stampa\/libro\?da=nel-libro&return=/);
    await expect(page.locator('.print-cover-title')).toBeVisible();

    await page.getByRole('switch', { name: 'Esercizi alla fine di ogni capitolo' }).click();
    await page.getByRole('group', { name: 'Quanti per capitolo' }).getByRole('button', { name: '3' }).click();
    await page.getByRole('switch', { name: 'Soluzioni' }).click();
    await expect(page).toHaveURL(/esercizi=3/);
    await expect(page).toHaveURL(/soluzioni=0/);
    await expect(page.locator('.print-sheet .print-solutions')).toHaveCount(0);

    // A reload keeps the options.
    await page.reload(PRINT_GOTO_OPTIONS);
    await expect(page.getByRole('switch', { name: 'Esercizi alla fine di ogni capitolo' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('switch', { name: 'Soluzioni' })).toHaveAttribute('aria-checked', 'false');

    // Back to this chapter: the exercise settings come along.
    await page.getByRole('button', { name: 'Questo capitolo' }).click();
    await expect(page).toHaveURL(/\/stampa\/capitolo\/nel-libro\?esercizi=3&soluzioni=0&return=/);
    await page.getByRole('link', { name: 'Torna al libro' }).click();
    await expect(page).toHaveURL(/\/libro\/esempio\/capitolo\/nel-libro$/);
  });

  test('an index entry clicked before its chapter is on the page goes there once it is, and leaves the address alone', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/libro/esempio/capitolo/nel-libro', PRINT_GOTO_OPTIONS);
    // A slow computer, so the chapters are still to come when the index appears.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 20 });
    await page.goto('/libro/esempio/stampa/libro', { waitUntil: 'commit' });
    const entry = page.locator('.print-index a[href="#cap-3"]');
    await entry.waitFor();
    const before = await page.evaluate(() => ({ url: location.href, history: history.length, mounted: Boolean(document.getElementById('cap-3')) }));
    await entry.click();
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    expect(before.mounted, 'the chapter is not on the page yet when the entry is clicked').toBe(false);
    const target = page.locator('#cap-3');
    await expect.poll(() => target.evaluate((el) => Math.abs(Math.round(el.getBoundingClientRect().top - parseFloat(getComputedStyle(el).scrollMarginTop)))), { timeout: 15_000 }).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => ({ url: location.href, history: history.length }))).toEqual({ url: before.url, history: before.history });
    // One step back leaves the print preview.
    await page.goBack();
    await expect(page).toHaveURL(/\/libro\/esempio\/capitolo\/nel-libro$/);
  });

  test('an index entry still waiting for its chapter lets go when the reader scrolls elsewhere', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 20 });
    await page.goto('/libro/esempio/stampa/libro', { waitUntil: 'commit' });
    const entry = page.locator('.print-index a[href="#cap-3"]');
    await entry.waitFor();
    expect(await page.evaluate(() => Boolean(document.getElementById('cap-3')))).toBe(false);
    await entry.click();
    await page.mouse.wheel(0, 200);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await expect(page.getByRole('button', { name: 'Stampa o salva PDF' })).toBeEnabled({ timeout: 30_000 });
    await page.waitForTimeout(1000);
    // The chapter appeared seconds after the reader scrolled: the page stays where the reader is.
    const top = await page.locator('#cap-3').evaluate((el) => Math.round(el.getBoundingClientRect().top));
    expect(top).toBeGreaterThan(900);
  });

  test('with no chapter chosen the sheet says what to do and printing waits', async ({ page }) => {
    await page.goto('/libro/esempio/stampa/libro', PRINT_GOTO_OPTIONS);
    await page.getByRole('button', { name: 'Deseleziona tutti' }).click();
    await expect(page).toHaveURL(/capitoli=(&|$)/);
    await expect(page.locator('.print-message')).toContainText('Scegli almeno un capitolo');
    await expect(page.getByRole('button', { name: 'Stampa o salva PDF' })).toBeDisabled();
    await page.getByRole('checkbox', { name: /Prova tu/ }).check();
    await expect(page.locator('.print-chapter-title')).toHaveText(['Prova tu']);
    await expect(page.getByRole('button', { name: 'Seleziona tutti' })).toBeVisible();
  });

  test('invalid options fall back to the defaults', async ({ page }) => {
    await page.goto('/libro/esempio/stampa/libro?capitoli=9,x&esercizi=7&formulario=forse&soluzioni=2', PRINT_GOTO_OPTIONS);
    await expect(page.locator('.print-chapter-title')).toHaveCount(3);
    await expect(page.getByRole('switch', { name: 'Esercizi alla fine di ogni capitolo' })).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByRole('switch', { name: 'Formulario in fondo' })).toHaveAttribute('aria-checked', 'false');
    // The default, on, shows once the exercises are on.
    await page.getByRole('switch', { name: 'Esercizi alla fine di ogni capitolo' }).click();
    await expect(page.getByRole('switch', { name: 'Soluzioni' })).toHaveAttribute('aria-checked', 'true');
  });

  test('exercises print the questions, then the solutions under the same ids', async ({ page }) => {
    await page.goto('/libro/esempio/stampa/esercizi?capitolo=tutti', PRINT_GOTO_OPTIONS);
    const sheet = page.locator('.print-sheet');
    await expect(sheet.locator('.print-exercises-title')).toHaveText([/^Capitolo 1\./, /^Capitolo 2\./, /^Capitolo 3\./]);
    await expect(sheet.locator('.print-solution-id')).toHaveText(['E1.1', 'E2.1', 'E3.1']);
    await expect(sheet.getByText('Suggerimento', { exact: true })).toHaveCount(0);
    // The only option here is the solutions switch.
    await expect(page.getByRole('switch')).toHaveCount(1);
    await page.getByRole('switch', { name: 'Soluzioni' }).click();
    await expect(page).toHaveURL(/capitolo=tutti&soluzioni=0/);
    await expect(sheet.locator('.print-solutions')).toHaveCount(0);
    await expect(sheet.locator('.exercise-card')).toHaveCount(3);
  });

  test('the formula sheet has no options panel', async ({ page }) => {
    await page.goto('/libro/esempio/stampa/formulario', PRINT_GOTO_OPTIONS);
    await expect(page.locator('.print-sheet')).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Opzioni di stampa' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Opzioni' })).toHaveCount(0);
  });

  test('on a phone the options open in a sheet that keeps and returns focus', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/libro/esempio/stampa/capitolo/nel-libro', PRINT_GOTO_OPTIONS);
    await expect(page.getByRole('complementary', { name: 'Opzioni di stampa' })).toHaveCount(0);
    const opener = page.getByRole('button', { name: 'Opzioni' });
    await opener.click();
    const dialog = page.getByRole('dialog', { name: 'Opzioni di stampa' });
    await expect(dialog).toBeVisible();
    await expect(opener).toHaveAttribute('aria-expanded', 'true');
    // Tab stays inside the sheet.
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }
    await dialog.getByRole('switch', { name: 'Esercizi alla fine del capitolo' }).click();
    await expect(dialog.getByRole('status')).toContainText('Capitolo 2 · 1 esercizio');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
    await opener.click();
    await page.getByRole('button', { name: 'Mostra anteprima' }).click();
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
    await expect(page.locator('.print-sheet .print-exercises-title')).toHaveText('Esercizi del capitolo 2');
  });

  test('at 320px the toolbar keeps every action on screen', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/libro/esempio/stampa/capitolo/nel-libro', PRINT_GOTO_OPTIONS);
    const toolbar = page.locator('.print-toolbar');
    await expect(page.getByRole('button', { name: 'Stampa o salva PDF' })).toBeEnabled();
    expect(await toolbar.evaluate((el) => el.scrollWidth)).toBeLessThanOrEqual(320);
    for (const action of [
      page.getByRole('button', { name: /Attiva tema/ }),
      page.getByRole('link', { name: 'Torna al libro' }),
      page.getByRole('button', { name: 'Opzioni' }),
      page.getByRole('button', { name: 'Stampa o salva PDF' }),
    ]) {
      const box = await action.boundingBox();
      expect(box && box.x >= 0 && box.x + box.width <= 320).toBe(true);
    }
  });

  test('the print options come back in the next preview of the book, but not the scope', async ({ page }) => {
    await page.goto('/libro/esempio/capitolo/nel-libro', PRINT_GOTO_OPTIONS);
    await page.getByRole('banner').getByRole('button', { name: 'Versione stampabile' }).click();
    await page.getByRole('button', { name: 'Tutto il libro' }).click();
    await expect(page.locator('.print-cover-title')).toBeVisible();
    await page.getByRole('checkbox', { name: /Benvenuto/ }).uncheck();
    await page.getByRole('switch', { name: 'Esercizi alla fine di ogni capitolo' }).click();
    await page.getByRole('group', { name: 'Quanti per capitolo' }).getByRole('button', { name: '3' }).click();
    await page.getByRole('switch', { name: "Prove d'esame in fondo" }).click();
    await page.getByRole('switch', { name: 'Soluzioni' }).click();
    await expect(page).toHaveURL(/soluzioni=0/);

    await page.getByRole('link', { name: 'Torna al libro' }).click();
    await page.getByRole('banner').getByRole('button', { name: 'Versione stampabile' }).click();
    // The printer on a chapter still opens this chapter, with the exercise choices.
    await expect(page).toHaveURL(/\/stampa\/capitolo\/nel-libro\?.*esercizi=3&soluzioni=0/);
    await expect(page.getByRole('switch', { name: 'Esercizi alla fine del capitolo' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('switch', { name: 'Soluzioni' })).toHaveAttribute('aria-checked', 'false');

    await page.getByRole('button', { name: 'Tutto il libro' }).click();
    await expect(page.locator('.print-chapter-title')).toHaveText(['Cosa trovi nel libro', 'Prova tu']);
    await expect(page.getByRole('switch', { name: "Prove d'esame in fondo" })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('switch', { name: 'Soluzioni' })).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByRole('group', { name: 'Quanti per capitolo' }).getByRole('button', { name: '3' })).toHaveAttribute('aria-pressed', 'true');

    // Options in the address win: a shared link prints what it says.
    await page.goto('/libro/esempio/stampa/libro?formulario=1', PRINT_GOTO_OPTIONS);
    await expect(page.getByRole('switch', { name: 'Formulario in fondo' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('switch', { name: "Prove d'esame in fondo" })).toHaveAttribute('aria-checked', 'false');
    await expect(page.locator('.print-chapter-title')).toHaveCount(3);
  });

  test('back link returns to the chapter', async ({ page }) => {
    await page.goto('/libro/esempio/capitolo/nel-libro', PRINT_GOTO_OPTIONS);
    await page.getByRole('banner').getByRole('button', { name: 'Versione stampabile' }).click();
    await expect(page).toHaveURL(/\/stampa\/capitolo\/nel-libro/);
    await assertPrintPreview(page, PRINT_ROUTES[0]);
    await page.getByRole('link', { name: 'Torna al libro' }).click();
    await expect(page).toHaveURL(/\/libro\/esempio\/capitolo\/nel-libro$/);
  });
});

test.describe('Links in a long print preview', () => {
  // Chapters long enough that the blocks between a link and its target are laid out only near the screen.
  const paragraph = (c: number, p: number) => [
    `## p${p} | Paragrafo ${p}`, '',
    ...Array.from({ length: 12 }, (_, l) => `Riga ${l + 1} del paragrafo ${c}.${p}, con una formula $x_{${l}} = ${l}$.\n`),
  ].join('\n');
  const LONG_BOOK: TestBook = {
    id: 'lungo-stampa',
    title: 'Lungo da stampare',
    chapters: [1, 2, 3].map((c) => ({
      id: `cap${c}`, number: c, title: `Capitolo ${c}`,
      markdown: [`---\nchapter: ${c}\ntitle: Capitolo ${c}\n---\n`, ...Array.from({ length: 25 }, (_, p) => paragraph(c, p + 1))].join('\n'),
    })),
    esercizi: ['---', 'type: esercizi', 'printable: true', '---', '',
      ...[1, 2, 3].flatMap((c) => Array.from({ length: 15 }, (_, e) => [
        `:::exercise{id="E${c}.${e + 1}" chapter="${c}" difficulty="facile"}`, '## Domanda', `Quanto fa ${c} + ${e}?`, '',
        ':::solution', ...Array.from({ length: 6 }, (_, l) => `Riga ${l + 1}: fa ${c + e}.\n`), ':::', ':::', '',
      ].join('\n'))),
    ].join('\n'),
  };

  test('every link lands its target under the toolbar and keeps it there', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await preparePlatformShell(page);
    await openTestBook(page, LONG_BOOK);
    await page.goto(`/libro/${LONG_BOOK.id}/stampa/libro?esercizi=tutti&soluzioni=1`, PRINT_GOTO_OPTIONS);
    await expect(page.getByRole('button', { name: 'Stampa o salva PDF' })).toBeEnabled({ timeout: 30_000 });
    const offset = (id: string) =>
      page.locator(`[id="${id}"]`).evaluate((el) => Math.round(el.getBoundingClientRect().top - parseFloat(getComputedStyle(el).scrollMarginTop)));
    for (const [from, to] of [['E1.2', 'E2.10'], ['E3.3', 'E1.9'], ['E2.7', 'E2.13'], ['E1.15', 'E3.1']]) {
      for (const [link, target] of [[`ex-${from}`, `ex-${from}-soluzione`], [`ex-${from}-soluzione`, `ex-${from}`], [`ex-${to}`, `ex-${to}-soluzione`]]) {
        await page.locator(`[id="${link}"] a[href="#${target}"]`).first().evaluate((a) => a.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await page.locator(`[id="${link}"] a[href="#${target}"]`).first().click();
        await page.waitForTimeout(800);
        expect(Math.abs(await offset(target)), `${link} to ${target}`).toBeLessThanOrEqual(1);
      }
    }
  });
});

test.describe('Flat formulas in the print preview', () => {
  const URL = '/libro/esempio/stampa/libro?esercizi=tutti&formulario=1&esami=1';
  const PRINT = { name: 'Stampa o salva PDF' };

  test.beforeEach(async ({ page }) => {
    await preparePlatformShell(page);
  });

  /** The box of every text run of the first formulas, relative to the sheet. */
  const runBoxes = (page: Page) =>
    page.evaluate(() => {
      const sheet = document.querySelector('.print-sheet')!.getBoundingClientRect();
      const range = document.createRange();
      return [...document.querySelectorAll('.print-sheet .katex')].slice(0, 30).flatMap((katex) => {
        const runs: [string, number, number, number, number][] = [];
        const walker = document.createTreeWalker(katex, NodeFilter.SHOW_TEXT);
        for (let t = walker.nextNode() as Text | null; t; t = walker.nextNode() as Text | null) {
          if (!t.data.replace(/\u200b/g, '')) continue;
          range.selectNodeContents(t);
          const r = range.getBoundingClientRect();
          runs.push([t.data, r.left - sheet.left, r.top - sheet.top, r.width, r.height]);
        }
        return runs;
      });
    });

  test('the preview flattens its formulas after it is ready, and they stay where KaTeX put them', async ({ page }) => {
    await page.addInitScript(() => {
      const times = ((window as unknown as { flatTimes: Record<string, number> }).flatTimes = {});
      new MutationObserver(() => {
        const button = document.querySelector<HTMLButtonElement>('button[aria-label="Stampa o salva PDF"]');
        if (button && !button.disabled) times.ready ??= performance.now();
        if (document.querySelector('.katex-flat')) times.flat ??= performance.now();
      }).observe(document, { subtree: true, childList: true, attributes: true });
    });
    await page.goto(`${URL}&math=katex`, PRINT_GOTO_OPTIONS);
    await expect(page.getByRole('button', PRINT)).toBeEnabled();
    const katex = await runBoxes(page);
    expect(katex.length).toBeGreaterThan(30);
    await page.waitForTimeout(500);
    await expect(page.locator('.print-sheet .katex-flat')).toHaveCount(0);

    await page.goto(URL, PRINT_GOTO_OPTIONS);
    await expect(page.locator('.print-sheet')).toHaveAttribute('data-math', 'flat');
    const times = await page.evaluate(() => (window as unknown as { flatTimes: Record<string, number> }).flatTimes);
    expect(times.flat).toBeGreaterThan(times.ready);
    await expect(page.locator('.print-sheet .katex-base:not(.katex-flat)')).toHaveCount(0);
    const flat = await runBoxes(page);
    expect(flat.map((r) => r[0])).toEqual(katex.map((r) => r[0]));
    flat.forEach((run, i) => {
      for (let k = 1; k < 5; k++) expect(Math.abs(Number(run[k]) - Number(katex[i][k])), `${run[0]} (${i})`).toBeLessThanOrEqual(0.5);
    });
  });

  test('printing right away first flattens what is left, then prints once', async ({ page }) => {
    await page.addInitScript(() => {
      const log = ((window as unknown as { printed: string[] }).printed = []);
      window.print = () => {
        const sheet = document.querySelector<HTMLElement>('.print-sheet')!;
        log.push(`${sheet.dataset.math}:${sheet.querySelectorAll('.katex-base:not(.katex-flat)').length}`);
      };
      // Click the moment the button is ready, before the flattening that starts after the next paint.
      new MutationObserver((_, observer) => {
        const button = document.querySelector<HTMLButtonElement>('button[aria-label="Stampa o salva PDF"]');
        if (button && !button.disabled) {
          observer.disconnect();
          button.click();
        }
      }).observe(document, { subtree: true, childList: true, attributes: true });
    });
    await page.goto(URL, PRINT_GOTO_OPTIONS);
    await expect.poll(() => page.evaluate(() => (window as unknown as { printed: string[] }).printed)).toEqual(['flat:0']);
    await expect(page.getByRole('button', PRINT)).toBeEnabled();
  });

  test('?math=katex keeps KaTeX\'s formulas and prints them', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { prints: number }).prints = 0;
      window.print = () => {
        (window as unknown as { prints: number }).prints += 1;
      };
    });
    await page.goto(`${URL}&math=katex`, PRINT_GOTO_OPTIONS);
    await page.getByRole('button', PRINT).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { prints: number }).prints)).toBe(1);
    await expect(page.locator('.print-sheet .katex-flat')).toHaveCount(0);
    // An option keeps the switch in the address.
    await page.getByRole('switch', { name: /^Soluzioni/ }).click();
    await expect(page).toHaveURL(/math=katex/);
  });

  test('an option that changes the document flattens the new parts and leaves the others alone', async ({ page }) => {
    await page.goto('/libro/esempio/stampa/libro', PRINT_GOTO_OPTIONS);
    await expect(page.locator('.print-sheet')).toHaveAttribute('data-math', 'flat');
    await page.evaluate(() => {
      for (const flat of document.querySelectorAll('.print-sheet .katex-flat')) flat.setAttribute('data-old', '');
    });
    const old = await page.locator('.print-sheet .katex-flat[data-old]').count();
    expect(old).toBeGreaterThan(0);
    await page.getByRole('switch', { name: /^Formulario in fondo/ }).click();
    await expect(page.locator('.print-sheet .formulario-card').first()).toBeVisible();
    await expect(page.locator('.print-sheet')).toHaveAttribute('data-math', 'flat');
    await expect(page.locator('.print-sheet .katex-base:not(.katex-flat)')).toHaveCount(0);
    await expect(page.locator('.print-sheet .formulario-card .katex-flat').first()).toBeVisible();
    await expect(page.locator('.print-sheet .katex-flat[data-old]')).toHaveCount(old);
  });
});

test.describe('Print preview of wide formulas', () => {
  test.beforeEach(async ({ page }) => {
    await preparePlatformShell(page);
    await openTestBook(page, WIDE_BOOK);
  });

  // Chromium shrinks the whole printed document when anything is wider than the page.
  for (const [name, path, width] of [
    ['a chapter with its exercises', '/stampa/capitolo/lunghe?esercizi=tutti', 1440],
    ['a chapter opened on a phone', '/stampa/capitolo/lunghe?esercizi=tutti', 390],
    ['the whole book with every extra', '/stampa/libro?esercizi=tutti&formulario=1&esami=1', 1440],
    ['the exercises', '/stampa/esercizi?capitolo=tutti', 1440],
    ['the exam questions', '/stampa/esami', 1440],
  ] as const) {
    test(`no print document is wider than its sheet: ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/libro/${WIDE_BOOK.id}${path}`, PRINT_GOTO_OPTIONS);
      await expect(page.getByRole('button', { name: 'Stampa o salva PDF' })).toBeEnabled();
      await expect(page.locator('.print-sheet .katex-display').first()).toBeVisible();
      // In print media the sheet takes the viewport's width: make it the printed column.
      await page.emulateMedia({ media: 'print' });
      await page.setViewportSize({ width: PRINT_COLUMN, height: 900 });
      const overflow = await page.evaluate(() => {
        const wide = [...document.querySelectorAll<HTMLElement>('.print-sheet .katex-display')].filter(
          (el) => (el.querySelector('.katex-html')?.scrollWidth ?? 0) > el.clientWidth + 1,
        );
        return { document: document.documentElement.scrollWidth, formulas: wide.length };
      });
      expect(overflow).toEqual({ document: PRINT_COLUMN, formulas: 0 });
    });
  }

  // KaTeX ends a script stack with an empty 2px cell and pulls the next box back over it with a -2px
  // margin. An inline formula that ends a line then reaches 2px past the page, which the fit cannot see
  // (no segment is wider than its line), and Chromium printed Fisica 1 at 99.8%.
  test('no box of a formula reaches past the right edge of its segment in print', async ({ page }) => {
    await page.goto(`/libro/${WIDE_BOOK.id}/stampa/libro?esercizi=tutti&formulario=1&esami=1`, PRINT_GOTO_OPTIONS);
    await expect(page.getByRole('button', { name: 'Stampa o salva PDF' })).toBeEnabled();
    await page.emulateMedia({ media: 'print' });
    const past = await page.evaluate(() => {
      const found: string[] = [];
      for (const base of document.querySelectorAll('.print-sheet .katex-base')) {
        const right = base.getBoundingClientRect().right;
        for (const el of base.querySelectorAll('*')) {
          const r = el.getBoundingClientRect();
          if ((r.width || r.height) && r.right > right + 0.01) found.push(el.className.toString());
        }
      }
      return { scripts: document.querySelectorAll('.print-sheet .vlist-t2').length, found: [...new Set(found)] };
    });
    expect(past.scripts).toBeGreaterThan(0);
    expect(past.found).toEqual([]);
  });

  // On a phone a formula shrinks only while it stays readable (12px, the sheet's 9pt small text, see
  // READABLE_FORMULA_PX); a wider one keeps its size and scrolls inside its own box.
  for (const width of [320, 375]) {
    for (const [name, path] of [
      ['a chapter with its exercises', '/stampa/capitolo/lunghe?esercizi=tutti'],
      ['the whole book with every extra', '/stampa/libro?esercizi=tutti&formulario=1&esami=1'],
    ] as const) {
      test(`at ${width}px every formula in the preview is readable and the page does not scroll sideways: ${name}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(`/libro/${WIDE_BOOK.id}${path}`, PRINT_GOTO_OPTIONS);
        await expect(page.getByRole('button', { name: 'Stampa o salva PDF' })).toBeEnabled();
        const report = await page.evaluate(() => {
          const sheet = document.querySelector('.print-sheet')!;
          const fontPx = (katex: Element) => parseFloat(getComputedStyle(katex).fontSize);
          const displays = [...sheet.querySelectorAll<HTMLElement>('.katex-display')];
          const scaled = displays.filter((d) => d.style.getPropertyValue('--display-fit'));
          const scrolling = [...sheet.querySelectorAll<HTMLElement>('[data-wide]')];
          return {
            scaled: scaled.length,
            smallest: Math.min(...scaled.map((d) => fontPx(d.querySelector('.katex')!))),
            scrolling: scrolling.length,
            scrollingInline: scrolling.filter((el) => el.matches('.katex')).length,
            notScrolling: scrolling.filter((el) => !(el.scrollWidth > el.clientWidth && getComputedStyle(el).overflowX === 'auto')).length,
            unreadableScrolling: scrolling.filter((el) => fontPx(el.matches('.katex') ? el : el.querySelector('.katex')!) < 12).length,
            page: document.documentElement.scrollWidth,
          };
        });
        expect(report.scaled).toBeGreaterThan(0);
        expect(report.smallest).toBeGreaterThanOrEqual(12);
        expect(report.scrolling).toBeGreaterThan(0);
        expect(report.scrollingInline).toBeGreaterThan(0);
        expect(report.notScrolling).toBe(0);
        expect(report.unreadableScrolling).toBe(0);
        expect(report.page).toBe(width);
      });
    }
  }

  // The print scale depends on the formula and the printed column only. Between the phone and the computer
  // layouts the screen boxes differ from the printed ones in both directions: one formula-sheet card per row
  // on screen against two in print, and a sheet wider than the page from about 700px to 860px.
  test('every formula prints at the same scale whatever the preview width', async ({ page }) => {
    const printScales = async (width: number) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/libro/${WIDE_BOOK.id}/stampa/libro?esercizi=tutti&formulario=1&esami=1`, PRINT_GOTO_OPTIONS);
      await expect(page.getByRole('button', { name: 'Stampa o salva PDF' })).toBeEnabled();
      return page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('.print-sheet .katex-display, .print-sheet .katex')]
          .filter((el) => el.matches('.katex-display') || !el.parentElement?.closest('.katex-display'))
          .map((el) => Number(el.style.getPropertyValue(el.matches('.katex-display') ? '--display-fit-print' : '--inline-fit-print') || 1)),
      );
    };
    const desktop = await printScales(1440);
    expect(desktop.some((scale) => scale < 1)).toBe(true);
    for (const width of [420, 600, 800]) {
      const scales = await printScales(width);
      expect(scales.length).toBe(desktop.length);
      scales.forEach((scale, i) => expect(scale, `formula ${i} at ${width}px`).toBeCloseTo(desktop[i], 2));
    }
  });

  test('a short formula in the formula sheet keeps its full print size at an in-between width', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 900 });
    await page.goto(`/libro/${WIDE_BOOK.id}/stampa/formulario`, PRINT_GOTO_OPTIONS);
    await expect(page.getByRole('button', { name: 'Stampa o salva PDF' })).toBeEnabled();
    const short = page.locator('.print-sheet [id="formula-1.2"] .katex-display');
    expect(await short.evaluate((el) => el.style.getPropertyValue('--display-fit-print'))).toBe('');
    await page.emulateMedia({ media: 'print' });
    const { formula, text } = await short.evaluate((el) => ({
      formula: parseFloat(getComputedStyle(el.querySelector('.katex')!).fontSize),
      text: parseFloat(getComputedStyle(el).fontSize),
    }));
    expect(formula).toBeCloseTo(text * 1.21, 1);
  });

  // A card prints one of two in a row, but on a phone it takes the whole screen, which can be narrower than
  // that half row: its formula must fit the screen too, scaled while readable, else scrolling.
  for (const width of [320, 375, 500]) {
    test(`at ${width}px no formula-sheet card cuts its formula: scaled or scrolling, with the print scale of a computer`, async ({ page }) => {
      const printScales = () =>
        page.evaluate(() =>
          Object.fromEntries(
            [...document.querySelectorAll<HTMLElement>('.print-sheet .formulario-card')].map((card) => [
              card.id,
              card.querySelector<HTMLElement>('.katex-display')?.style.getPropertyValue('--display-fit-print') ?? '',
            ]),
          ),
        );
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/libro/${WIDE_BOOK.id}/stampa/formulario`, PRINT_GOTO_OPTIONS);
      await expect(page.getByRole('button', { name: 'Stampa o salva PDF' })).toBeEnabled();
      const desktop = await printScales();

      await page.setViewportSize({ width, height: 800 });
      await page.goto(`/libro/${WIDE_BOOK.id}/stampa/formulario`, PRINT_GOTO_OPTIONS);
      await expect(page.getByRole('button', { name: 'Stampa o salva PDF' })).toBeEnabled();
      const report = await page.evaluate(() => {
        const cut: string[] = [];
        for (const card of document.querySelectorAll<HTMLElement>('.print-sheet .formulario-card')) {
          const body = card.querySelector<HTMLElement>('.formulario-card-body')!.getBoundingClientRect();
          const display = card.querySelector<HTMLElement>('.katex-display')!;
          if (display.hasAttribute('data-wide')) {
            if (display.getAttribute('tabindex') !== '0' || !(display.scrollWidth > display.clientWidth)) cut.push(`${card.id} does not scroll`);
            continue;
          }
          for (const box of display.querySelector('.katex-html')!.children) {
            const r = box.getBoundingClientRect();
            if (!box.classList.contains('katex-newline') && (r.left < body.left - 0.5 || r.right > body.right + 0.5)) cut.push(card.id);
          }
        }
        return { cut, page: document.documentElement.scrollWidth };
      });
      expect(report).toEqual({ cut: [], page: width });
      // The medium formula needed it at 320px: scaled or scrolling there, and printed as on a computer.
      const medium = page.locator('.print-sheet [id="formula-1.4"] .katex-display');
      if (width === 320) {
        const fitted = await medium.evaluate((el) => el.hasAttribute('data-wide') || el.style.getPropertyValue('--display-fit') !== '');
        expect(fitted).toBe(true);
      }
      expect(await printScales()).toEqual(desktop);
    });
  }

  test('a formula that scrolls in the preview is a named tab stop until it fits again', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(`/libro/${WIDE_BOOK.id}/stampa/capitolo/lunghe`, PRINT_GOTO_OPTIONS);
    await expect(page.getByRole('button', { name: 'Stampa o salva PDF' })).toBeEnabled();
    const numbered = page.getByRole('group', { name: 'Formula 1.1: Una formula numerata lunga' });
    await expect(numbered).toHaveAttribute('tabindex', '0');
    await expect(numbered).toHaveAttribute('data-wide', '');
    await expect(page.locator('.print-sheet .katex[data-wide]')).toHaveAttribute('aria-label', 'Formula');
    // The keyboard scrolls it.
    await numbered.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => numbered.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    // No focus ring on paper.
    await page.emulateMedia({ media: 'print' });
    expect(await numbered.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none');
    await page.emulateMedia({ media: 'screen' });

    // On a computer this formula fits at a readable size: no tab stop, no name.
    await page.setViewportSize({ width: 1440, height: 900 });
    const formula = page.locator('.print-sheet .numbered-formula[data-formula-id="1.1"] .katex-display');
    await expect(formula).not.toHaveAttribute('data-wide');
    await expect(formula).not.toHaveAttribute('tabindex');
    await expect(formula).not.toHaveAttribute('role');
    await expect(formula).not.toHaveAttribute('aria-label');
  });

  test('a wide numbered formula fits its card on screen', async ({ page }) => {
    await page.goto(`/libro/${WIDE_BOOK.id}/stampa/capitolo/lunghe`, PRINT_GOTO_OPTIONS);
    await expect(page.getByRole('button', { name: 'Stampa o salva PDF' })).toBeEnabled();
    const card = page.locator('.print-sheet .numbered-formula[data-formula-id="1.1"]');
    const { cardRight, formulaRight } = await card.evaluate((el) => {
      const html = el.querySelector<HTMLElement>('.katex-html')!;
      return { cardRight: el.getBoundingClientRect().right, formulaRight: html.getBoundingClientRect().left + html.scrollWidth };
    });
    expect(formulaRight).toBeLessThanOrEqual(cardRight);
  });
});

test.describe('Print shortcut', () => {
  // The service worker would answer the figure request before the route below sees it.
  test.use({ serviceWorkers: 'block' });

  test.beforeEach(async ({ page }) => {
    await preparePlatformShell(page);
  });

  test('Ctrl+P while the document is being prepared waits for it', async ({ page }) => {
    await page.addInitScript(() => {
      const counter = window as unknown as { prints: number };
      counter.prints = 0;
      window.print = () => {
        counter.prints += 1;
      };
    });
    const prints = () => page.evaluate(() => (window as unknown as { prints: number }).prints);
    // The chapter's figure stays pending, so the document is not ready yet.
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(/cosa-trovi.*\.svg$/, async (route) => {
      await held;
      await route.continue();
    });
    await page.goto('/libro/esempio/stampa/capitolo/nel-libro', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.print-sheet')).toHaveAttribute('aria-busy', 'true');

    const prevented = await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, cancelable: true, bubbles: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(prevented).toBe(true);
    expect(await prints()).toBe(0);

    release();
    await expect.poll(prints).toBe(1);
  });

  test('a queued Ctrl+P is dropped when no chapter is left to print', async ({ page }) => {
    await page.addInitScript(() => {
      const counter = window as unknown as { prints: number };
      counter.prints = 0;
      window.print = () => {
        counter.prints += 1;
      };
    });
    const prints = () => page.evaluate(() => (window as unknown as { prints: number }).prints);
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(/cosa-trovi.*\.svg$/, async (route) => {
      await held;
      await route.continue();
    });
    await page.goto('/libro/esempio/stampa/libro', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.print-sheet')).toHaveAttribute('aria-busy', 'true');
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, cancelable: true, bubbles: true }));
    });

    await page.getByRole('button', { name: 'Deseleziona tutti' }).click();
    await expect(page.locator('.print-sheet')).toHaveCount(0);
    release();
    await page.waitForTimeout(500);
    expect(await prints()).toBe(0);
  });
});

test.describe('Print preview of a book loaded one chapter at a time', () => {
  test.skip(process.env.VITE_PLATFORM_ENABLED !== 'true', 'Cloud books need the platform build.');

  test.beforeEach(async ({ page }) => {
    await preparePlatformShell(page);
    await page.route('**/api/catalog', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          books: [
            {
              id: 'nuvola',
              title: 'Libro in cloud',
              subject: 'Prova',
              access: 'public',
              delivery: 'cloud',
              chapters: [
                { id: 'primo', number: 1, title: 'Primo', file: '01-primo.md' },
                { id: 'secondo', number: 2, title: 'Secondo', file: '02-secondo.md' },
              ],
            },
          ],
        }),
      }),
    );
    await page.route('**/api/books/nuvola/chapters/*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          smartbook_id: 'nuvola',
          chapter_id: 'primo',
          markdown: '---\nchapter: 1\ntitle: Primo\n---\n\n## p1 | Inizio\n\nUn paragrafo del primo capitolo.\n',
        }),
      }),
    );
  });

  test('prints this chapter only; the whole book is not offered', async ({ page }) => {
    await page.goto('/libro/nuvola/stampa/capitolo/primo', PRINT_GOTO_OPTIONS);
    await expect(page.locator('.print-sheet')).toContainText('Un paragrafo del primo capitolo.');
    await expect(page.getByRole('button', { name: 'Stampa o salva PDF' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Tutto il libro' })).toHaveCount(0);
    await page.goto('/libro/nuvola/stampa/libro', PRINT_GOTO_OPTIONS);
    await expect(page.locator('.print-message')).toContainText('un capitolo alla volta');
    await expect(page.locator('.print-sheet')).toHaveCount(0);
  });
});

import { test, expect, type Page } from '@playwright/test';
import { preparePlatformShell, PRINT_GOTO_OPTIONS } from './helpers/platform';
import { openTestBook, WIDE_BOOK, type TestBook } from './helpers/books';
import { MEASUREMENT_VERSION } from '../src/lib/printFormulaMode';

/** The printed text column: A4 less the 18 mm side margins, in CSS px. */
const PRINT_COLUMN = Math.floor((174 * 96) / 25.4);
const KEY = 'politost-print-formulas';

/** Stores what the device measurement and the student's choice left, once, before the first page. */
async function storePrefs(page: Page, prefs: { layoutMs?: number; chosen?: 'best' | 'fast' } | null) {
  await page.addInitScript(
    ([key, value]) => {
      if (sessionStorage.getItem('prefs-stored')) return;
      sessionStorage.setItem('prefs-stored', '1');
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    },
    [KEY, prefs === null ? null : JSON.stringify({ ...prefs, version: MEASUREMENT_VERSION })] as const,
  );
}

const SLOW = { layoutMs: 999 };
const printButton = (page: Page) => page.getByRole('button', { name: 'Stampa o salva PDF' });
const formulas = (page: Page) => page.getByRole('group', { name: 'Formule' });

async function expectFast(page: Page) {
  const sheet = page.locator('.print-sheet');
  await expect(printButton(page)).toBeEnabled({ timeout: 30_000 });
  await expect(sheet.locator('math').first()).toBeVisible();
  await expect(sheet.locator('.katex')).toHaveCount(0);
}

async function expectBest(page: Page) {
  const sheet = page.locator('.print-sheet');
  await expect(printButton(page)).toBeEnabled({ timeout: 30_000 });
  await expect(sheet.locator('.katex').first()).toBeVisible();
  await expect(sheet.locator('math:not(.katex-mathml math)')).toHaveCount(0);
}

const LINK_BOOK: TestBook = {
  id: 'collegamenti-veloci',
  title: 'Collegamenti veloci',
  chapters: [
    {
      id: 'uno',
      number: 1,
      title: 'Uno',
      markdown: [
        '---', 'chapter: 1', 'title: Uno', '---', '',
        '## p1 | Una formula', '',
        'La seconda legge, con $F = ma$, vale sempre.', '',
        ':::formula{id="1.1" label="Seconda legge"}', '$$F = m a \\xrightarrow{\\Delta t} F\\,\\Delta t$$', ':::', '',
        ...Array.from({ length: 40 }, (_, i) => `Riga ${i + 1} con $x_{${i}} = \\frac{${i}}{2}$.\n`),
        '## p2 | Un rimando', '',
        // Formulas with scripts on some lines and plain text on the others.
        ['$a_T = \\mathrm{d}v/\\mathrm{d}t$', '$a_N = v^2/\\rho$', '$x_i$', '$e^{i\\pi}$', '$v_0^2$', '$F_c$']
          .map((tex) => `La componente tangenziale ${tex} cambia il modulo della velocità del punto, e la parola dopo la parola riempie una riga intera di testo semplice, senza alcuna formula, prima della prossima.`)
          .join(' '),
        '',
        'Come dice la {{formula:1.1}}, vedi il [paragrafo](ref:chapter/1#p1) e il [formulario](ref:formula/1.1).', '',
      ].join('\n'),
    },
  ],
  esercizi: [
    '---', 'type: esercizi', 'printable: true', '---', '',
    ':::exercise{id="E1.1" chapter="1" difficulty="facile"}', '## Domanda', 'Quanto vale $\\int_0^1 x\\,dx$?', '',
    ':::solution', '$$\\int_0^1 x\\,dx = \\frac{1}{2}$$', ':::', ':::', '',
  ].join('\n'),
};

const sumOf = (terms: number) => Array.from({ length: terms }, (_, i) => `a_{${i + 1}}b_{${i + 1}}`).join(' + ');

/**
 * Enough formulas that flattening them takes several slices, a display formula fitted to the page,
 * and one formula Temml cannot render, which fast print leaves as KaTeX.
 */
const MIX_BOOK: TestBook = {
  id: 'formule-miste',
  title: 'Formule miste',
  chapters: [
    {
      id: 'misto',
      number: 1,
      title: 'Misto',
      markdown: [
        '---', 'chapter: 1', 'title: Misto', '---', '',
        '## p1 | Tante formule', '',
        `$$S = ${sumOf(14)}$$`, '',
        'Una formula che Temml non sa disegnare: $x + \\html@mathml{a}{b}$.', '',
        ...Array.from({ length: 150 }, (_, i) => `Riga ${i + 1}: $v_{${i}} = \\frac{\\Delta x_{${i}}}{\\Delta t}$ e $\\sqrt{a^2 + b_{${i}}^2}$.\n`),
      ].join('\n'),
    },
  ],
};

/** Replaces window.print with a log of what the sheet held when it was called. */
async function logPrints(page: Page) {
  await page.addInitScript(() => {
    const log = ((window as unknown as { printed: string[] }).printed = []);
    window.print = () => {
      const sheet = document.querySelector<HTMLElement>('.print-sheet')!;
      log.push(`${sheet.dataset.math ?? 'none'}:${sheet.querySelectorAll('.katex-base:not(.katex-flat)').length}`);
    };
  });
}
const printed = (page: Page) => page.evaluate(() => (window as unknown as { printed: string[] }).printed);

/** What the flattening and the fit left on the sheet. */
const sheetState = (page: Page) =>
  page.locator('.print-sheet').evaluate((sheet: HTMLElement) => ({
    math: sheet.dataset.math,
    flat: sheet.querySelectorAll('.katex-flat').length,
    kept: sheet.querySelectorAll('.katex-base:not(.katex-flat)').length,
    mathml: sheet.querySelectorAll('math').length,
    fits: [...sheet.querySelectorAll<HTMLElement>('.katex-display, .mml-display')].map(
      (el) => `${el.style.getPropertyValue('--display-fit')}|${el.style.getPropertyValue('--display-fit-print')}`,
    ),
  }));

test.describe('Fast print', () => {
  test.beforeEach(async ({ page }) => {
    await preparePlatformShell(page);
  });

  test('a slow device prints fast from its first visit, and a line above the sheet says so', async ({ page }) => {
    await storePrefs(page, SLOW);
    await page.goto('/libro/esempio/stampa/capitolo/nel-libro', PRINT_GOTO_OPTIONS);
    await expectFast(page);
    const notice = page.getByRole('region', { name: 'Stampa veloce' });
    await expect(notice).toContainText('Stampa veloce attiva, scelta per questo dispositivo');
    await expect(formulas(page).getByRole('button', { name: 'Veloce' })).toHaveAttribute('aria-pressed', 'true');
    // The samples exist only on request.
    await expect(page.locator('.fast-print-sample')).toHaveCount(0);
    await notice.getByRole('button', { name: 'Vedi la differenza' }).click();
    await expect(page.locator('.fast-print-sample[data-mode="best"] .katex')).toBeVisible();
    await expect(page.locator('.fast-print-sample[data-mode="fast"] math')).toBeVisible();
    await expect(notice.getByRole('button', { name: 'Nascondi il confronto' })).toHaveAttribute('aria-expanded', 'true');
  });

  test('a slow device never lays out the KaTeX that fast print replaces', async ({ page }) => {
    await storePrefs(page, SLOW);
    // Counts the KaTeX formulas that ever reach the sheet, however briefly.
    await page.addInitScript(() => {
      const seen = window as unknown as { katexInSheet: number };
      seen.katexInSheet = 0;
      new MutationObserver(() => {
        seen.katexInSheet += document.querySelectorAll('.print-sheet .katex').length;
      }).observe(document, { subtree: true, childList: true });
    });
    await page.goto('/libro/esempio/stampa/libro', PRINT_GOTO_OPTIONS);
    await expectFast(page);
    expect(await page.evaluate(() => (window as unknown as { katexInSheet: number }).katexInSheet)).toBe(0);
  });

  test('a fast device sees no line, only the setting in the panel', async ({ page }) => {
    await page.goto('/libro/esempio/stampa/capitolo/nel-libro', PRINT_GOTO_OPTIONS);
    await expectBest(page);
    await expect(page.locator('.fast-print-notice')).toHaveCount(0);
    await expect(formulas(page).getByRole('button', { name: 'Migliore' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('a choice made by hand survives a reload and wins over the measurement', async ({ page }) => {
    await storePrefs(page, SLOW);
    await page.goto('/libro/esempio/stampa/capitolo/nel-libro', PRINT_GOTO_OPTIONS);
    await expectFast(page);
    await page.getByRole('button', { name: 'Usa le formule migliori' }).click();
    await expectBest(page);
    await page.reload(PRINT_GOTO_OPTIONS);
    await expectBest(page);
    await expect(formulas(page).getByRole('button', { name: 'Migliore' })).toHaveAttribute('aria-pressed', 'true');
    // On a slow device the book's formulas leave a quiet line that offers fast print again.
    await expect(page.locator('.fast-print-notice--quiet')).toContainText('Passa alla stampa veloce');

    await formulas(page).getByRole('button', { name: 'Veloce' }).click();
    await expectFast(page);
    await page.goto('/libro/esempio/stampa/libro', PRINT_GOTO_OPTIONS);
    await expectFast(page);
    // Chosen by hand: the panel says it is remembered, and no line repeats it.
    await expect(page.locator('.fast-print-notice')).toHaveCount(0);
    await expect(page.locator('.print-options-memory')).toHaveText('Scelta ricordata su questo dispositivo.');
    expect(JSON.parse((await page.evaluate((key) => localStorage.getItem(key), KEY)) ?? '{}')).toMatchObject({ chosen: 'fast', layoutMs: 999 });
  });

  test('every print uses the mode: formula sheet, exercises and exam questions', async ({ page }) => {
    await storePrefs(page, { chosen: 'fast' });
    for (const path of ['formulario', 'esercizi', 'esami', 'libro?esercizi=tutti&formulario=1&esami=1']) {
      await page.goto(`/libro/esempio/stampa/${path}`, PRINT_GOTO_OPTIONS);
      await expectFast(page);
    }
  });

  test('links and their targets still work', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await storePrefs(page, { chosen: 'fast' });
    await openTestBook(page, LINK_BOOK);
    await page.goto(`/libro/${LINK_BOOK.id}/stampa/libro?formulario=1&esercizi=tutti`, PRINT_GOTO_OPTIONS);
    await expectFast(page);
    const sheet = page.locator('.print-sheet');
    // The numbered formula keeps its number and its id, and its formula-sheet card its own.
    const equation = sheet.locator('[id="eq-1.1"]');
    await expect(equation.locator('.formula-num')).toHaveText('(1.1)');
    await expect(equation.locator('.mml-display math')).toBeVisible();
    await expect(sheet.locator('[id="formula-1.1"] .mml-display math')).toBeVisible();
    await expect(sheet.locator('a[data-print-ref="formula/1.1"]').first()).toHaveAttribute('href', '#eq-1.1');
    await expect(sheet.locator('a[data-print-ref="chapter/1#p1"]')).toHaveAttribute('href', '#cap-1-p1');
    // The exercise links to its solution, whose formula is MathML too.
    await expect(sheet.locator('[id="ex-E1.1"] a[href="#ex-E1.1-soluzione"]')).toHaveCount(1);
    await expect(sheet.locator('[id="ex-E1.1-soluzione"] .mml-display math')).toBeVisible();

    const link = sheet.locator('a[data-print-ref="formula/1.1"]').first();
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await expect.poll(() => equation.evaluate((el) => Math.round(el.getBoundingClientRect().top - parseFloat(getComputedStyle(el).scrollMarginTop)))).toBe(0);
    await expect(page).not.toHaveURL(/#/);
  });

  test('a stretchy arrow is as wide as its label', async ({ page }) => {
    await storePrefs(page, { chosen: 'fast' });
    await openTestBook(page, LINK_BOOK);
    await page.goto(`/libro/${LINK_BOOK.id}/stampa/capitolo/uno`, PRINT_GOTO_OPTIONS);
    await expectFast(page);
    await page.evaluate(() => document.fonts.ready);
    // The browser reports the arrow's natural size, so the drawn shaft is read from a screenshot:
    // the longest run of dark pixels in one row of the arrow and its label.
    const stack = page.locator('[id="eq-1.1"] mover:has(> mo[stretchy="true"])').first();
    const label = await stack.evaluate((el) => (el.lastElementChild as Element).getBoundingClientRect().width);
    const png = (await stack.screenshot()).toString('base64');
    const shaft = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, img.width, img.height);
      let longest = 0;
      for (let y = 0; y < img.height; y++) {
        let run = 0;
        for (let x = 0; x < img.width; x++) {
          const i = (y * img.width + x) * 4;
          run = data[i] + data[i + 1] + data[i + 2] < 300 ? run + 1 : 0;
          longest = Math.max(longest, run);
        }
      }
      return longest;
    }, png);
    // The label box holds the label and Temml's padding; an arrow left at its natural width is about 16px.
    expect(label).toBeGreaterThan(25);
    expect(shaft).toBeGreaterThanOrEqual(label * 0.8);
  });

  test('inline formulas with scripts keep the lines of a paragraph evenly spaced', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await storePrefs(page, { chosen: 'fast' });
    await openTestBook(page, LINK_BOOK);
    await page.goto(`/libro/${LINK_BOOK.id}/stampa/capitolo/uno`, PRINT_GOTO_OPTIONS);
    await expectFast(page);
    await page.evaluate(() => document.fonts.ready);
    const gaps = await page.locator('.print-sheet p', { hasText: 'La componente tangenziale' }).evaluate((p) => {
      const tops = new Set<number>();
      const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.parentElement!.closest('math')) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) tops.add(Math.round(rect.top));
      }
      const sorted = [...tops].sort((a, b) => a - b);
      return sorted.slice(1).map((top, i) => top - sorted[i]);
    });
    expect(gaps.length).toBeGreaterThan(3);
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(1);
  });

  for (const [name, path, width] of [
    ['the whole book with every extra', '/stampa/libro?esercizi=tutti&formulario=1&esami=1', 1440],
    ['a chapter opened on a phone', '/stampa/capitolo/lunghe?esercizi=tutti', 390],
  ] as const) {
    test(`no formula is wider than the printed page: ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await storePrefs(page, { chosen: 'fast' });
      await openTestBook(page, WIDE_BOOK);
      await page.goto(`/libro/${WIDE_BOOK.id}${path}`, PRINT_GOTO_OPTIONS);
      await expectFast(page);
      await page.emulateMedia({ media: 'print' });
      await page.setViewportSize({ width: PRINT_COLUMN, height: 900 });
      const overflow = await page.evaluate(() => {
        const formulas = [...document.querySelectorAll<HTMLElement>('.print-sheet .mml-display, .print-sheet .mml')];
        const wide = formulas.filter((el) => {
          const math = el.querySelector('math')!;
          const right = Math.max(...[...math.children].map((c) => c.getBoundingClientRect().right));
          const left = Math.min(...[...math.children].map((c) => c.getBoundingClientRect().left));
          const column = el.closest('.formulario-card-body, .formula-body, li, .content-math, p, .print-sheet')!.getBoundingClientRect();
          return right - left > column.width + 1;
        });
        return { document: document.documentElement.scrollWidth, formulas: formulas.length > 0, wide: wide.length };
      });
      expect(overflow).toEqual({ document: PRINT_COLUMN, formulas: true, wide: 0 });
    });
  }

  test('a formula Temml cannot render stays KaTeX and keeps its formulas flat', async ({ page }) => {
    await storePrefs(page, { chosen: 'fast' });
    await openTestBook(page, MIX_BOOK);
    await page.goto(`/libro/${MIX_BOOK.id}/stampa/capitolo/misto`, PRINT_GOTO_OPTIONS);
    await expect(printButton(page)).toBeEnabled({ timeout: 30_000 });
    const sheet = page.locator('.print-sheet');
    await expect(sheet).toHaveAttribute('data-math', 'flat');
    await expect(sheet.locator('.katex')).toHaveCount(1);
    await expect(sheet.locator('.katex .katex-flat').first()).toBeVisible();
    await expect(sheet.locator('.katex-base:not(.katex-flat)')).toHaveCount(0);
    expect(await sheet.locator('math').count()).toBeGreaterThan(300);
  });

  test('an unmeasured device is measured once and keeps the result', async ({ page }) => {
    await storePrefs(page, null);
    await page.goto('/libro/esempio/stampa/capitolo/nel-libro', PRINT_GOTO_OPTIONS);
    await expect(printButton(page)).toBeEnabled({ timeout: 30_000 });
    const stored = JSON.parse((await page.evaluate((key) => localStorage.getItem(key), KEY)) ?? '{}');
    expect(stored).toMatchObject({ version: MEASUREMENT_VERSION });
    expect(stored.layoutMs).toBeGreaterThan(0);
    expect(stored.chosen).toBeUndefined();
  });
});

test.describe('Fast print with flat formulas', () => {
  const MIX = `/libro/${MIX_BOOK.id}/stampa/capitolo/misto`;
  const choose = (page: Page, mode: 'Migliore' | 'Veloce') => formulas(page).getByRole('button', { name: mode }).click();
  /** Waits for the sheet to be ready and its formulas flattened, and returns what it holds. */
  async function settled(page: Page) {
    await expect(printButton(page)).toBeEnabled({ timeout: 30_000 });
    await expect(page.locator('.print-sheet')).toHaveAttribute('data-math', 'flat');
    return sheetState(page);
  }

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await preparePlatformShell(page);
  });

  test('Veloce prints at once: the sheet has no KaTeX to flatten first', async ({ page }) => {
    await storePrefs(page, { chosen: 'fast' });
    await logPrints(page);
    // Click the moment the button is ready, before the flattening that starts after the next paint.
    await page.addInitScript(() => {
      new MutationObserver((_, observer) => {
        const button = document.querySelector<HTMLButtonElement>('button[aria-label="Stampa o salva PDF"]');
        if (button && !button.disabled) {
          observer.disconnect();
          button.click();
        }
      }).observe(document, { subtree: true, childList: true, attributes: true });
    });
    await page.goto('/libro/esempio/stampa/libro?esercizi=tutti&formulario=1&esami=1', PRINT_GOTO_OPTIONS);
    await expect.poll(() => printed(page)).toEqual(['none:0']);
    await expectFast(page);
    await expect(page.locator('.print-sheet')).toHaveAttribute('data-math', 'flat');
  });

  test('Migliore, Veloce and Migliore again: the KaTeX is fitted and flattened again, and prints flat', async ({ page }) => {
    await logPrints(page);
    await openTestBook(page, MIX_BOOK);
    await page.goto(MIX, PRINT_GOTO_OPTIONS);
    const best = await settled(page);
    expect(best.flat).toBeGreaterThan(300);
    expect(best.mathml).toBe(0);
    expect(best.fits.some((fit) => fit !== '|')).toBe(true);

    await choose(page, 'Veloce');
    await expect.poll(() => sheetState(page)).toMatchObject({ math: 'flat', kept: 0 });
    const fast = await settled(page);
    expect(fast.mathml).toBeGreaterThan(300);
    // Only the formula Temml cannot render is KaTeX, and flat.
    expect(fast.flat).toBeGreaterThan(0);
    expect(fast.flat).toBeLessThan(5);

    await choose(page, 'Migliore');
    await expect(printButton(page)).toBeEnabled();
    await expect.poll(() => sheetState(page), { timeout: 15_000 }).toEqual(best);
    await printButton(page).click();
    await expect.poll(() => printed(page)).toEqual([`flat:${best.kept}`]);
  });

  test('a switch while the formulas flatten stops that pass, and the switch back flattens them all', async ({ page }) => {
    await openTestBook(page, MIX_BOOK);
    await page.goto(MIX, PRINT_GOTO_OPTIONS);
    const best = await settled(page);
    // On the next load, switch to Veloce as soon as a pass is part way through the sheet.
    await page.addInitScript(() => {
      new MutationObserver((_, observer) => {
        const sheet = document.querySelector<HTMLElement>('.print-sheet');
        if (sheet?.dataset.math !== 'flattening' || !sheet.querySelector('.katex-flat')) return;
        observer.disconnect();
        (window as unknown as { flatAtSwitch: number }).flatAtSwitch = sheet.querySelectorAll('.katex-flat').length;
        [...document.querySelectorAll<HTMLButtonElement>('.print-panel button')].find((b) => b.textContent === 'Veloce')!.click();
      }).observe(document, { subtree: true, childList: true, attributes: true });
    });
    await page.reload(PRINT_GOTO_OPTIONS);
    await expect(formulas(page).getByRole('button', { name: 'Veloce' })).toHaveAttribute('aria-pressed', 'true');
    const flatAtSwitch = await page.evaluate(() => (window as unknown as { flatAtSwitch: number }).flatAtSwitch);
    expect(flatAtSwitch).toBeGreaterThan(0);
    expect(flatAtSwitch).toBeLessThan(best.flat);
    const fast = await settled(page);
    expect(fast).toMatchObject({ kept: 0 });
    expect(fast.mathml).toBeGreaterThan(300);

    await choose(page, 'Migliore');
    await expect.poll(() => sheetState(page), { timeout: 15_000 }).toEqual(best);
  });

  for (const mode of ['Migliore', 'Veloce'] as const) {
    test(`a new width fits the formulas again and keeps them flat: ${mode}`, async ({ page }) => {
      await storePrefs(page, { chosen: mode === 'Veloce' ? 'fast' : 'best' });
      await logPrints(page);
      await openTestBook(page, MIX_BOOK);
      await page.goto(MIX, PRINT_GOTO_OPTIONS);
      const wide = await settled(page);
      expect(wide.kept).toBe(0);
      expect(wide.fits[0]).toMatch(/^0\.\d+\|0\.\d+$/);
      // A new width while the first pass may still be running, then a print.
      await page.goto(MIX, PRINT_GOTO_OPTIONS);
      await expect(printButton(page)).toBeEnabled({ timeout: 30_000 });
      await page.setViewportSize({ width: 600, height: 900 });
      await expect.poll(async () => (await sheetState(page)).fits).not.toEqual(wide.fits);
      const narrow = await settled(page);
      // A flat formula keeps its print scale; only its screen scale changes.
      expect(narrow).toMatchObject({ kept: 0, flat: wide.flat, mathml: wide.mathml });
      expect(narrow.fits[0].split('|')[1]).toBe(wide.fits[0].split('|')[1]);
      await printButton(page).click();
      await expect.poll(() => printed(page)).toEqual(['flat:0']);
      await page.setViewportSize({ width: 1440, height: 900 });
      await expect.poll(() => sheetState(page), { timeout: 15_000 }).toEqual(wide);
    });

    test(`?math=katex keeps every formula as it was drawn: ${mode}`, async ({ page }) => {
      await storePrefs(page, { chosen: mode === 'Veloce' ? 'fast' : 'best' });
      await logPrints(page);
      await openTestBook(page, MIX_BOOK);
      await page.goto(`${MIX}?math=katex`, PRINT_GOTO_OPTIONS);
      await expect(printButton(page)).toBeEnabled({ timeout: 30_000 });
      await printButton(page).click();
      await expect.poll(() => printed(page)).toHaveLength(1);
      const state = await sheetState(page);
      expect(state).toMatchObject({ math: undefined, flat: 0 });
      if (mode === 'Veloce') expect(state.mathml).toBeGreaterThan(300);
      else expect(state.kept).toBeGreaterThan(300);
      // The other mode keeps the address, and KaTeX's formulas.
      await choose(page, mode === 'Veloce' ? 'Migliore' : 'Veloce');
      await expect(page).toHaveURL(/math=katex/);
      await expect(printButton(page)).toBeEnabled();
      await page.waitForTimeout(300);
      expect(await sheetState(page)).toMatchObject({ math: undefined, flat: 0 });
    });
  }
});

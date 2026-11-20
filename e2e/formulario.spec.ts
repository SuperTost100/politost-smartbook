import { test, expect, type Page } from '@playwright/test';
import { preparePlatformShell, PRINT_GOTO_OPTIONS } from './helpers/platform';
import { openTestBook, WIDE_BOOK, type TestBook } from './helpers/books';

const index = (page: Page) => page.getByRole('navigation', { name: 'Formule per capitolo' });
const title = (page: Page) => page.getByRole('heading', { level: 1 });
const rows = (page: Page) => page.locator('.sb-fcard-row');

/** Formulas in one chapter only: the sheet stays one page without the index. */
const ONE_CHAPTER_BOOK: TestBook = {
  id: 'un-capitolo',
  title: 'Un capitolo di formule',
  chapters: [
    {
      id: 'primo',
      number: 1,
      title: 'Primo',
      markdown: ['---', 'chapter: 1', 'title: Primo', '---', '', '## p1 | Testo', '', ':::formula{id="1.1" label="Somma"}', '$$s = a + b$$', ':::', ''].join('\n'),
    },
    {
      id: 'secondo',
      number: 2,
      title: 'Secondo',
      markdown: ['---', 'chapter: 2', 'title: Secondo', '---', '', '## p1 | Testo', '', 'Nessuna formula numerata qui.', ''].join('\n'),
    },
  ],
};

test.describe('Formula sheet by chapter', () => {
  test.beforeEach(async ({ page }) => {
    await preparePlatformShell(page);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('the section opens on the first chapter with formulas and names it', async ({ page }) => {
    await page.goto('/libro/esempio/formulario');
    await expect(page).toHaveURL(/\/formulario\?capitolo=2$/);
    await expect(title(page)).toHaveText('Cosa trovi nel libro');
    await expect(page.locator('.sb-chhead .sb-eyebrow')).toHaveText('Capitolo 2');
    await expect(page.locator('.sb-chhead')).toContainText('2 formule');
    await expect(index(page).locator('[aria-current="page"]')).toContainText('Cosa trovi nel libro');
    // Chapter 1 has no formulas: listed, not a link.
    await expect(index(page).locator('[aria-disabled="true"]')).toHaveText(/Benvenuto\s*0/);
    await expect(index(page).getByRole('link', { name: /Tutte\s*3 formule/ })).toBeVisible();
    await expect(rows(page)).toHaveCount(2);
    await expect(page).toHaveTitle('2. Cosa trovi nel libro · Formulario · Guida di esempio · PoliTost Smartbook');
  });

  test('the section opens on the chapter the student was reading, or the first with formulas', async ({ page }) => {
    const readAt = async (chapterId: string, chapterNumber: number) => {
      await page.evaluate(([id, n]) => {
        localStorage.setItem('politost-last-read', JSON.stringify({
          esempio: { chapterId: id, chapterNumber: n, chapterTitle: 'x', readAt: 1 },
        }));
      }, [chapterId, chapterNumber] as const);
    };
    const tab = page.getByRole('navigation', { name: 'Sezioni del libro' }).getByRole('link', { name: 'Formulario' });
    await page.goto('/libro/esempio/esercizi');
    await readAt('prova-tu', 3);
    await tab.click();
    await expect(page).toHaveURL(/\/formulario\?capitolo=3$/);
    await expect(title(page)).toHaveText('Prova tu');

    // The chapter last read has no formulas.
    await page.goto('/libro/esempio/esercizi');
    await readAt('benvenuto', 1);
    await tab.click();
    await expect(page).toHaveURL(/\/formulario\?capitolo=2$/);
  });

  test('choosing a chapter moves focus to its title, and the pager and the back button follow', async ({ page }) => {
    await page.goto('/libro/esempio/formulario?capitolo=2');
    const pager = page.getByRole('navigation', { name: 'Altri capitoli' });
    // Chapter 1 has no formulas, so there is nothing before chapter 2.
    await expect(pager.getByRole('link')).toHaveCount(1);
    await pager.getByRole('link', { name: /Capitolo successivo · 1 formula/ }).click();
    await expect(page).toHaveURL(/\/formulario\?capitolo=3$/);
    await expect(title(page)).toHaveText('Prova tu');
    await expect(title(page)).toBeFocused();
    await expect(rows(page)).toHaveCount(1);
    await expect(pager.getByRole('link', { name: /Capitolo precedente · 2 formule/ })).toBeVisible();

    await index(page).getByRole('link', { name: /Cosa trovi nel libro/ }).click();
    await expect(page).toHaveURL(/capitolo=2$/);
    await expect(title(page)).toBeFocused();
    await page.goBack();
    await expect(page).toHaveURL(/capitolo=3$/);
    await expect(title(page)).toHaveText('Prova tu');
  });

  test('"Tutte" shows every chapter with formulas under its own heading', async ({ page }) => {
    await page.goto('/libro/esempio/formulario?capitolo=tutte');
    await expect(title(page)).toHaveText('Formulario');
    await expect(page.locator('.sb-chhead .sb-eyebrow')).toHaveCount(0);
    await expect(page.locator('.sb-fcard-head h2')).toHaveText(['Cosa trovi nel libro', 'Prova tu']);
    await expect(rows(page)).toHaveCount(3);
    await expect(index(page).getByRole('link', { name: /Tutte/ })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('navigation', { name: 'Altri capitoli' })).toHaveCount(0);
    await expect(page).toHaveTitle('Formulario · Guida di esempio · PoliTost Smartbook');
    await page.locator('.sb-fcard-head').getByRole('link', { name: 'Prova tu' }).click();
    await expect(page).toHaveURL(/capitolo=3$/);
  });

  test('a link to one formula opens its chapter and lands on it', async ({ page }) => {
    await page.goto('/libro/esempio/formulario?capitolo=2#formula-3.1');
    await expect(page).toHaveURL(/\/formulario\?capitolo=3#formula-3\.1$/);
    await expect(page.locator('[id="formula-3.1"]')).toBeInViewport();

    // The in-text link of a chapter, `ref:formula/2.1`.
    await page.goto('/libro/esempio/capitolo/nel-libro');
    await page.locator('.smartbook-ref', { hasText: 'formulario' }).click();
    await expect(page).toHaveURL(/\/formulario\?capitolo=2#formula-2\.1$/);
    await expect(page.locator('[id="formula-2.1"]')).toBeInViewport();
    // A row opens the formula in its chapter.
    await page.locator('[id="formula-2.1"]').getByRole('link', { name: /Velocità media/ }).click();
    await expect(page).toHaveURL(/\/capitolo\/nel-libro#formula-2\.1$/);
  });

  test('a formula reference in an exercise opens the formula sheet on that formula', async ({ page }) => {
    await page.goto('/libro/esempio/esercizi?capitolo=3');
    await page.locator('.sb-ex').first().getByRole('button', { name: 'Mostra suggerimento' }).click();
    await page.locator('.sb-ex .sb-fref-chip').first().click();
    await page.getByRole('button', { name: 'Apri nel formulario' }).click();
    await expect(page).toHaveURL(/\/formulario\?capitolo=3#formula-3\.1$/);
    await expect(page.locator('[id="formula-3.1"]')).toBeInViewport();
  });

  test('the end of a chapter links its formulas', async ({ page }) => {
    await page.goto('/libro/esempio/capitolo/prova-tu', PRINT_GOTO_OPTIONS);
    await page.getByRole('navigation', { name: 'Ripassa ed esercitati' }).getByRole('link', { name: /Formule di questo capitolo.*1 formula/ }).click();
    await expect(page).toHaveURL(/\/formulario\?capitolo=3$/);
    await expect(title(page)).toHaveText('Prova tu');
  });

  test('printing prints the chapter on screen, or every chapter with formulas', async ({ page }) => {
    await page.goto('/libro/esempio/formulario?capitolo=3');
    await page.getByRole('banner').getByRole('button', { name: 'Versione stampabile' }).click();
    await expect(page).toHaveURL(/\/stampa\/formulario\?capitolo=3&return=/);
    const sheet = page.locator('.print-sheet');
    await expect(sheet.locator('.print-opener-title')).toHaveText('Formulario · Capitolo 3. Prova tu');
    await expect(sheet.locator('.formulario-card')).toHaveCount(1);
    await expect(sheet.locator('[id="formula-3.1"]')).toBeVisible();
    // The title names the chapter, so it has no heading of its own.
    await expect(sheet.locator('.formulario-chapter h3')).toHaveCount(0);
    await expect(page).toHaveTitle(/^Guida di esempio · Formulario · Capitolo 3\. Prova tu/);
    await page.getByRole('link', { name: 'Torna al libro' }).click();
    await expect(page).toHaveURL(/\/formulario\?capitolo=3$/);

    await page.goto('/libro/esempio/stampa/formulario?capitolo=tutte', PRINT_GOTO_OPTIONS);
    await expect(sheet.locator('.print-opener-title')).toHaveText('Formulario');
    await expect(sheet.locator('.formulario-chapter h3')).toHaveText(['Capitolo 2. Cosa trovi nel libro', 'Capitolo 3. Prova tu']);
  });

  test('a book whose formulas fill one chapter keeps a single page without the index', async ({ page }) => {
    await openTestBook(page, ONE_CHAPTER_BOOK);
    await page.goto(`/libro/${ONE_CHAPTER_BOOK.id}/formulario`);
    await expect(page).toHaveURL(/\/formulario$/);
    await expect(title(page)).toHaveText('formulario');
    await expect(index(page)).toHaveCount(0);
    await expect(page.locator('.sb-fcard-head h2')).toHaveText(['Primo', 'Secondo']);
    await expect(page.getByRole('navigation', { name: 'Altri capitoli' })).toHaveCount(0);
  });
});

test('back to "Tutte" after opening a formula far down shows the same row at the same place', async ({ page }) => {
  // Ten chapters of formulas: the cards of "Tutte" appear one after another.
  const book: TestBook = {
    id: 'molte-formule',
    title: 'Molte formule',
    chapters: Array.from({ length: 10 }, (_, c) => ({
      id: `c${c + 1}`, number: c + 1, title: `Capitolo ${c + 1}`,
      markdown: [`---\nchapter: ${c + 1}\ntitle: Capitolo ${c + 1}\n---\n`, '## p1 | Formule\n',
        ...Array.from({ length: 25 }, (_, f) => `:::formula{id="${c + 1}.${f + 1}" label="Formula ${f + 1}"}\n$$y = ${f + 1}x + ${c}$$\n:::\n`)].join('\n'),
    })),
  };
  await preparePlatformShell(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openTestBook(page, book);
  await page.goto(`/libro/${book.id}/formulario?capitolo=tutte`);
  const row = page.locator('[id="formula-8.12"]');
  await row.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForTimeout(500);
  const before = await row.evaluate((el) => Math.round(el.getBoundingClientRect().top));
  await row.locator('a').click();
  await expect(page).toHaveURL(/\/capitolo\/c8#formula-8\.12$/);
  await expect(page.locator('.paragraph-section')).toHaveCount(1);
  await page.goBack();
  await expect(page).toHaveURL(/capitolo=tutte$/);
  await expect.poll(() => row.evaluate((el) => Math.round(el.getBoundingClientRect().top))).toBe(before);
});

test.describe('Formula sheet on a phone', () => {
  test.beforeEach(async ({ page }) => {
    await preparePlatformShell(page);
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test('the chapter control and the menu button open the formula index', async ({ page }) => {
    await page.goto('/libro/esempio/formulario?capitolo=2');
    const picker = page.getByRole('button', { name: /^Capitolo 2 di 3.*scegli il capitolo/ });
    await expect(picker).toHaveAttribute('aria-expanded', 'false');
    await picker.click();
    const drawer = page.getByRole('dialog', { name: 'Guida di esempio' });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('navigation', { name: 'Formule per capitolo' })).toBeVisible();
    await expect(drawer.locator('[aria-current="page"]')).toBeFocused();
    await drawer.getByRole('link', { name: /Prova tu/ }).click();
    await expect(page).toHaveURL(/capitolo=3$/);
    await expect(drawer).toBeHidden();
    await expect(page.getByRole('button', { name: /^Capitolo 3 di 3.*scegli il capitolo/ })).toBeFocused();

    await page.getByRole('button', { name: 'Apri indice formule' }).click();
    await expect(drawer).toBeVisible();
    await drawer.getByRole('link', { name: /Tutte/ }).click();
    await expect(page).toHaveURL(/capitolo=tutte$/);
    await expect(page.getByRole('button', { name: /^Tutti i capitoli.*scegli il capitolo/ })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBe(false);
  });
});

test.describe('Formulas that scroll sideways in the reader', () => {
  test.beforeEach(async ({ page }) => {
    await preparePlatformShell(page);
    await openTestBook(page, WIDE_BOOK);
    await page.setViewportSize({ width: 375, height: 812 });
  });

  test('in a chapter, only the formulas that scroll are named tab stops', async ({ page }) => {
    await page.goto(`/libro/${WIDE_BOOK.id}/capitolo/lunghe`);
    await expect(page.locator('.sb-formula').first()).toBeVisible();
    const report = await page.evaluate(() => {
      const boxes = [...document.querySelectorAll<HTMLElement>('.sb-prose .content-math, .sb-prose .katex-block, .sb-formula-math')];
      const scrolls = (el: HTMLElement) => el.scrollWidth > el.clientWidth + 1;
      const inner = (el: HTMLElement) => !el.querySelector('.content-math, .katex-block');
      return {
        scrolling: boxes.filter((el) => scrolls(el) && inner(el)).length,
        stops: document.querySelectorAll('.sb-prose [tabindex="0"]').length,
        stopsThatDoNotScroll: [...document.querySelectorAll<HTMLElement>('.sb-prose [tabindex="0"]')].filter((el) => !scrolls(el)).length,
      };
    });
    expect(report.scrolling).toBeGreaterThan(0);
    // Each scrolling display formula, plus the inline one that scrolls in its line.
    expect(report.stops).toBe(report.scrolling + 1);
    expect(report.stopsThatDoNotScroll).toBe(0);

    const wide = page.getByRole('group', { name: 'Formula 1.3: Una formula numerata larghissima' });
    await expect(wide).toHaveAttribute('tabindex', '0');
    await expect(page.locator('.sb-formula-math[data-formula-id="1.2"]')).not.toHaveAttribute('tabindex');
    await wide.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => wide.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);

    // On a computer the medium formula fits: it leaves the Tab order.
    const medium = page.locator('.sb-formula-math[data-formula-id="1.4"]');
    await expect(medium).toHaveAttribute('aria-label', 'Formula 1.4: Una formula numerata media');
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(medium).not.toHaveAttribute('tabindex');
    await expect(medium).not.toHaveAttribute('role');
    await expect(medium).not.toHaveAttribute('aria-label');
  });

  test('in the formula sheet a scrolling formula scrolls in its row without opening the chapter', async ({ page }) => {
    await page.goto(`/libro/${WIDE_BOOK.id}/formulario?capitolo=1`);
    const wide = page.getByRole('group', { name: 'Formula 1.3: Una formula numerata larghissima' });
    await expect(wide).toHaveAttribute('tabindex', '0');
    await expect(page.locator('.sb-fcard-math[data-formula-id="1.2"]')).not.toHaveAttribute('tabindex');
    await wide.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => wide.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    await wide.click();
    await expect(page).toHaveURL(/\/formulario\?capitolo=1$/);
    // The row's link still opens it.
    await page.locator('[id="formula-1.3"]').getByRole('link').click();
    await expect(page).toHaveURL(/\/capitolo\/lunghe#formula-1\.3$/);
  });
});

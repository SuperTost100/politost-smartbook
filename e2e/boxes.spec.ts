import { test, expect } from '@playwright/test';
import { BOXES_BOOK, openTestBook } from './helpers/books';
import { preparePlatformShell, PRINT_GOTO_OPTIONS } from './helpers/platform';

const chapter = `/libro/${BOXES_BOOK.id}/capitolo/riquadri`;
/** The printed text column: A4 less the 18 mm side margins, in CSS px. */
const PRINT_COLUMN = Math.floor((174 * 96) / 25.4);

test.describe('Boxes in chapter text', () => {
  test.beforeEach(async ({ page }) => {
    await preparePlatformShell(page);
    await openTestBook(page, BOXES_BOOK);
    await page.goto(chapter);
    await expect(page.locator('.sb-box').first()).toBeVisible();
  });

  test('each box is a group named by its kind, number and name', async ({ page }) => {
    const definition = page.getByRole('group', { name: 'Definizione 1.1 palla', exact: true });
    await expect(definition).toHaveAttribute('id', 'definizione-1.1');
    await expect(definition).toHaveClass(/sb-box--tinted/);
    const theorem = page.getByRole('group', { name: 'Teorema 1.2 di Weierstrass', exact: true });
    await expect(theorem).toHaveAttribute('id', 'teorema-1.2');
    // A lemma shares the theorems' numbering, so it shares their id prefix.
    await expect(page.getByRole('group', { name: 'Lemma 1.3', exact: true })).toHaveAttribute('id', 'teorema-1.3');
    await expect(page.getByRole('group', { name: 'Esempio 1.1', exact: true })).toHaveClass(/sb-box--line/);
    await expect(page.getByRole('group', { name: 'Errore tipico 1.1', exact: true })).toHaveAttribute('id', 'errore-1.1');
    await expect(page.getByRole('group', { name: 'Osservazione', exact: true })).not.toHaveAttribute('id');

    // The formula keeps its plate and number inside the theorem, without the label that repeats the title.
    const formula = theorem.locator('#formula-1\\.1');
    await expect(formula.locator('.sb-formula-num')).toHaveText('(1.1)');
    await expect(formula.locator('.sb-formula-label')).toHaveCount(0);
    // The number of a box is never a bare chip: it sits in the label after the word.
    await expect(theorem.locator('.sb-box-label')).toHaveText('Teorema 1.2');
  });

  test('the proof is open, and closes and opens again from the keyboard', async ({ page }) => {
    const proof = page.locator('#teorema-1\\.2 details.sb-box-proof');
    const toggle = proof.locator('summary');
    const body = proof.getByText('Si usa la compattezza');
    await expect(body).toBeVisible();

    await toggle.focus();
    await expect(toggle).toHaveCSS('outline-style', 'solid');
    await page.keyboard.press('Enter');
    await expect(body).toBeHidden();
    await expect(toggle).toContainText('Mostra');
    await page.keyboard.press('Space');
    await expect(body).toBeVisible();
    await expect(toggle).toContainText('Nascondi');
  });

  test('a formula reference inside a box opens its popover', async ({ page }) => {
    await page.locator('#teorema-1\\.2 .sb-fref-chip').click();
    await expect(page.locator('.sb-fref-pop')).toBeVisible();
    await expect(page.locator('.sb-fref-pop')).toContainText('1.1');
  });
});

test.describe('Boxes in print', () => {
  test.beforeEach(async ({ page }) => {
    await preparePlatformShell(page);
    await openTestBook(page, BOXES_BOOK);
  });

  test('the print route draws the boxes, with every proof open and wide formulas fitted to the box', async ({ page }) => {
    // Opened on a phone: the box's padding must still come off the printed column.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/libro/${BOXES_BOOK.id}/stampa/capitolo/riquadri`, PRINT_GOTO_OPTIONS);
    await expect(page.getByRole('button', { name: 'Stampa o salva PDF' })).toBeEnabled({ timeout: 30_000 });
    const sheet = page.locator('.print-sheet');
    await expect(sheet.locator('.sb-box--tinted[data-box="definition"] .sb-box-label')).toHaveText('Definizione 1.1');
    await expect(sheet.locator('#teorema-1\\.2 .sb-box-proof')).toContainText('Si usa la compattezza');
    await expect(sheet.locator('details, summary')).toHaveCount(0);
    // The label row stays with the first lines.
    await expect(sheet.locator('.sb-box-head').first()).toHaveCSS('break-after', 'avoid');

    // In print media the sheet takes the viewport's width: make it the printed column.
    await page.emulateMedia({ media: 'print' });
    await page.setViewportSize({ width: PRINT_COLUMN, height: 900 });
    const fit = await sheet.locator('#teorema-1\\.4').evaluate((box) => {
      const main = box.querySelector('.sb-box-main')!;
      const style = getComputedStyle(main);
      const column = main.getBoundingClientRect().width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
        - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth);
      const formula = box.querySelector('.katex-display > .katex .katex-html')!.getBoundingClientRect().width;
      return { column, formula };
    });
    expect(fit.formula).toBeGreaterThan(0);
    expect(fit.formula).toBeLessThanOrEqual(fit.column + 1);
    expect(fit.column).toBeLessThan(PRINT_COLUMN - 20);
  });
});

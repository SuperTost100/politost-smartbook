/** The printed text column: A4 less the 18 mm side margins of `@page` (PrintDocument), in CSS px. */
const PRINT_COLUMN = (174 * 96) / 25.4;
const SCREEN_FIT = '--display-fit';
const PRINT_FIT = '--display-fit-print';
const WIDE_CARD = 'formulario-card--wide';
/** Corrections after the first estimate; one is usually enough. */
const PASSES = 4;

interface Display {
  el: HTMLElement;
  html: HTMLElement;
  /** Width at full size. */
  natural: number;
  /** The column it has on screen and on the page. */
  screen: number;
  print: number;
}

/**
 * The scale at which each formula fits `column(d)`. Glyph advances snap to whole pixels at some
 * sizes, so a formula does not shrink exactly in proportion: each estimate is measured on screen
 * (through the screen variable, which `scrollWidth` reads whatever the container) and corrected.
 */
function fits(displays: Display[], column: (d: Display) => number): Map<Display, number> {
  const result = new Map<Display, number>();
  for (const d of displays) if (d.natural > column(d)) result.set(d, column(d) / d.natural);
  let pending = [...result.keys()];
  for (let pass = 0; pass < PASSES && pending.length > 0; pass++) {
    for (const d of pending) d.el.style.setProperty(SCREEN_FIT, String(result.get(d)));
    const measured = pending.map((d) => [d, d.html.scrollWidth] as const);
    pending = [];
    for (const [d, w] of measured) {
      if (w <= column(d)) continue;
      result.set(d, (result.get(d) ?? 1) * (column(d) / w) - 0.005);
      pending.push(d);
    }
  }
  for (const d of result.keys()) d.el.style.removeProperty(SCREEN_FIT);
  return result;
}

function horizontalChrome(el: Element): number {
  const style = getComputedStyle(el);
  return (
    parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) +
    parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth)
  );
}

/** The width of a formula's own boxes; `scrollWidth` would report its whole column when it fits. */
function contentWidth(html: HTMLElement | null): number {
  if (!html) return 0;
  let left = Infinity;
  let right = -Infinity;
  for (const box of html.children) {
    const rect = box.getBoundingClientRect();
    left = Math.min(left, rect.left);
    right = Math.max(right, rect.right);
  }
  return right > left ? right - left : 0;
}

/**
 * Formula-sheet cards print two to a row. A card whose formula is wider than half the printed row
 * spans the whole row, and the formula is fitted to that. The span is decided for the page, so a
 * phone (one card per row on screen) prints the same rows as a computer.
 */
function cardColumns(root: Element, toPrint: number): Map<HTMLElement, number> {
  const columns = new Map<HTMLElement, number>();
  const cards = [...root.querySelectorAll<HTMLElement>('.formula-grid > .formulario-card')];
  for (const card of cards) card.classList.remove(WIDE_CARD);
  const measured = cards.map((card) => {
    const grid = card.parentElement!;
    const row = grid.clientWidth + toPrint;
    const half = (row - parseFloat(getComputedStyle(grid).columnGap)) / 2;
    const chrome = horizontalChrome(card);
    const natural = contentWidth(card.querySelector<HTMLElement>('.katex-display .katex-html'));
    return { card, wide: natural + chrome > half, column: (natural + chrome > half ? row : half) - chrome };
  });
  for (const { card, wide, column } of measured) {
    card.classList.toggle(WIDE_CARD, wide);
    columns.set(card, column);
  }
  return columns;
}

/** Fits the display formulas under `root`, whose sheet is `toPrint` px narrower than the page. */
function fitPart(root: Element, toPrint: number): void {
  const elements = [...root.querySelectorAll<HTMLElement>('.katex-display')];
  // Measure every formula at full size: clear the previous fit first, then read, then write.
  for (const el of elements) {
    el.style.removeProperty(SCREEN_FIT);
    el.style.removeProperty(PRINT_FIT);
  }
  const cards = cardColumns(root, toPrint);
  const displays: Display[] = [];
  for (const el of elements) {
    const html = el.querySelector<HTMLElement>('.katex-html');
    if (!html) continue;
    const card = el.closest<HTMLElement>('.formulario-card');
    const screen = el.clientWidth;
    displays.push({ el, html, natural: html.scrollWidth, screen, print: (card && cards.get(card)) ?? screen + toPrint });
  }

  const print = fits(displays, (d) => d.print);
  // On a sheet as wide as the page (any screen from 860px) the two columns are the same.
  const screen = toPrint < 1 ? print : fits(displays, (d) => d.screen);
  const round = (fit: number) => (Math.floor(fit * 1000) / 1000).toString();
  for (const [d, fit] of print) d.el.style.setProperty(PRINT_FIT, round(fit));
  for (const [d, fit] of screen) d.el.style.setProperty(SCREEN_FIT, round(fit));
}

/**
 * Chromium shrinks the whole printed document when anything in it is wider than the page, so one
 * long formula would print a whole book at 80%. Each display formula wider than its column is
 * scaled down to fit it instead: on screen to the sheet, in print to the page. The print column is
 * the screen column plus the difference between the page and the sheet, because what sits between
 * the sheet and a formula (cards, list indents, the solution id column) has a fixed width.
 *
 * Measuring lays out the parts kept off screen (`content-visibility: auto`), which takes seconds
 * for a whole book, so it goes one part per task and the page keeps answering input.
 */
export async function fitWideFormulas(sheet: HTMLElement, cancelled: () => boolean = () => false): Promise<void> {
  const style = getComputedStyle(sheet);
  const column = sheet.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  // The sheet is never wider than the page; a fraction of a pixel either way is rounding.
  const toPrint = Math.max(0, PRINT_COLUMN - column);
  for (const part of sheet.querySelectorAll('.print-part')) {
    if (cancelled()) return;
    fitPart(part, toPrint);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

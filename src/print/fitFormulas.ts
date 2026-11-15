import { formulaName, markScrolling } from '../lib/scrollableMath';

/** The printed text column: A4 less the 18 mm side margins of `@page` (PrintDocument), in CSS px. */
const PRINT_COLUMN = (174 * 96) / 25.4;
const SCREEN_FIT = '--display-fit';
const PRINT_FIT = '--display-fit-print';
const INLINE_PRINT_FIT = '--inline-fit-print';
const WIDE_CARD = 'formulario-card--wide';
/** Corrections after the first estimate: one is usually enough, a formula scaled to a few px can need more. */
const PASSES = 8;
/**
 * Scales are tried on steps of 0.005, rounded down. A formula sits at a slightly different fraction of
 * a pixel at each preview width, and glyphs snap to whole pixels, so its measured width can differ by
 * a pixel: on fixed steps it still lands on the same print scale.
 */
const STEP = 0.005;
const onStep = (fit: number) => Math.floor(fit / STEP + 1e-6) * STEP;
/** How far a width measured in place can be off: formulas this close to their column are measured as copies. */
const IN_PLACE_MARGIN = 2;
/**
 * The smallest font size a formula is scaled to on screen: 12px, the sheet's 9pt small text (figure
 * captions, formula labels). A display formula starts at 17.75px (11pt body text at KaTeX's 1.21em),
 * so on screen it shrinks to about 68% at most; a wider one keeps that size and scrolls in its box.
 * Print has no such floor: on paper a formula fits the page whatever its scale.
 */
export const READABLE_FORMULA_PX = 12;

interface Formula {
  /** Where the fit goes: the `.katex-display`, or an inline `.katex`. */
  el: HTMLElement;
  /** Its font size at full scale, in px. */
  size: number;
  /** Width at full size. */
  natural: number;
  /** A copy laid out in the measuring box, for the formulas that may need a scale; null for the others. */
  copy: HTMLElement | null;
  /** The width of the copy at its current font size. */
  measure: () => number;
  /** The column it has on screen and on the page. */
  screen: number;
  print: number;
}

/**
 * The scale at which each formula fits `column(f)`. Glyph advances snap to whole pixels at some
 * sizes, so a formula does not shrink exactly in proportion: each estimate is applied to the formula's
 * copy as a font size, measured and corrected. The formula itself is never touched, so neither result
 * depends on the other or on what the screen shows.
 */
function fits(formulas: Formula[], column: (f: Formula) => number): Map<Formula, number> {
  const result = new Map<Formula, number>();
  for (const f of formulas) if (f.copy && f.natural > column(f)) result.set(f, onStep(column(f) / f.natural));
  let pending = [...result.keys()];
  for (let pass = 0; pass < PASSES && pending.length > 0; pass++) {
    for (const f of pending) f.copy!.style.fontSize = `${f.size * (result.get(f) ?? 1)}px`;
    const measured = pending.map((f) => [f, f.measure()] as const);
    pending = [];
    for (const [f, w] of measured) {
      if (w <= column(f)) continue;
      const fit = result.get(f) ?? 1;
      const next = onStep((fit * column(f)) / w);
      result.set(f, next < fit ? next : fit - STEP);
      pending.push(f);
    }
  }
  for (const f of result.keys()) f.copy!.style.fontSize = `${f.size}px`;
  return result;
}

/**
 * A formula's width depends by up to a pixel on where it sits, because glyphs snap to whole pixels,
 * so the same formula would get another print scale at another preview width. The formulas that may
 * need a scale are measured as copies in one box at the top left corner of the viewport, at full size
 * and whatever box the formula sits in on screen. The box is hidden and removed in the same task.
 */
function measuringBox(sheet: Element): HTMLElement {
  const box = document.createElement('div');
  box.setAttribute('aria-hidden', 'true');
  box.style.cssText = 'position:fixed;left:0;top:0;width:max-content;visibility:hidden;pointer-events:none;white-space:nowrap';
  sheet.append(box);
  return box;
}

/** A copy of `katex` at `size` px, in a display box when `display`, so it lays out as the formula does. */
function copyInto(box: HTMLElement, katex: HTMLElement, size: number, display: boolean): HTMLElement {
  const wrapper = document.createElement(display ? 'div' : 'span');
  wrapper.style.cssText = 'display:block;width:max-content;margin:0';
  if (display) wrapper.className = 'katex-display';
  const copy = katex.cloneNode(true) as HTMLElement;
  // An inline formula carries its scrolling state; the copy lays out as plain math.
  for (const name of ['data-wide', 'data-print-fit', 'tabindex', 'role', 'aria-label']) copy.removeAttribute(name);
  copy.style.fontSize = `${size}px`;
  wrapper.append(copy);
  box.append(wrapper);
  return copy;
}

/** The width the text has: that of the nearest ancestor that is not an inline box, inside its padding. */
function lineWidth(el: HTMLElement): number {
  let block = el.parentElement;
  while (block && getComputedStyle(block).display.startsWith('inline')) block = block.parentElement;
  if (!block) return Infinity;
  return contentBoxWidth(block);
}

/** An inline formula breaks only between its segments, so its widest segment is what must fit. */
function widestSegment(katex: HTMLElement): number {
  let widest = 0;
  for (const base of katex.querySelectorAll<HTMLElement>('.katex-base')) widest = Math.max(widest, base.getBoundingClientRect().width);
  return widest;
}

/**
 * The width inside padding and border, to the fraction of a pixel: `clientWidth` rounds, and a column
 * off by half a pixel would give a formula a different print scale at another preview width.
 */
function contentBoxWidth(el: Element): number {
  return el.getBoundingClientRect().width - horizontalChrome(el);
}

function horizontalChrome(el: Element): number {
  const style = getComputedStyle(el);
  return (
    parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) +
    parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth)
  );
}

/**
 * The width of a formula's own boxes, the same whatever box it sits in. `scrollWidth` would not do:
 * KaTeX's `.katex-html` is a block, so it reports at least the width of its container, and a formula
 * measured in a screen box wider than its printed column would never seem to fit. A line break
 * (`.katex-newline`) is a block as wide as the container, so it is left out; an equation tag sits
 * at the container's edge, so it counts with its own width.
 */
function contentWidth(html: HTMLElement | null): number {
  if (!html) return 0;
  let left = Infinity;
  let right = -Infinity;
  let tags = 0;
  for (const box of html.children) {
    if (box.classList.contains('katex-newline')) continue;
    const rect = box.getBoundingClientRect();
    if (box.classList.contains('katex-tag')) {
      tags += rect.width;
      continue;
    }
    left = Math.min(left, rect.left);
    right = Math.max(right, rect.right);
  }
  return (right > left ? right - left : 0) + tags;
}

interface CardRow {
  /** The printed row, half of it, and the card's padding and border. */
  row: number;
  half: number;
  chrome: number;
}

/**
 * Formula-sheet cards print two to a row. A card whose formula is wider than half the printed row
 * spans the whole row, and the formula is fitted to that. The span is decided for the page, so a
 * phone (one card per row on screen) prints the same rows as a computer.
 */
function cardRows(root: Element, toPrint: number): Map<HTMLElement, CardRow> {
  const rows = new Map<HTMLElement, CardRow>();
  for (const card of root.querySelectorAll<HTMLElement>('.formula-grid > .formulario-card')) {
    const grid = card.parentElement!;
    const row = contentBoxWidth(grid) + toPrint;
    rows.set(card, { row, half: (row - parseFloat(getComputedStyle(grid).columnGap)) / 2, chrome: horizontalChrome(card) });
  }
  return rows;
}

/** The name a scrolling formula gets: "Formula 4.1: label" for a numbered one, as in the reader. */
function printFormulaName(el: HTMLElement): string {
  const numbered = el.closest<HTMLElement>('.numbered-formula[data-formula-id]');
  if (numbered) {
    const id = numbered.dataset.formulaId ?? '';
    return formulaName(id, numbered.querySelector('.formula-header')?.textContent?.replace(`(${id})`, '').trim());
  }
  const card = el.closest<HTMLElement>('.formulario-card');
  if (card) return formulaName(card.id.replace(/^formula-/, ''), card.querySelector('.formula-label')?.textContent?.trim());
  return formulaName();
}

const round = (fit: number) => (Math.floor(fit * 1000) / 1000).toString();

/** Fits the formulas under `root`, whose sheet is `toPrint` px narrower than the page (negative: wider). */
function fitPart(root: Element, sheet: Element, toPrint: number): void {
  const displays = [...root.querySelectorAll<HTMLElement>('.katex-display')];
  const inlines = [...root.querySelectorAll<HTMLElement>('.katex')].filter((k) => !k.parentElement?.closest('.katex-display'));
  // Measure every formula at full size: clear the previous fit first, then read, then write.
  for (const el of displays) {
    el.style.removeProperty(SCREEN_FIT);
    el.style.removeProperty(PRINT_FIT);
  }
  for (const el of inlines) el.style.removeProperty(INLINE_PRINT_FIT);
  for (const card of root.querySelectorAll('.formulario-card')) card.classList.remove(WIDE_CARD);

  // A first width in place picks the formulas that may not fit; only those are copied and measured.
  const cards = cardRows(root, toPrint);
  const box = measuringBox(sheet);
  const display = displays.flatMap((el) => {
    const html = el.querySelector<HTMLElement>('.katex-html');
    const katex = el.querySelector<HTMLElement>('.katex');
    if (!html || !katex) return [];
    const card = el.closest<HTMLElement>('.formulario-card');
    const cardRow = card ? cards.get(card) : undefined;
    const screen = contentBoxWidth(el);
    // A card's printed column is half the row, but on a phone its screen box can be narrower still.
    const narrowest = Math.min(screen, cardRow ? cardRow.half - cardRow.chrome : screen + toPrint);
    const size = parseFloat(getComputedStyle(katex).fontSize);
    const inPlace = contentWidth(html);
    const copy = inPlace > narrowest - IN_PLACE_MARGIN ? copyInto(box, katex, size, true) : null;
    return [{ el, card, cardRow, size, inPlace, copy }];
  });
  const inline = inlines.map((katex) => {
    const screen = lineWidth(katex);
    const size = parseFloat(getComputedStyle(katex).fontSize);
    const inPlace = widestSegment(katex);
    const copy = inPlace > Math.min(screen, screen + toPrint) - IN_PLACE_MARGIN ? copyInto(box, katex, size, false) : null;
    return { el: katex, size, inPlace, copy, screen };
  });

  // The copies' widths, then the cards that span the row, then each formula's columns.
  const naturals = new Map<HTMLElement, number>();
  for (const d of display) naturals.set(d.el, d.copy ? contentWidth(d.copy.querySelector('.katex-html')) : d.inPlace);
  for (const i of inline) naturals.set(i.el, i.copy ? widestSegment(i.copy) : i.inPlace);
  const printColumn = new Map<HTMLElement, number>();
  for (const d of display) {
    if (!d.card || !d.cardRow) continue;
    const wide = naturals.get(d.el)! + d.cardRow.chrome > d.cardRow.half;
    d.card.classList.toggle(WIDE_CARD, wide);
    printColumn.set(d.el, (wide ? d.cardRow.row : d.cardRow.half) - d.cardRow.chrome);
  }
  const formulas: Formula[] = display.map((d) => {
    const screen = contentBoxWidth(d.el);
    const copyHtml = d.copy?.querySelector<HTMLElement>('.katex-html') ?? null;
    return {
      el: d.el,
      size: d.size,
      natural: naturals.get(d.el)!,
      copy: d.copy,
      measure: () => contentWidth(copyHtml),
      screen,
      print: printColumn.get(d.el) ?? screen + toPrint,
    };
  });
  const inlineFormulas: Formula[] = inline.map((i) => ({
    el: i.el,
    size: i.size,
    natural: naturals.get(i.el)!,
    copy: i.copy,
    measure: () => (i.copy ? widestSegment(i.copy) : 0),
    screen: i.screen,
    print: i.screen + toPrint,
  }));

  // Whole pixels, rounded down: the same column measured at another preview width can differ by a
  // fraction of a pixel, and the print scale must not.
  const print = fits(formulas, (f) => Math.floor(f.print));
  // On a sheet as wide as the page (any screen from 860px) the two columns are the same.
  const screen = Math.abs(toPrint) < 1 ? print : fits(formulas, (f) => f.screen);
  const inlinePrint = fits(inlineFormulas, (f) => Math.floor(f.print));
  box.remove();

  for (const [f, fit] of print) f.el.style.setProperty(PRINT_FIT, round(fit));
  for (const f of formulas) {
    // On screen a formula shrinks only while it stays readable; below that it scrolls in its box.
    const fit = screen.get(f);
    const readable = fit === undefined || f.size * Number(round(fit)) >= READABLE_FORMULA_PX;
    if (fit !== undefined && readable) f.el.style.setProperty(SCREEN_FIT, round(fit));
    markScrolling(f.el, !readable, printFormulaName);
  }
  for (const f of inlineFormulas) {
    const fit = inlinePrint.get(f);
    if (fit !== undefined) f.el.style.setProperty(INLINE_PRINT_FIT, round(fit));
    f.el.toggleAttribute('data-print-fit', fit !== undefined);
    // As in the reader (useScrollableMath), one wider than the line scrolls inside it on screen.
    markScrolling(f.el, f.natural > f.screen + 0.5, printFormulaName);
  }
}

/**
 * Chromium shrinks the whole printed document when anything in it is wider than the page, so one
 * long formula would print a whole book at 80%. Each display formula wider than its column is
 * scaled down to fit it instead: in print to the page, and on screen to the sheet while it stays
 * readable (READABLE_FORMULA_PX). An inline formula wider than its line is fitted the same way in
 * print and scrolls inside its line on screen. The print column is the screen column plus the
 * difference between the page and the sheet, because what sits between the sheet and a formula
 * (cards, list indents, the solution id column) has a fixed width. Widths are measured on copies at
 * a fixed spot (measuringBox), so a formula gets the same print scale at every preview width.
 *
 * Measuring lays out the parts kept off screen (`content-visibility: auto`), which takes seconds
 * for a whole book, so it goes one part per task and the page keeps answering input.
 */
export async function fitWideFormulas(sheet: HTMLElement, cancelled: () => boolean = () => false): Promise<void> {
  const column = contentBoxWidth(sheet);
  // Negative where the screen sheet is wider than the page: on screens from about 700px to 860px the
  // sheet takes the whole width.
  const toPrint = PRINT_COLUMN - column;
  for (const part of sheet.querySelectorAll('.print-part')) {
    if (cancelled()) return;
    fitPart(part, sheet, toPrint);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

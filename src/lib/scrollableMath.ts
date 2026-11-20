/**
 * A formula that scrolls sideways (`data-wide`) is a tab stop with a name, so a keyboard can scroll
 * it: Safari does not make a scroll container focusable by itself. All of it goes when the formula
 * fits again, so only formulas that really scroll cost a Tab press. Shared by the reader
 * (useScrollableMath) and the print preview (fitWideFormulas).
 */
export function markScrolling(el: HTMLElement, wide: boolean, name: (el: HTMLElement) => string): void {
  if (wide === el.hasAttribute('data-wide')) return;
  el.toggleAttribute('data-wide', wide);
  if (wide) {
    el.tabIndex = 0;
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', name(el));
  } else {
    el.removeAttribute('tabindex');
    el.removeAttribute('role');
    el.removeAttribute('aria-label');
  }
}

/** "Formula 4.1: label" for a numbered formula, "Formula" for any other. */
export function formulaName(id?: string, label?: string | null): string {
  if (!id) return 'Formula';
  return label ? `Formula ${id}: ${label}` : `Formula ${id}`;
}

/** The boxes a display formula scrolls in: chapter text, numbered formulas and formula-sheet rows. */
const SCROLL_BOXES = '.content-math, .katex-block, .sb-formula-math, .sb-fcard-math';
const INNER_BOXES = '.content-math, .katex-block';

/** The width the text has: that of the nearest ancestor that is not an inline box, minus its padding. */
function lineWidth(el: HTMLElement): number {
  let block = el.parentElement;
  while (block && getComputedStyle(block).display.startsWith('inline')) block = block.parentElement;
  if (!block) return Infinity;
  const style = getComputedStyle(block);
  return block.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
}

/** A numbered formula's box carries its number and label (`data-formula-id`, `data-formula-label`). */
const boxName = (el: HTMLElement) => formulaName(el.dataset.formulaId, el.dataset.formulaLabel);

/**
 * Flags the wide formulas of several roots at once. Every read comes before the writes that follow
 * it, so the browser lays the page out twice for the whole batch instead of twice per formula.
 * The inline formulas go first: one that now scrolls no longer widens the box around it.
 */
export function flagWideFormulas(roots: HTMLElement[]): void {
  const inline: [HTMLElement, boolean][] = [];
  for (const root of roots) {
    for (const math of root.querySelectorAll<HTMLElement>('.katex')) {
      if (math.closest('.katex-display')) continue;
      let natural = 0;
      for (const base of math.querySelectorAll<HTMLElement>('.katex-base')) natural = Math.max(natural, base.offsetWidth);
      inline.push([math, natural > lineWidth(math) + 1]);
    }
  }
  for (const [math, wide] of inline) markScrolling(math, wide, boxName);

  const boxes: [HTMLElement, boolean][] = [];
  const wideBoxes = new Set<Element>();
  for (const root of roots) {
    // Inner boxes first: a box around one that scrolls does not scroll itself, whatever it measures.
    for (const box of [...root.querySelectorAll<HTMLElement>(SCROLL_BOXES)].reverse()) {
      const wide = box.scrollWidth > box.clientWidth + 1 && ![...box.querySelectorAll(INNER_BOXES)].some((inner) => wideBoxes.has(inner));
      if (wide) wideBoxes.add(box);
      boxes.push([box, wide]);
    }
  }
  for (const [box, wide] of boxes) markScrolling(box, wide, boxName);
}

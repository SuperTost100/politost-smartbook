import { useLayoutEffect, type RefObject } from 'react';
import { formulaName, markScrolling } from '../lib/scrollableMath';

/** The boxes a display formula scrolls in: chapter text, numbered formulas and formula-sheet rows. */
const SCROLL_BOXES = '.content-math, .katex-block, .sb-formula-math, .sb-fcard-math';

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
 * Formulas wider than their column scroll sideways, and get `data-wide` and a Tab stop with a name
 * (markScrolling) while they do. Only these: a formula that fits stays out of the Tab order.
 *
 * An inline formula is one unbreakable box, so one wider than the text column would push the whole
 * page sideways: the stylesheet lets the flagged ones scroll inside their line. A scrolling box sits
 * differently on the baseline, so the others stay ordinary inline text. A display formula already
 * sits in a scroll box; the hook only finds the boxes that scroll.
 *
 * `content` names what the root shows, for a root that keeps its size when its content changes
 * (the formula sheet changing chapter).
 */
export function useScrollableMath(ref: RefObject<HTMLElement | null>, enabled: boolean, content?: unknown) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || !enabled) return;
    const flag = () => {
      for (const math of root.querySelectorAll<HTMLElement>('.katex')) {
        if (math.closest('.katex-display')) continue;
        let natural = 0;
        for (const base of math.querySelectorAll<HTMLElement>('.katex-base')) natural = Math.max(natural, base.offsetWidth);
        markScrolling(math, natural > lineWidth(math) + 1, boxName);
      }
      // Inner boxes first: a box around one that scrolls does not scroll itself, whatever it measures.
      for (const box of [...root.querySelectorAll<HTMLElement>(SCROLL_BOXES)].reverse()) {
        const wide = box.scrollWidth > box.clientWidth + 1 && !box.querySelector(':is(.content-math, .katex-block)[data-wide]');
        markScrolling(box, wide, boxName);
      }
    };
    flag();
    const observer = new ResizeObserver(flag);
    observer.observe(root);
    // Web fonts change the widths once they arrive.
    void document.fonts?.ready.then(flag);
    return () => observer.disconnect();
  }, [ref, enabled, content]);
}

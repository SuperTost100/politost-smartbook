import { useLayoutEffect, type RefObject } from 'react';

/** The width the text has: that of the nearest ancestor that is not an inline box, minus its padding. */
function lineWidth(el: HTMLElement): number {
  let block = el.parentElement;
  while (block && getComputedStyle(block).display.startsWith('inline')) block = block.parentElement;
  if (!block) return Infinity;
  const style = getComputedStyle(block);
  return block.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
}

/**
 * An inline formula is one unbreakable box, so one wider than the text column pushes the whole page
 * sideways. Those get `data-wide`, and the stylesheet lets them scroll inside their line. Only these:
 * a scrolling box sits differently on the baseline, so the others stay ordinary inline text.
 */
export function useScrollableInlineMath(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || !enabled) return;
    const flag = () => {
      for (const math of root.querySelectorAll<HTMLElement>('.katex')) {
        if (math.closest('.katex-display')) continue;
        let natural = 0;
        for (const base of math.querySelectorAll<HTMLElement>('.katex-base')) natural = Math.max(natural, base.offsetWidth);
        math.toggleAttribute('data-wide', natural > lineWidth(math) + 1);
      }
    };
    flag();
    const observer = new ResizeObserver(flag);
    observer.observe(root);
    // Web fonts change the widths once they arrive.
    void document.fonts?.ready.then(flag);
    return () => observer.disconnect();
  }, [ref, enabled]);
}

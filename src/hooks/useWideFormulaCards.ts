import { useLayoutEffect, type RefObject } from 'react';

const WIDE = 'formulario-card--wide';
const FIT_VAR = '--formula-fit';
const MIN_FIT = 0.55;

/**
 * A formula wider than one grid column would be clipped (or hide behind an
 * overlay scrollbar). Cards whose formula does not fit span the whole row;
 * a formula still wider than the row is scaled down to fit, never below
 * MIN_FIT (past that the body scrolls on screen). Re-measured when the
 * container or any formula resizes (late fonts, theme, print stylesheet).
 */
export function useWideFormulaCards(containerRef: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const cards: { body: HTMLElement; natural: number }[] = [];

      for (const grid of container.querySelectorAll<HTMLElement>('.formula-grid')) {
        const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean);
        const columnWidth = parseFloat(columns[0] ?? '0');
        for (const card of grid.querySelectorAll<HTMLElement>('.formulario-card')) {
          const body = card.querySelector<HTMLElement>('.formulario-card-body');
          const math = body?.querySelector<HTMLElement>('.katex-html');
          if (!body || !math) continue;
          const fit = parseFloat(body.style.getPropertyValue(FIT_VAR)) || 1;
          const natural = math.scrollWidth / fit;
          const style = getComputedStyle(card);
          const chrome =
            parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) +
            parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
          card.classList.toggle(WIDE, columns.length > 1 && natural + chrome > columnWidth + 1);
          cards.push({ body, natural });
        }
      }

      // Second pass, after the wide toggles have settled the column widths.
      for (const { body, natural } of cards) {
        const available = body.clientWidth;
        const fit = natural > available + 1 ? Math.max(MIN_FIT, available / natural) : 1;
        if (fit < 1) body.style.setProperty(FIT_VAR, fit.toFixed(3));
        else body.style.removeProperty(FIT_VAR);
      }
    };

    measure();
    const observer = new ResizeObserver(() => measure());
    observer.observe(container);
    for (const math of container.querySelectorAll('.formulario-card-body .katex-html')) observer.observe(math);
    void document.fonts?.ready.then(measure);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, ...deps]);
}

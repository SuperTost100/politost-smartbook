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

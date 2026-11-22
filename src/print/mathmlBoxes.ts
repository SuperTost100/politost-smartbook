/**
 * Fast print (docs/Print.md, "Formule"): Chromium makes two kinds of MathML box wider than what it
 * draws, which leaves a gap before whatever follows ("√(2gh) , dove").
 *
 * - A root (`msqrt`, `mroot`) is sized for the widest variant of the radical sign in the font, but
 *   drawn with the variant its content needs. With STIX Two Math a root over a letter ends 0.42em
 *   after its overbar (MathRadicalLayoutAlgorithm::ComputeMinMaxSizes).
 * - An integral with limits (`msub`, `msubsup`) moves its lower limit left by the sign's italic
 *   correction, 0.54em for the display size, but keeps its width as if it had not.
 *
 * Neither depends on anything CSS can select, so each box gets a negative end margin as wide as the
 * gap it measures, in ems of its own size so that it scales with the formula's print fit.
 */
const INTEGRALS = /^[∫∬∭∮∯∰∱∲∳⨌⨍⨎⨏⨐⨑⨒⨓⨔⨕⨖⨗⨘⨙⨚⨛⨜]/;
const MARGIN = 'margin-inline-end';

function trimmable(el: Element): boolean {
  if (el.localName === 'msqrt' || el.localName === 'mroot') return true;
  const base = el.firstElementChild;
  return base?.localName === 'mo' && INTEGRALS.test(base.textContent ?? '');
}

/**
 * Trims the boxes in the MathML of `formulas`: one read of every box, then the writes. A box's own
 * margin does not change its gap, so a box trimmed before is measured as it is and keeps its margin
 * unless the gap changed.
 */
export function trimMathBoxes(formulas: Iterable<Element>): void {
  const boxes: HTMLElement[] = [];
  for (const formula of formulas) {
    for (const el of formula.querySelectorAll<HTMLElement>('msqrt, mroot, msub, msubsup')) if (trimmable(el)) boxes.push(el);
  }
  if (boxes.length === 0) return;
  const gaps = boxes.map((el) => {
    const right = el.getBoundingClientRect().right;
    let drawn = -Infinity;
    for (const child of el.children) drawn = Math.max(drawn, child.getBoundingClientRect().right);
    const size = parseFloat(getComputedStyle(el).fontSize);
    return size > 0 && drawn > -Infinity ? (right - drawn) / size : 0;
  });
  boxes.forEach((el, i) => {
    // Under 0.01em is rounding, and a box drawn past its edge is left alone.
    const margin = gaps[i] > 0.01 ? `-${gaps[i].toFixed(3)}em` : '';
    if (el.style.getPropertyValue(MARGIN) !== margin) el.style.setProperty(MARGIN, margin);
  });
}

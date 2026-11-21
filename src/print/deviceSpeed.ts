import katex from 'katex';

/**
 * How fast this device lays out KaTeX, which is most of the time a whole book takes to print. It
 * times the browser parsing and laying out a fixed paragraph of formulas, about 2,000 elements, in a
 * box kept off screen and out of the page's layout. The best of three runs is the result, in ms:
 * other work on the page only ever makes a run slower. Fast print is chosen by default above
 * SLOW_LAYOUT_MS (src/lib/printFormulaMode.ts), which was calibrated with this same paragraph.
 */
const FORMULAS = [
  String.raw`\vec F = m\vec a = m\frac{\mathrm{d}\vec v}{\mathrm{d}t}`,
  String.raw`\int_0^{\infty} e^{-\lambda x}\,\mathrm{d}x = \frac{1}{\lambda}`,
  String.raw`\sum_{k=1}^{n} k^2 = \frac{n(n+1)(2n+1)}{6}`,
  String.raw`\sqrt{\frac{2(h-x)}{g}}`,
  String.raw`\left( \begin{matrix} a & b \\ c & d \end{matrix} \right)`,
  String.raw`x_{1,2} = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}`,
];
const REPEAT = 12;
const RUNS = 3;

let paragraph: string | undefined;

function sampleHtml(): string {
  if (paragraph === undefined) {
    const one = FORMULAS.map((tex) => `testo ${katex.renderToString(tex, { output: 'html', throwOnError: false })}`).join(' ');
    paragraph = `<p>${Array.from({ length: REPEAT }, () => one).join(' ')}</p>`;
  }
  return paragraph;
}

function layoutOnce(html: string): number {
  const box = document.createElement('div');
  box.setAttribute('aria-hidden', 'true');
  // Fixed size and strict containment: laying it out never moves anything else on the page.
  box.style.cssText = 'position:fixed;left:0;top:0;width:640px;height:1px;overflow:hidden;visibility:hidden;contain:strict;pointer-events:none;font:16px/1.5 serif';
  document.body.append(box);
  const start = performance.now();
  box.innerHTML = html;
  // Reading a size makes the browser compute the styles and lay out the formulas now.
  void (box.firstElementChild as HTMLElement).offsetHeight;
  const elapsed = performance.now() - start;
  box.remove();
  return elapsed;
}

/** Runs the measurement, one run per task, and resolves to the best run in ms. */
export async function measureLayoutSpeed(): Promise<number> {
  const html = sampleHtml();
  let best = Infinity;
  for (let i = 0; i < RUNS; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    best = Math.min(best, layoutOnce(html));
  }
  return Math.round(best * 10) / 10;
}

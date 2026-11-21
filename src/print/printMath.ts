const MATHML = /<span class="katex-mathml"><math[\s\S]*?<\/math><\/span>/g;

/**
 * KaTeX HTML without its MathML copy. KaTeX writes every formula twice: as HTML to see and as MathML
 * hidden from view for screen readers. The print document keeps only the HTML, which is a quarter
 * fewer elements for the browser to lay out when it previews and prints a whole book.
 */
export function withoutMathml(html: string): string {
  return html.includes('katex-mathml') ? html.replace(MATHML, '') : html;
}

/**
 * How the print sheet draws formulas. `flat`, the default, lets KaTeX lay out each formula and then
 * swaps each segment for a box of fixed size that holds its text runs, rules and SVGs at the same
 * places (flatFormulas.ts), which the browser prints in about half the time. `katex` keeps KaTeX's
 * own tree: `?math=katex` in the address picks it, for support and for measuring one against the other.
 */
export type PrintMathMode = 'flat' | 'katex';

export const PRINT_MATH_PARAM = 'math';

export function printMathMode(params: URLSearchParams): PrintMathMode {
  return params.get(PRINT_MATH_PARAM) === 'katex' ? 'katex' : 'flat';
}

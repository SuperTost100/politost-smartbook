const MATHML = /<span class="katex-mathml"><math[\s\S]*?<\/math><\/span>/g;

/**
 * KaTeX HTML without its MathML copy. KaTeX writes every formula twice: as HTML to see and as MathML
 * hidden from view for screen readers. The print document keeps only the HTML, which is a quarter
 * fewer elements for the browser to lay out when it previews and prints a whole book.
 */
export function withoutMathml(html: string): string {
  return html.includes('katex-mathml') ? html.replace(MATHML, '') : html;
}

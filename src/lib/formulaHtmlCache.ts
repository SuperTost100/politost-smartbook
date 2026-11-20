import { renderFormulaLatex } from './formulaRender';
import { sanitizeHtml } from './sanitizeHtml';

/** Formulas kept, a few books' worth of numbered formulas at a few kB each. */
export const FORMULA_HTML_CACHE_SIZE = 1500;

const cache = new Map<string, string>();

/**
 * A numbered formula as sanitized KaTeX HTML, rendered once per LaTeX source: the chapter, the
 * formula sheet and its chapters show the same formulas again, and KaTeX with DOMPurify is most of
 * what a formula costs. The entries read longest ago leave first.
 */
export function formulaHtml(latex: string, render: (latex: string) => string = (tex) => sanitizeHtml(renderFormulaLatex(tex))): string {
  const hit = cache.get(latex);
  if (hit !== undefined) {
    cache.delete(latex);
    cache.set(latex, hit);
    return hit;
  }
  const html = render(latex);
  cache.set(latex, html);
  if (cache.size > FORMULA_HTML_CACHE_SIZE) cache.delete(cache.keys().next().value!);
  return html;
}

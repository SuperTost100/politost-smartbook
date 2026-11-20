import { renderFormulaHtml } from './formulaRender';

/** Formulas kept, a few books' worth of numbered formulas at a few kB each. */
export const FORMULA_HTML_CACHE_SIZE = 1500;

const cache = new Map<string, string>();

const render = (latex: string, mathTrusted: boolean) => renderFormulaHtml(latex, { mathTrusted });

/**
 * A numbered formula as sanitized KaTeX HTML, rendered once per LaTeX source and `mathTrusted`:
 * the chapter, the formula sheet and its chapters show the same formulas again, and KaTeX with
 * DOMPurify is most of what a formula costs. The entries read longest ago leave first.
 */
export function formulaHtml(latex: string, mathTrusted: boolean, renderHtml = render): string {
  const key = `${mathTrusted ? 'trusted' : 'sanitized'}:${latex}`;
  const hit = cache.get(key);
  if (hit !== undefined) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const html = renderHtml(latex, mathTrusted);
  cache.set(key, html);
  if (cache.size > FORMULA_HTML_CACHE_SIZE) cache.delete(cache.keys().next().value!);
  return html;
}

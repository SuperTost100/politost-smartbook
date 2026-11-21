import temml from 'temml';

/**
 * TeX to MathML with Temml, for fast print (printMathml.ts). Null when Temml cannot render the
 * formula, so the caller keeps KaTeX's drawing of it. Options as content-core passes them to KaTeX:
 * `trust` stays off and the limits keep their defaults. Inline formulas get Temml's soft line
 * breaks after relations and binary operators, where KaTeX lets a formula break too; Chromium and
 * Firefox honour them.
 *
 * Each result is kept while the page is open, so switching mode or re-rendering a part costs no
 * second render.
 */
const cache = new Map<string, string | null>();

export function renderTemml(tex: string, display: boolean): string | null {
  const key = `${display ? 'D' : 'I'}${tex}`;
  let math = cache.get(key);
  if (math !== undefined) return math;
  try {
    math = temml.renderToString(tex, { displayMode: display, wrap: display ? 'none' : 'tex', throwOnError: true, trust: false });
  } catch {
    math = null;
  }
  cache.set(key, math);
  return math;
}

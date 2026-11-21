import { withoutMathml } from '../print/printMath';

/**
 * Fast print (docs/Print.md, "Formule"): KaTeX output turned into MathML that the browser draws
 * itself. Each formula is rendered again from the TeX source KaTeX keeps in its MathML copy
 * (`<annotation encoding="application/x-tex">`), which already has the decimal-comma rewrite.
 *
 * A display formula becomes `<span class="mml-display"><math display="block">…</math></span>` and an
 * inline one `<span class="mml"><math>…</math></span>`: the wrappers hold the fit and the scrolling
 * that fitFormulas.ts sets, as `.katex-display` and `.katex` do. A formula the renderer cannot draw
 * (it returns null) stays KaTeX, without its MathML copy, as in the other mode.
 */
export type TexToMathml = (tex: string, display: boolean) => string | null;

const KATEX_OPEN = '<span class="katex">';
const DISPLAY_OPEN = '<span class="katex-display">';
const ANNOTATION = /<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>/;
const DISPLAY_MATH = /^<span class="katex"><span class="katex-mathml"><math[^>]*\sdisplay="block"/;
const PUNCTUATION = /^[.,;:!?)\]]+/;

/** Index just after the </span> that closes the span starting at `start`, or -1 when it never closes. */
function spanEnd(html: string, start: number): number {
  const tag = /<(\/?)span\b/g;
  tag.lastIndex = start;
  let depth = 0;
  for (let m = tag.exec(html); m; m = tag.exec(html)) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.indexOf('>', m.index) + 1;
  }
  return -1;
}

const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/**
 * The text of an annotation: KaTeX escapes `& < > " '`, and a copy that went through DOMPurify is
 * serialized again, which also writes `&nbsp;`.
 */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
    if (name[0] === '#') {
      const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
    }
    return NAMED[name.toLowerCase()] ?? entity;
  });
}

/** One `.katex` span as MathML, or null when it has no TeX source or the renderer gives up. */
function convert(katexSpan: string, render: TexToMathml): { math: string; display: boolean } | null {
  const tex = ANNOTATION.exec(katexSpan)?.[1];
  if (tex === undefined) return null;
  const display = DISPLAY_MATH.test(katexSpan);
  const math = render(decodeEntities(tex), display);
  return math === null ? null : { math, display };
}

/** Index where the last child element of `<math>` starts in `math`, or -1 when it has none. */
function lastChildStart(math: string): number {
  const tag = /<(\/?)[a-zA-Z][^>]*?(\/?)>/g;
  tag.lastIndex = math.indexOf('>') + 1;
  let depth = 0;
  let start = -1;
  for (let m = tag.exec(math); m; m = tag.exec(math)) {
    if (m[1]) depth--;
    else {
      if (depth === 0) start = m.index;
      if (!m[2]) depth++;
    }
    if (depth < 0) break;
  }
  return start;
}

/**
 * `math` with `punctuation` at the end of its last segment, as `<mtext class="math-punct">`. Temml's
 * `<math>` is a wrapping flex box (temml.css), and once a formula wraps the box takes the whole
 * line: punctuation glued after it, as glueMathPunctuation does for KaTeX, would reach past the
 * text column. Inside the last segment it follows the formula's last line, stays on it, and counts
 * in the width fitFormulas.ts fits. A last segment that is not a plain `<mrow>` gets one around it.
 */
function withPunctuation(math: string, punctuation: string): string {
  const punct = `<mtext class="math-punct">${punctuation}</mtext>`;
  const end = math.length - '</math>'.length;
  const child = lastChildStart(math);
  // No element inside: the whole content is the segment.
  const last = child < 0 ? math.indexOf('>') + 1 : child;
  // A plain row is a line-break segment: the punctuation joins it. A row with attributes draws
  // something (\boxed's border, a colour), so it goes in a new row with the punctuation after it.
  if (math.startsWith('<mrow>', last)) return `${math.slice(0, end - '</mrow>'.length)}${punct}</mrow></math>`;
  return `${math.slice(0, last)}<mrow>${math.slice(last, end)}${punct}</mrow></math>`;
}

/**
 * The print HTML of `html` with every KaTeX formula as MathML from `render`. The punctuation after
 * an inline formula goes inside it (withPunctuation), so it never starts the next line.
 */
export function katexToMathml(html: string, render: TexToMathml): string {
  if (!html.includes('katex-mathml')) return withoutMathml(html);
  let out = '';
  let pos = 0;
  for (;;) {
    const katex = html.indexOf(KATEX_OPEN, pos);
    if (katex < 0) break;
    const display = html.startsWith(DISPLAY_OPEN, katex - DISPLAY_OPEN.length) && katex - DISPLAY_OPEN.length >= pos;
    const start = display ? katex - DISPLAY_OPEN.length : katex;
    const end = spanEnd(html, start);
    const katexEnd = display ? spanEnd(html, katex) : end;
    if (end < 0 || katexEnd < 0) break;
    out += html.slice(pos, start);
    const done = convert(html.slice(katex, katexEnd), render);
    if (!done) {
      out += withoutMathml(html.slice(start, end));
      pos = end;
    } else if (display || done.display) {
      out += `<span class="mml-display">${done.math}</span>`;
      pos = end;
    } else {
      const punctuation = PUNCTUATION.exec(html.slice(end, end + 8))?.[0];
      out += `<span class="mml">${punctuation ? withPunctuation(done.math, punctuation) : done.math}</span>`;
      pos = end + (punctuation?.length ?? 0);
    }
  }
  return out + withoutMathml(html.slice(pos));
}

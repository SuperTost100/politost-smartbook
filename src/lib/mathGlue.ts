const KATEX_OPEN = '<span class="katex">';
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

/**
 * Keeps punctuation on the same line as the inline formula before it. A formula is an inline-block, and
 * browsers may break the line between it and a following comma or full stop, which then starts the next
 * line. The formula and its punctuation go in one nowrap span.
 */
export function glueMathPunctuation(html: string): string {
  let out = '';
  let pos = 0;
  for (let start = html.indexOf(KATEX_OPEN, pos); start >= 0; start = html.indexOf(KATEX_OPEN, pos)) {
    const end = spanEnd(html, start);
    if (end < 0) break;
    const punctuation = PUNCTUATION.exec(html.slice(end, end + 8))?.[0];
    if (punctuation) {
      out += `${html.slice(pos, start)}<span class="math-glue">${html.slice(start, end)}${punctuation}</span>`;
      pos = end + punctuation.length;
    } else {
      out += html.slice(pos, end);
      pos = end;
    }
  }
  return out + html.slice(pos);
}

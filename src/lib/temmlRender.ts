import temml from 'temml';

/**
 * TeX to MathML with Temml, for fast print (printMathml.ts). Null when Temml cannot render the
 * formula, so the caller keeps KaTeX's drawing of it. Options as content-core passes them to KaTeX:
 * `trust` stays off and the limits keep their defaults. Inline formulas get Temml's soft line
 * breaks after relations and binary operators, where KaTeX lets a formula break too; Chromium and
 * Firefox honour them.
 *
 * The TeX goes through texForTemml first, and the MathML through breakDisplaystyle and mathSpacing
 * after, so the line breaks and the spacing
 * match KaTeX's where Temml or the browser's operator spacing differ from TeX (docs/Print.md,
 * "Formule").
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
    math = temml.renderToString(texForTemml(tex), { displayMode: display, wrap: display ? 'none' : 'tex', throwOnError: true, trust: false });
    if (!display) math = breakDisplaystyle(math);
    math = mathSpacing(math);
  } catch {
    math = null;
  }
  cache.set(key, math);
  return math;
}

/** `\verb` with its delimiter, or `\verb*`: its text is shown as written. */
const VERB = /(\\verb\*?([^a-zA-Z*\s])[\s\S]*?\2)/;

/**
 * The TeX Temml gets: a comma between two digits that content-core left as written (decimalCommas:
 * a pair, a list, an index) gets an empty group after it. Temml reads `0,1` as one number and draws
 * "0,1", where KaTeX draws "0, 1"; a decimal comma reaches here as `{,}` and stays one number.
 * `\verb` text stays as written, since it would show the braces.
 */
export function texForTemml(tex: string): string {
  return tex
    .split(VERB)
    .map((part, i) => (i % 3 === 0 ? part.replace(/(\d),(?=\d)/g, '$1,{}') : i % 3 === 1 ? part : ''))
    .join('');
}

interface Element {
  name: string;
  attrs: string;
  kids: (Element | string)[];
}

const TOKEN = /<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>|[^<]+/g;

/** Temml's MathML as a tree: every element closed, no comments, attribute values without `>`. */
function parse(xml: string): Element {
  const root: Element = { name: '', attrs: '', kids: [] };
  const stack = [root];
  for (const m of xml.matchAll(TOKEN)) {
    const top = stack[stack.length - 1];
    if (m[2] === undefined) top.kids.push(m[0]);
    else if (m[1]) stack.pop();
    else {
      const el: Element = { name: m[2], attrs: m[3], kids: [] };
      top.kids.push(el);
      if (!m[4]) stack.push(el);
    }
  }
  return root;
}

const serialize = (node: Element | string): string =>
  typeof node === 'string' ? node : `<${node.name}${node.attrs}>${node.kids.map(serialize).join('')}</${node.name}>`;

const elements = (el: Element) => el.kids.filter((k): k is Element => typeof k !== 'string');
const text = (el: Element): string => el.kids.map((k) => (typeof k === 'string' ? k : text(k))).join('');
const hasSpacing = (el: Element) => /\s[lr]space=/.test(el.attrs);

/** Elements whose children after the first are scripts, limits or accents. */
const SCRIPTED = new Set(['msub', 'msup', 'msubsup', 'munder', 'mover', 'munderover', 'mmultiscripts']);
/** Elements that lay out their children in a row, where a space can go between two of them. */
const ROWS = new Set(['math', 'mrow', 'mstyle', 'mtd', 'msqrt', 'mpadded', 'menclose', 'mphantom']);
/** Binary operators the browser spaces by 3/18 em or 5/18 em, where TeX puts 4/18 em. */
const BINARY = new Set(['×', '⋅', '∘', '⊗', '⊕︎', '⊕', '∗', '⋆', '∙']);
const APPLY_FUNCTION = '\u2061';
const THIN_SPACE = '<mspace width="0.1667em"></mspace>';

const isApply = (el: Element | undefined) => el?.name === 'mo' && text(el) === APPLY_FUNCTION;
const isSpace = (el: Element | undefined) => el?.name === 'mspace';
/** A row Temml writes for an operator name: its name, `<mo>⁡</mo>` and maybe a thin space. */
const isOperatorRow = (el: Element) => el.name === 'mrow' && elements(el).some(isApply);
/** A big operator (∑, ∫) as Temml writes it, alone or with its limits. */
const isLargeOperator = (el: Element | undefined): boolean =>
  !!el && ((el.name === 'mo' && /\s(?:movablelimits|largeop)=/.test(el.attrs)) || (SCRIPTED.has(el.name) && isLargeOperator(elements(el)[0])));
const largeOperatorCore = (el: Element): Element => (el.name === 'mo' ? el : largeOperatorCore(elements(el)[0]));
const isOpening = (el: Element | undefined) => el?.name === 'mo' && /\sform="prefix"/.test(el.attrs);
const isClosing = (el: Element | undefined) => el?.name === 'mo' && /\sform="postfix"/.test(el.attrs);
/** A `\left…\right` group, with or without scripts. */
const isInner = (el: Element | undefined): boolean =>
  !!el &&
  ((el.name === 'mrow' && /\sstretchy="true"/.test(elements(el)[0]?.attrs ?? '') && isOpening(elements(el)[0])) ||
    (SCRIPTED.has(el.name) && isInner(elements(el)[0])));

/**
 * What TeX spaces as an ordinary atom before an operator name: letters, numbers, scripts,
 * fractions, roots, accents and groups. Not operators (a closing bracket aside), spaces, a blank
 * `\ `, or another operator name, which already ends with its space.
 */
function isOrdinary(el: Element | undefined): boolean {
  if (!el || el.name === 'mspace' || isOperatorRow(el) || isLargeOperator(el)) return false;
  if (el.name === 'mo') return isClosing(el);
  // A row counts as its last atom: a line-break segment ends with its operator, a bracket pair with
  // its closing bracket.
  if (el.name === 'mrow') {
    const last = elements(el).at(-1);
    return !last || isOrdinary(last);
  }
  if (el.name === 'mtext') return text(el).trim() !== '';
  return true;
}

const addSpacing = (el: Element, space: string) => {
  el.attrs += ` lspace="${space}" rspace="${space}"`;
};

/**
 * Walks `el`, whose previous and next siblings are `before` and `after`, fixing the spacing in
 * place. `script` is true inside a script or a limit, and `base` when `el` is the base of one.
 */
function respace(el: Element, script: boolean, base: boolean, before?: Element, after?: Element): void {
  const kids = elements(el);
  kids.forEach((kid, i) => {
    const inScript = script || (SCRIPTED.has(el.name) && i > 0) || (el.name === 'mroot' && i === 1);
    respace(kid, inScript, SCRIPTED.has(el.name) && i === 0, kids[i - 1], kids[i + 1]);
  });
  // The arrow of \vec, which fastPrint.css lowers: Temml marks it only over a single letter.
  const accent = kids[kids.length - 1];
  if (el.name === 'mover' && accent?.name === 'mo' && text(accent) === '→' && hasAttr(accent, 'stretchy', 'false')) {
    accent.attrs = hasAttr(accent, 'class') ? accent.attrs.replace(' class="', ' class="print-vec ') : `${accent.attrs} class="print-vec"`;
  }
  if (el.name === 'mo' && !hasSpacing(el)) {
    // TeX puts no space around relations, binary operators or punctuation in scripts and limits
    // (n→∞, k=1), and the browser keeps the full space there.
    if (script) addSpacing(el, '0em');
    else if (before && BINARY.has(text(el))) addSpacing(el, '0.2222em');
  }
  // A big operator gets no space of its own after an operator, a bracket or at the start, where
  // TeX puts only the space of the atom before it: `= ∫` has the space of the `=` alone.
  if (!base && isLargeOperator(el) && !isLargeOperator(before) && !isOrdinary(before)) {
    const core = largeOperatorCore(el);
    if (!/\slspace=/.test(core.attrs)) core.attrs += ' lspace="0em"';
  }
  // A `\left…\right` group is an inner atom: TeX puts a thin space between it and a letter, a
  // number or another group on either side, as in "x (1 + y)" and ") dθ"; the browser puts none.
  if (!script && ROWS.has(el.name)) {
    for (const kid of elements(el)) {
      if (!isInner(kid)) continue;
      const row = elements(el);
      const i = row.indexOf(kid);
      const previous = row[i - 1];
      const next = row[i + 1];
      if (isOrdinary(previous) && !isInner(previous)) el.kids.splice(el.kids.indexOf(kid), 0, thinSpace());
      if (next && (isInner(next) || isOpening(next) || (isOrdinary(next) && !isClosing(next)))) {
        el.kids.splice(el.kids.indexOf(kid) + 1, 0, thinSpace());
      }
    }
  }
  // Operator names: Temml puts the thin space before `\ln` only after some atoms (not after a
  // script, a fraction or a closing bracket, as in "n c_v \ln T"), and none after it before
  // `\left(`, where TeX puts one.
  for (let i = 0; i < el.kids.length; i++) {
    const kid = el.kids[i];
    if (typeof kid === 'string' || !isApply(kid)) continue;
    const row = elements(el);
    const at = row.indexOf(kid);
    const name = row[at - 1];
    if (!name) continue;
    // A row that holds the operator name and its spaces alone: its neighbours are the row's.
    const whole = el.name === 'mrow' && row.every((k) => k === name || k === kid || isSpace(k));
    const previous = row[at - 2] ?? (whole ? before : undefined);
    const next = row[at + 1] ?? (whole ? after : undefined);
    if (isInner(next)) el.kids.splice(i + 1, 0, thinSpace());
    if (isOrdinary(previous)) {
      el.kids.splice(el.kids.indexOf(name), 0, thinSpace());
      i++;
    }
  }
}

const thinSpace = (): Element => elements(parse(THIN_SPACE))[0];

/**
 * Formulas the spacing fixes can change: with an operator name, a script, a big or a binary
 * operator, or a `\left…\right` group.
 */
const NEEDS_SPACING = /\u2061|<m(?:sub|sup|under|over|multiscripts|root)|movablelimits|largeop|stretchy="true"|[×⋅∘⊗⊕∗⋆∙]/;

/** Temml's MathML with the spacing TeX gives (respace); a formula with nothing to change stays as it is. */
export function mathSpacing(math: string): string {
  if (!NEEDS_SPACING.test(math)) return math;
  const root = parse(math);
  for (const el of elements(root)) respace(el, false, false);
  return root.kids.map(serialize).join('');
}

const INVISIBLE = /^[\u2061-\u2064]$/;
const DISPLAYSTYLE = ' scriptlevel="0" displaystyle="true"';
const hasAttr = (el: Element, name: string, value?: string) =>
  new RegExp(`\\s${name}${value === undefined ? '=' : `="${value}"`}`).test(el.attrs);

/**
 * An inline formula that starts with `\displaystyle`, whose whole content Temml puts in one
 * `<mstyle>`, split into the line-break segments Temml makes for any other inline formula, so it
 * can wrap as KaTeX's does: Esempio 4.8 of Analisi Matematica 2 printed at 96%. The `<mstyle>`
 * becomes `displaystyle="true"` on `<math>`, and its children are cut as setLineBreaks in Temml
 * 0.14 cuts them with `wrap: 'tex'`: after an operator that is not a prefix and not a big
 * operator, together with the spaces that follow it, unless one of those is a no-break space. The
 * TeX keeps its `\displaystyle`, so limits and `\mathchoice` come out as in display style. A
 * formula with a hard line break stays as it is.
 */
export function breakDisplaystyle(math: string): string {
  if (!math.includes(DISPLAYSTYLE)) return math;
  const [root] = elements(parse(math));
  const [style] = elements(root);
  if (root.kids.length !== 1 || style.name !== 'mstyle' || style.attrs !== DISPLAYSTYLE) return math;
  const nodes = elements(style);
  if (nodes.some((node) => node.name === 'mspace' && hasAttr(node, 'linebreak', 'newline'))) return math;
  const rows: Element[][] = [];
  let block: Element[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    block.push(node);
    // Unlike Temml, no break after the invisible function application of a `\lim` set flat in
    // display style, which would part the name from its argument.
    const breaks =
      node.name === 'mo' &&
      node.kids.length === 1 &&
      typeof node.kids[0] === 'string' &&
      !INVISIBLE.test(node.kids[0]) &&
      !hasAttr(node, 'form', 'prefix') &&
      !hasAttr(node, 'movablelimits');
    if (!breaks) continue;
    const next = nodes[i + 1];
    let free = true;
    if (!(next?.name === 'mtext' && hasAttr(next, 'linebreak', 'nobreak'))) {
      while (nodes[i + 1]?.name === 'mspace') {
        const glue = nodes[++i];
        block.push(glue);
        if (hasAttr(glue, 'linebreak', 'nobreak')) free = false;
      }
    }
    if (free) {
      rows.push(block);
      block = [];
    }
  }
  if (block.length > 0) rows.push(block);
  const attrs = `${root.attrs} displaystyle="true"`;
  return `<math${attrs}>${rows.map((row) => `<mrow>${row.map(serialize).join('')}</mrow>`).join('')}</math>`;
}

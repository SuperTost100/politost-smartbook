import { contentBoxWidth, own, sheetUnits, SLICE_MS, UNIT_OR_PART, withoutRefit, yieldToBrowser } from './fitFormulas';

/**
 * Flat formulas for the print sheet (`printMathMode` 'flat').
 *
 * KaTeX draws a formula with nested spans, tables and struts, about ten elements per glyph, and the
 * browser lays all of them out again when it prints. Once KaTeX has laid a formula out, each of its
 * segments (`.katex-base`, the part between two places where it may break) is swapped for a box of
 * the same size holding one absolutely positioned span per text run, plus the rules and SVGs KaTeX
 * draws. Positions are in em of the segment's font size, so the box scales with the print fit and
 * draws the same picture. The runs sit in a box with `contain: strict` that covers their ink, so the
 * browser lays out and paints each segment on its own: a whole book prints in about half the time.
 *
 * A contained box clips what it paints, and a box that reaches past a formula's right edge would make
 * the page wider than the paper when the formula ends a line (fitFormulas.ts says what Chromium does
 * then). So the box reaches past the segment on the left, top and bottom by the ink of its runs and
 * INK_MARGIN, and ends at the segment's right edge; a part whose ink reaches past that edge (the tail
 * of an italic letter at the end) stays outside it, positioned in the segment like the others.
 */

/** px of safety around the ink measured for each part: canvas measures outlines, the screen hints them. */
export const INK_MARGIN = 1;

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** `px` in em of a `size` px font, to `digits` decimals. */
export function em(px: number, size: number, digits = 4): string {
  const value = Number((px / size).toFixed(digits));
  return `${value === 0 ? 0 : value}em`;
}

/**
 * A length in em that lays out to exactly `px`, a multiple of 1/64 px. Layout works in 1/64 px and
 * drops the rest, so a width a hair short of KaTeX's loses 1/64 px, and a few of those on one line
 * can move a word to the next. A quarter of that unit further from zero lands on the same value
 * whichever way the browser rounds.
 */
export function exactEm(px: number, size: number): string {
  return em(px + Math.sign(px) / 256, size, 6);
}

/** `px` on the 1/64 px grid of layout, rounded down or up. */
const gridDown = (px: number) => Math.floor(px * 64) / 64;
const gridUp = (px: number) => Math.ceil(px * 64) / 64;

/**
 * KaTeX classes that draw with a border (katex.css): fraction bars, rules, over- and underlines,
 * array lines, boxes, strike-through and the actuarial angle. Inline styles draw the rest: rule
 * widths, `\colorbox` backgrounds and array separators.
 */
const DRAWN_CLASS = /(?:^|\s)(?:frac-line|katex-rule|overline-line|underline-line|katex-hline|katex-hdashline|fbox|fcolorbox|katex-sout|angl)(?:\s|$)/;

/** Whether an element of a formula may draw something itself, so its borders and background are kept. */
export function mayDraw(className: string, style: string): boolean {
  return DRAWN_CLASS.test(className) || /border|background/.test(style);
}

/** Elements a flat segment cannot carry: links, images, anything with an id. The segment stays as KaTeX drew it. */
const KEEP_AS_IS = 'a, img, video, iframe, input, math, [id]';

/** One thing a flat segment draws, in KaTeX's document order. */
export interface Part {
  /** Its box, in px on the page. */
  box: Rect;
  /** Where it paints, in px on the page: the box of a rule or SVG, the glyph outlines of a run. */
  ink: Rect;
  /** Its HTML, placed from (left, top) in px on the page. */
  html: (left: number, top: number) => string;
}

export interface Segment {
  box: Rect;
  /** The baseline it sits on, in px on the page. */
  baseline: number;
  /** Its font size in px. */
  size: number;
}

export interface Group {
  contained: boolean;
  parts: Part[];
}

/**
 * Parts in order, in groups: a run of parts whose ink stays left of `right` (less INK_MARGIN) goes in
 * a contained box, any other part stands alone. Keeping the order keeps the text in reading order
 * for selection, search and the PDF, and the paint order of overlapping parts.
 */
export function groupParts(parts: Part[], right: number): Group[] {
  const groups: Group[] = [];
  for (const part of parts) {
    const contained = part.ink.right <= right - INK_MARGIN;
    const last = groups.at(-1);
    if (last && last.contained === contained && contained) last.parts.push(part);
    else groups.push({ contained, parts: [part] });
  }
  return groups;
}

/** The box that holds the contained parts: the segment, grown on three sides to their ink and INK_MARGIN. */
export function containedBox(segment: Rect, groups: Group[]): Rect {
  const box = { ...segment };
  for (const group of groups) {
    if (!group.contained) continue;
    for (const { ink } of group.parts) {
      box.left = Math.min(box.left, ink.left - INK_MARGIN);
      box.top = Math.min(box.top, ink.top - INK_MARGIN);
      box.bottom = Math.max(box.bottom, ink.bottom + INK_MARGIN);
    }
  }
  return box;
}

/** The flat HTML of a segment. */
export function segmentHtml(segment: Segment, parts: Part[]): string {
  const { box, baseline, size } = segment;
  const groups = groupParts(parts, box.right);
  const ink = containedBox(box, groups);
  // On the layout grid, so every offset inside it is exact.
  const inner = { left: gridDown(ink.left), top: gridDown(ink.top), right: ink.right, bottom: gridUp(ink.bottom) };
  let html = '';
  for (const group of groups) {
    if (group.contained) {
      html +=
        `<span class="katex-flat-box" style="left:${exactEm(inner.left - box.left, size)};top:${exactEm(inner.top - box.top, size)};` +
        `width:${exactEm(inner.right - inner.left, size)};height:${exactEm(inner.bottom - inner.top, size)}">` +
        group.parts.map((p) => p.html(inner.left, inner.top)).join('') +
        '</span>';
    } else {
      html += group.parts.map((p) => p.html(box.left, box.top)).join('');
    }
  }
  // With nothing in its flow, the box's baseline is its bottom edge: it goes down by the segment's depth.
  return (
    `<span class="katex-base katex-flat" style="width:${exactEm(box.right - box.left, size)};height:${exactEm(box.bottom - box.top, size)};` +
    `vertical-align:${exactEm(baseline - box.bottom, size)}">${html}</span>`
  );
}

export function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const quote = (value: string) => value.replace(/"/g, "'");

// ---------------------------------------------------------------------------------------------
// Reading KaTeX's layout

interface Ink {
  /** The font's ascent: the baseline sits this far below the top of a run's box. */
  ascent: number;
  left: number;
  right: number;
  up: number;
  down: number;
}

let canvas: CanvasRenderingContext2D | null | undefined;
const inks = new Map<string, Ink>();

/** The outline of `text` in `font`, from the baseline's left end. Measured once per font and text. */
function inkOf(font: string, text: string): Ink | null {
  const key = `${font}\u0000${text}`;
  const hit = inks.get(key);
  if (hit) return hit;
  canvas ??= document.createElement('canvas').getContext('2d');
  if (!canvas) return null;
  canvas.font = font;
  const m = canvas.measureText(text);
  const ink = {
    ascent: m.fontBoundingBoxAscent,
    left: -m.actualBoundingBoxLeft,
    right: m.actualBoundingBoxRight,
    up: m.actualBoundingBoxAscent,
    down: m.actualBoundingBoxDescent,
  };
  inks.set(key, ink);
  return ink;
}

const NO_BACKGROUND = new Set(['rgba(0, 0, 0, 0)', 'transparent']);

/** The visible part of an SVG: its box cut by the ancestors that clip it (KaTeX's `.hide-tail`). */
function visibleBox(svg: Element, base: Element): Rect {
  const r = svg.getBoundingClientRect();
  const box = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  for (let el = svg.parentElement; el && el !== base; el = el.parentElement) {
    if (getComputedStyle(el).overflow === 'visible') continue;
    const c = el.getBoundingClientRect();
    box.left = Math.max(box.left, c.left);
    box.top = Math.max(box.top, c.top);
    box.right = Math.max(box.left, Math.min(box.right, c.right));
    box.bottom = Math.max(box.top, Math.min(box.bottom, c.bottom));
  }
  return box;
}

let range: Range | undefined;

/**
 * An empty inline-block at the end of a segment: its bottom edge sits on the segment's baseline, to
 * the 1/64 px. KaTeX's strut gives the baseline only through a vertical-align that layout rounds.
 */
function baselineProbe(base: HTMLElement): HTMLElement {
  const probe = document.createElement('span');
  probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
  base.append(probe);
  return probe;
}

/**
 * Font sizes to the precision layout uses. A computed style rounds them to 4 decimals, and a width of
 * hundreds of px computed from that can miss by more than 1/64 px. Measured once per rounded value,
 * on a box 1000em wide.
 */
const fontSizes = new Map<string, number>();

function fontSizeOf(el: HTMLElement, rounded: string): number {
  let size = fontSizes.get(rounded);
  if (size === undefined) {
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;width:1000em;height:0';
    el.append(probe);
    size = probe.getBoundingClientRect().width / 1000;
    probe.remove();
    fontSizes.set(rounded, size);
  }
  return size;
}

interface Read {
  segment: Segment;
  /** Measures the ink of the text runs, once the fonts have loaded, and returns every part. */
  parts: () => Part[] | null;
}

/**
 * KaTeX's layout of one segment, or null when it holds something a flat segment cannot carry.
 * `baseline` is where the segment's baseline is, read from a probe (baselineProbe).
 */
function readSegment(base: HTMLElement, baseline: number): Read | null {
  if (base.querySelector(KEEP_AS_IS)) return null;
  const baseStyle = getComputedStyle(base);
  const size = fontSizeOf(base, baseStyle.fontSize);
  const r = base.getBoundingClientRect();
  const box = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  if (!size) return null;
  const color = baseStyle.color;

  // Text runs wait for the ink measurement; rules and SVGs are complete.
  const pending: (Part | { text: Text; rect: Rect; font: string; css: string; fontSize: number })[] = [];
  // One range for every read: the document updates each live range on every change to it.
  range ??= document.createRange();
  const walker = document.createTreeWalker(base, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    // Inside an SVG only the SVG itself counts.
    acceptNode: (node) => (node instanceof SVGElement && node.ownerSVGElement ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node instanceof Text) {
      if (!node.data) continue;
      range.selectNodeContents(node);
      const t = range.getBoundingClientRect();
      if (!t.width && !t.height) continue;
      const cs = getComputedStyle(node.parentElement!);
      // The run's font size in em of the segment's, and that size as layout will compute it.
      const ratio = Number((parseFloat(cs.fontSize) / size).toFixed(6));
      const fontSize = ratio * size;
      const style = cs.fontStyle === 'normal' ? '' : `${cs.fontStyle} `;
      const weight = cs.fontWeight === '400' ? '' : `${cs.fontWeight} `;
      // The line height is the run's own height, so the glyphs sit where they sat. A hair short of it,
      // the leading would be negative and round to a whole pixel up.
      const css = `font:${style}${weight}${ratio}em/${Number(((t.height + 1 / 256) / fontSize).toFixed(6))} ${quote(cs.fontFamily)}${cs.color === color ? '' : `;color:${cs.color}`}`;
      pending.push({ text: node, rect: { left: t.left, top: t.top, right: t.right, bottom: t.bottom }, font: `${style}${weight}${cs.fontSize} ${cs.fontFamily}`, css, fontSize });
    } else if (node instanceof SVGSVGElement) {
      const own = node.getBoundingClientRect();
      const c = visibleBox(node, base);
      const copy = node.cloneNode(true) as SVGSVGElement;
      copy.removeAttribute('width');
      copy.removeAttribute('height');
      copy.setAttribute(
        'style',
        `position:absolute;left:${exactEm(own.left - c.left, size)};top:${exactEm(own.top - c.top, size)};width:${exactEm(own.width, size)};height:${exactEm(own.height, size)}`,
      );
      const svgColor = getComputedStyle(node).color;
      const svgHtml = copy.outerHTML;
      const extra = `overflow:hidden${svgColor === color ? '' : `;color:${svgColor}`}`;
      pending.push({
        box: c,
        ink: c,
        html: (x, y) => `<span style="left:${exactEm(c.left - x, size)};top:${exactEm(c.top - y, size)};width:${exactEm(c.right - c.left, size)};height:${exactEm(c.bottom - c.top, size)};${extra}">${svgHtml}</span>`,
      });
    } else if (node instanceof HTMLElement && mayDraw(node.className, node.getAttribute('style') ?? '')) {
      const cs = getComputedStyle(node);
      const sides: string[] = [];
      for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
        const width = parseFloat(cs[`border${side}Width`]);
        const lineStyle = cs[`border${side}Style`];
        if (width > 0 && lineStyle !== 'none' && lineStyle !== 'hidden') {
          sides.push(`border-${side.toLowerCase()}:${exactEm(width, size)} ${lineStyle} ${cs[`border${side}Color`]}`);
        }
      }
      if (!NO_BACKGROUND.has(cs.backgroundColor)) sides.push(`background:${cs.backgroundColor}`);
      if (!sides.length) continue;
      const e = node.getBoundingClientRect();
      const rect = { left: e.left, top: e.top, right: e.right, bottom: e.bottom };
      const draw = sides.join(';');
      pending.push({
        box: rect,
        ink: rect,
        html: (x, y) => `<span style="left:${exactEm(rect.left - x, size)};top:${exactEm(rect.top - y, size)};width:${exactEm(rect.right - rect.left, size)};height:${exactEm(rect.bottom - rect.top, size)};box-sizing:border-box;${draw}"></span>`,
      });
    }
  }
  return {
    segment: { box, baseline, size },
    parts: () => {
      const parts: Part[] = [];
      for (const p of pending) {
        if ('html' in p) {
          parts.push(p);
          continue;
        }
        const ink = inkOf(p.font, p.text.data);
        if (!ink) return null;
        const { rect, css, fontSize } = p;
        const line = rect.top + ink.ascent;
        const text = escapeText(p.text.data);
        parts.push({
          box: rect,
          ink: { left: rect.left + ink.left, right: rect.left + ink.right, top: line - ink.up, bottom: line + ink.down },
          html: (x, y) => `<span style="left:${exactEm(rect.left - x, fontSize)};top:${exactEm(rect.top - y, fontSize)};${css}">${text}</span>`,
        });
      }
      return parts;
    },
  };
}

/** The scale a display formula is drawn at, from the fit's custom property. */
const scale = (el: HTMLElement, property: string) => Number(el.style.getPropertyValue(property) || 1);

/**
 * Whether a formula is drawn on screen at the size it prints at. One that is not (fitted to the page
 * at another scale than on screen, or scrolling on screen) stays as KaTeX drew it, so its print
 * shows KaTeX's own layout at its print size.
 */
function printsAsShown(katex: HTMLElement): boolean {
  const display = katex.parentElement?.closest<HTMLElement>('.katex-display');
  if (!display) return !katex.hasAttribute('data-print-fit') && !katex.hasAttribute('data-wide');
  return !display.hasAttribute('data-wide') && scale(display, '--display-fit') === scale(display, '--display-fit-print');
}

/**
 * The flattening of one unit, done over as many slices as it takes: first every read, then every
 * write, because a write makes the browser lay the unit out again before the next read. Reads use
 * page coordinates, but each segment is read in one go and placed relative to itself.
 */
interface Job {
  unit: Element;
  segments: HTMLElement[];
  probes: HTMLElement[];
  /** The next segment to read, then to write. */
  next: number;
  /** Of each segment read, KaTeX's layout, or null when it stays as it is. */
  reads: (Read | null)[];
  writes: [HTMLElement, string][] | null;
}

function startJob(unit: Element): Job {
  const segments = own<HTMLElement>(unit, '.katex')
    .filter((katex) => !katex.parentElement?.closest('.katex') && printsAsShown(katex))
    .flatMap((katex) => [...katex.querySelectorAll<HTMLElement>(':scope > .katex-html > .katex-base:not(.katex-flat)')]);
  // Every probe goes in at once, so the unit is laid out once for all of them.
  return { unit, segments, probes: segments.map(baselineProbe), next: 0, reads: [], writes: null };
}

function dropJob(job: Job): void {
  for (const probe of job.probes) probe.remove();
}

/**
 * Works on `job` until `deadline`. Returns 'fonts' when a font started loading while it read,
 * because positions read before a font arrives are those of its fallback: the job is then dropped,
 * having written nothing.
 */
function workOn(job: Job, deadline: number): 'more' | 'done' | 'fonts' {
  if (!job.writes) {
    while (job.next < job.segments.length) {
      const base = job.segments[job.next];
      job.reads.push(readSegment(base, job.probes[job.next].getBoundingClientRect().bottom));
      job.next++;
      if (performance.now() > deadline) break;
    }
    if (document.fonts?.status === 'loading') {
      dropJob(job);
      return 'fonts';
    }
    if (job.next < job.segments.length) return 'more';
    dropJob(job);
    job.writes = [];
    job.reads.forEach((read, k) => {
      const parts = read?.parts();
      if (read && parts) job.writes!.push([job.segments[k], segmentHtml(read.segment, parts)]);
    });
    job.next = 0;
    if (performance.now() > deadline) return 'more';
  }
  while (job.next < job.writes.length) {
    const [base, html] = job.writes[job.next++];
    if (base.isConnected) base.outerHTML = html;
    if (performance.now() > deadline) break;
  }
  return job.next < job.writes.length ? 'more' : 'done';
}

interface SheetFlat {
  /** The units flattened since their content last changed. */
  flat: WeakSet<Element>;
  /** The unit being flattened. */
  job: Job | null;
  observer: MutationObserver;
  /** Each call starts a run and stops the one before. */
  run: number;
  current: Promise<void>;
  /** Someone is waiting to print: longer slices. */
  hurry: boolean;
}

const sheets = new WeakMap<HTMLElement, SheetFlat>();

/** A unit whose content changed holds KaTeX's tree again: flatten it again. */
function forgetChanged(state: SheetFlat, records: MutationRecord[]): void {
  for (const record of records) {
    const node = record.type === 'characterData' ? record.target.parentElement : (record.target as Element);
    const unit = node?.closest(UNIT_OR_PART);
    if (!unit) continue;
    state.flat.delete(unit);
    if (state.job?.unit === unit) {
      dropJob(state.job);
      state.job = null;
    }
  }
}

function sheetState(sheet: HTMLElement): SheetFlat {
  let state = sheets.get(sheet);
  if (!state) {
    const created: SheetFlat = {
      flat: new WeakSet(),
      job: null,
      observer: new MutationObserver((records) => forgetChanged(created, records)),
      run: 0,
      current: Promise.resolve(),
      hurry: false,
    };
    // Only content counts: the fit's attributes change sizes, and a flat formula scales with them.
    created.observer.observe(sheet, { subtree: true, childList: true, characterData: true });
    sheets.set(sheet, (state = created));
  }
  return state;
}

/** Slices while someone waits to print: long enough to finish soon, short enough for the spinner. */
const HURRY_SLICE_MS = 50;

/**
 * Flattens the formulas of the sheet in the background, in slices of SLICE_MS like the fit, so the
 * page keeps answering input. Call it after fitWideFormulas: a formula is flattened at the size the
 * fit gave it, and a unit already flat is left alone until its content changes. A unit read while a
 * font was loading is read again once the fonts have arrived. The run stops when `cancelled` says
 * so, when another run starts, or when the sheet changes width, because the fit then measures again
 * and the next run follows it. The sheet's `data-math` reads `flattening`, then `flat` when a run
 * has finished.
 */
export function flattenFormulas(sheet: HTMLElement, cancelled: () => boolean = () => false): Promise<void> {
  const state = sheetState(sheet);
  const run = ++state.run;
  state.current = flattenRun(sheet, state, run, cancelled).finally(() => {
    if (state.run === run) state.hurry = false;
  });
  return state.current;
}

/** Resolves once the current run has finished, which it now does in longer slices. */
export function finishFlattening(sheet: HTMLElement): Promise<void> {
  const state = sheets.get(sheet);
  if (!state) return Promise.resolve();
  state.hurry = true;
  return state.current;
}

async function flattenRun(sheet: HTMLElement, state: SheetFlat, run: number, cancelled: () => boolean): Promise<void> {
  // What an earlier run read was laid out at another width or before another fit.
  if (state.job) withoutRefit(sheet, () => dropJob(state.job!));
  state.job = null;
  state.observer.takeRecords();
  const column = contentBoxWidth(sheet);
  const stopped = () => cancelled() || state.run !== run || contentBoxWidth(sheet) !== column;
  sheet.dataset.math = 'flattening';
  let units = sheetUnits(sheet);
  for (let pass = 0; pass < 3 && units.length > 0; pass++) {
    const retry: Element[] = [];
    let slice = performance.now();
    for (const unit of units) {
      for (;;) {
        const budget = state.hurry ? HURRY_SLICE_MS : SLICE_MS;
        if (performance.now() - slice > budget) {
          await yieldToBrowser();
          slice = performance.now();
          if (stopped()) return;
        }
        // React may have changed the sheet while this waited.
        forgetChanged(state, state.observer.takeRecords());
        if (!unit.isConnected || state.flat.has(unit)) break;
        // Nothing a job changes changes a width: the fit has no reason to measure the unit again.
        const result = withoutRefit(sheet, () => workOn((state.job ??= startJob(unit)), slice + budget));
        // The job's own changes.
        state.observer.takeRecords();
        if (result === 'more') continue;
        state.job = null;
        if (result === 'done') state.flat.add(unit);
        else retry.push(unit);
        break;
      }
    }
    if (retry.length === 0) break;
    await document.fonts.ready;
    if (stopped()) return;
    units = retry;
  }
  if (!stopped()) sheet.dataset.math = 'flat';
}

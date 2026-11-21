import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import {
  containedBox,
  em,
  escapeText,
  exactEm,
  groupParts,
  INK_MARGIN,
  mayDraw,
  segmentHtml,
  type Part,
  type Rect,
} from '../print/flatFormulas.ts';

const rect = (left: number, top: number, right: number, bottom: number): Rect => ({ left, top, right, bottom });
const part = (name: string, ink: Rect): Part => ({ box: ink, ink, html: (x, y) => `<${name}@${x},${y}>` });

/** The px a length in em lays out to, in 1/64 px, when layout drops the rest or rounds it. */
const laidOut = (length: string, size: number, round: (x: number) => number) => round(parseFloat(length) * size * 64) / 64;

test('em writes px in em of the font size, without -0', () => {
  assert.equal(em(10, 20), '0.5em');
  assert.equal(em(1, 3), '0.3333em');
  assert.equal(em(-0.00001, 20), '0em');
});

test('exactEm lays out to the same 1/64 px whether layout truncates or rounds', () => {
  // Font sizes as a computed style gives them, to 4 decimals, and lengths on the 1/64 px grid.
  for (const size of [17.7467, 19.36, 14.6667, 7.0981, 23.4234]) {
    for (let k = -4000; k <= 4000; k += 37) {
      const px = k / 64;
      const length = exactEm(px, size);
      assert.equal(laidOut(length, size, Math.trunc), px, `${px}px at ${size}px: ${length}`);
      assert.equal(laidOut(length, size, Math.round), px, `${px}px at ${size}px: ${length}`);
    }
  }
});

test('em to 4 decimals can lose 1/64 px, which is why widths use exactEm', () => {
  // 13px at 17.7467px: 0.7325em lays out to 12.984375px.
  assert.equal(laidOut(em(13, 17.7467), 17.7467, Math.trunc), 12.984375);
  assert.equal(laidOut(exactEm(13, 17.7467), 17.7467, Math.trunc), 13);
});

test('parts whose ink passes the right edge stand alone, the others are grouped, in order', () => {
  const right = 100;
  const parts = [
    part('a', rect(0, 0, 10, 10)),
    part('b', rect(10, 0, 20, 10)),
    part('tail', rect(90, 0, right - INK_MARGIN / 2, 10)),
    part('c', rect(20, 0, 30, 10)),
    part('d', rect(30, 0, right + 2, 10)),
    part('e', rect(40, 0, 50, 10)),
  ];
  const groups = groupParts(parts, right);
  assert.deepEqual(
    groups.map((g) => [g.contained, g.parts.map((p) => p.html(0, 0))]),
    [
      [true, ['<a@0,0>', '<b@0,0>']],
      [false, ['<tail@0,0>']],
      [true, ['<c@0,0>']],
      [false, ['<d@0,0>']],
      [true, ['<e@0,0>']],
    ],
  );
});

test('the contained box grows to the ink on the left, top and bottom, and never past the right edge', () => {
  const segment = rect(100, 50, 200, 80);
  const groups = groupParts([part('italic', rect(95, 44, 150, 86)), part('tail', rect(150, 50, 203, 80))], segment.right);
  assert.deepEqual(containedBox(segment, groups), rect(95 - INK_MARGIN, 44 - INK_MARGIN, 200, 86 + INK_MARGIN));
  // Only the loose part reaches past the segment: the box would have grown, but stops at its edge.
  assert.equal(containedBox(segment, groups).right, segment.right);
});

test('a flat segment keeps its size and baseline, and its parts stay in order', () => {
  const size = 20;
  const html = segmentHtml(
    { box: rect(100, 50, 164, 82), baseline: 74, size },
    [part('x', rect(102, 55, 120, 75)), part('f', rect(150, 52, 166, 80))],
  );
  assert.match(html, /^<span class="katex-base katex-flat" style="width:([\d.]+)em;height:([\d.]+)em;vertical-align:(-[\d.]+)em">/);
  const [, width, height, align] = /width:([\d.]+)em;height:([\d.]+)em;vertical-align:(-[\d.]+)em/.exec(html)!;
  assert.equal(laidOut(`${width}em`, size, Math.trunc), 64);
  assert.equal(laidOut(`${height}em`, size, Math.trunc), 32);
  assert.equal(laidOut(`${align}em`, size, Math.trunc), -8);
  // The contained run first, inside its box, then the italic tail outside it, from the segment's corner.
  assert.match(html, /<span class="katex-flat-box" style="[^"]*"><x@[\d.]+,[\d.]+><\/span><f@100,50><\/span>$/);
});

test('every KaTeX class that draws a border or a background is kept', () => {
  const css = readFileSync(createRequire(import.meta.url).resolve('katex/dist/katex.css'), 'utf8');
  const drawing = new Set<string>();
  for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (!/(^|;)\s*(border(-(top|right|bottom|left))?(-style|-width)?|background(-color)?)\s*:/.test(body)) continue;
    if (/border-style:\s*none|border-color:\s*currentColor;?\s*$/.test(body.trim())) continue;
    for (const selector of selectors.split(',')) {
      const last = /\.([\w-]+)\s*$/.exec(selector.trim());
      // The MathML copy for screen readers draws nothing (border: 0), and the print sheet drops it.
      if (last && last[1] !== 'katex' && last[1] !== 'katex-mathml') drawing.add(last[1]);
    }
  }
  assert.ok(drawing.has('frac-line') && drawing.has('fbox'), [...drawing].join(' '));
  for (const name of drawing) assert.ok(mayDraw(`mord ${name}`, ''), name);
  // Inline styles: rule sizes, \colorbox, array separators.
  assert.ok(mayDraw('vertical-separator', 'height:2em;border-right-width:0.04em;border-style:solid'));
  assert.ok(mayDraw('boxpad', 'background-color:yellow'));
  assert.ok(!mayDraw('mord mathnormal', 'margin-right:0.03588em'));
  assert.ok(!mayDraw('vlist-t vlist-t2', ''));
});

test('escapeText keeps text as text', () => {
  assert.equal(escapeText('a < b & c > d'), 'a &lt; b &amp; c &gt; d');
});

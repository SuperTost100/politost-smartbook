import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderTemml, texForTemml } from './temmlRender.ts';

const inline = (tex: string) => renderTemml(tex, false) ?? '';
const display = (tex: string) => renderTemml(tex, true) ?? '';
const THIN = '<mspace width="0.1667em"></mspace>';

test('a comma between digits left as written stays a separator, and a decimal comma one number', () => {
  assert.equal(texForTemml('t\\in[0,1]'), 't\\in[0,{}1]');
  assert.equal(texForTemml('x=1{,}5'), 'x=1{,}5');
  assert.match(inline('[0,1]'), /<mn>0<\/mn><mo separator="true">,<\/mo><mrow><\/mrow><mn>1<\/mn>/);
  assert.match(inline('1{,}25'), /<mn>1,25<\/mn>/);
});

test('verbatim text keeps its commas as written, and text shows no braces', () => {
  assert.equal(texForTemml('\\verb|1,2| + 3,4 + \\verb*!5,6!'), '\\verb|1,2| + 3,{}4 + \\verb*!5,6!');
  assert.match(inline('\\verb|1,2|'), /<mtext mathvariant="monospace">1,2<\/mtext>/);
  assert.match(inline('\\text{1,2}'), /<mtext>1,2<\/mtext>/);
});

test('an inline formula that starts with \\displaystyle keeps its line breaks', () => {
  const math = inline('\\displaystyle \\int_0^1 f = \\frac{1}{2} + c');
  assert.match(math, /^<math displaystyle="true">/);
  assert.doesNotMatch(math, /<mstyle/);
  // One row per line-break segment: after `=` and after `+`.
  assert.equal(math.match(/<math[^>]*><mrow>|<\/mrow><mrow>/g)?.length, 3);
});

test('an inline \\displaystyle sum or limit keeps its limits above and below', () => {
  assert.match(inline('\\displaystyle \\sum_{k=1}^{n} k = a'), /^<math displaystyle="true"><mrow><mrow><munderover><mo[^>]*>∑/);
  const limit = inline('\\displaystyle \\lim_{x\\to 0} f = 1');
  assert.match(limit, /<munder><mi>lim<\/mi>/);
  // The name and its argument stay on one line: the first break is after `=`.
  assert.match(limit, /^<math displaystyle="true"><mrow><munder>.*<mi>f<\/mi><mo>=<\/mo><\/mrow><mrow><mn>1<\/mn><\/mrow><\/math>$/);
});

test('an operator name gets its thin space after a script, a fraction, a root or a bracket', () => {
  assert.match(display('n c_V \\ln T'), new RegExp(`</msub><mrow>${THIN}<mi>ln</mi>`));
  for (const tex of ['\\frac12\\sin x', '\\sqrt{x}\\ln x', '(a+b)\\log n', 'x^2\\exp x']) {
    assert.match(inline(tex), new RegExp(`<mrow>${THIN}<mi>(sin|ln|log|exp)</mi>`), tex);
  }
  // Already there after a letter, and none after an operator, a blank or at a line-break segment.
  assert.equal(inline('n\\ln n').match(/0\.1667em/g)?.length, 2);
  for (const tex of ['a+\\sin x', 'a\\ \\sin x', '\\sin^2 x+\\cos^2 x']) {
    assert.doesNotMatch(inline(tex), new RegExp(`(<mrow>|<mo>\\+</mo>)${THIN}<(mi|msup)>`), tex);
  }
});

test('an operator name gets its thin space before \\left( and not before (', () => {
  assert.match(display('\\ln\\left(\\frac{a}{b}\\right)'), new RegExp(`<mo>⁡</mo>${THIN}</mrow><mrow><mo fence="true" form="prefix" stretchy="true">`));
  assert.doesNotMatch(display('\\ln(x)'), /0\.1667em/);
});

test('scripts and limits put no space around their operators', () => {
  assert.match(display('\\sum_{k=1}^n k'), /<mi>k<\/mi><mo lspace="0em" rspace="0em">=<\/mo>/);
  assert.match(inline('\\lim_{n\\to\\infty} a_n'), /<mo lspace="0em" rspace="0em">→<\/mo>/);
  assert.match(inline('a = b'), /<mo>=<\/mo>/);
});

test('× and ⋅ get the medium space of a binary operator', () => {
  assert.match(display('A \\times B \\cdot C'), /<mo lspace="0.2222em" rspace="0.2222em">×<\/mo>.*<mo lspace="0.2222em" rspace="0.2222em">⋅<\/mo>/);
  assert.match(display('x_{a\\times b}'), /<mo lspace="0em" rspace="0em">×<\/mo>/);
});

test('a big operator has no space of its own after an operator, a bracket or at the start', () => {
  assert.match(display('= \\int_0^1 f'), /<mo movablelimits="false" lspace="0em">∫<\/mo>/);
  assert.match(display('\\left(\\int f\\right)'), /<mo movablelimits="false" lspace="0em">∫<\/mo>/);
  assert.match(display('a\\int f'), /<mo movablelimits="false">∫<\/mo>/);
});

test('a \\left…\\right group gets a thin space next to a letter, and none next to an operator', () => {
  assert.match(display('x\\left(1+y\\right)d\\theta'), new RegExp(`<mi>x</mi>${THIN}<mrow><mo fence="true" form="prefix" stretchy="true">\\(.*\\)</mo></mrow>${THIN}<mi>d</mi>`));
  assert.doesNotMatch(display('= \\left(a\\right) + b'), /0\.1667em/);
  // Inside a script the group stays a single child of its script element.
  assert.match(display('\\left(a\\right)^2'), /<\/mrow><mn>2<\/mn><\/msup>/);
});

test('a \\left…\\right group with a script is still a group', () => {
  assert.match(display('\\lim_{n\\to\\infty}\\left(1+\\frac1n\\right)^n'), new RegExp(`<mo>⁡</mo>${THIN}<msup><mrow>`));
});

test('only the arrow of \\vec is marked to be lowered, not other accents', () => {
  for (const tex of ['\\vec{v}', '\\vec{AB}']) assert.match(inline(tex), /<mo stretchy="false"[^>]* class="print-vec[ "][^>]*>→<\/mo>/, tex);
  for (const tex of ['\\tilde{AB}', '\\hat{AB}', '\\overrightarrow{AB}', '\\dot{x}']) assert.doesNotMatch(inline(tex), /print-vec/, tex);
});

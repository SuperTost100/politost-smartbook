import { test } from 'node:test';
import assert from 'node:assert/strict';
import katex from 'katex';
import { withoutMathml } from '../print/printMath.ts';

test('withoutMathml drops the MathML copy and keeps the HTML of every formula', () => {
  const a = katex.renderToString(String.raw`\sqrt{x^2 + 1}`, { throwOnError: false });
  const b = katex.renderToString(String.raw`\sum_{k=0}^{n} k`, { displayMode: true, throwOnError: false });
  const html = `testo ${a}, poi ${b} fine`;
  const out = withoutMathml(html);
  assert.doesNotMatch(out, /<math|katex-mathml|annotation/);
  assert.equal(out.match(/class="katex-html"/g)?.length, 2);
  assert.equal(out, html.replace(/<span class="katex-mathml">[\s\S]*?<\/math><\/span>/g, ''));
  assert.match(out, /^testo <span class="katex">/);
  assert.match(out, / fine$/);
});

test('withoutMathml leaves text without formulas as it is', () => {
  assert.equal(withoutMathml('a &lt; b'), 'a &lt; b');
});

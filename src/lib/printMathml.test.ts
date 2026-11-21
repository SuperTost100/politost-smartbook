import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import katex from 'katex';
import { decodeEntities, katexToMathml } from './printMathml.ts';
import { sanitizeHtml } from './sanitizeHtml.ts';
import { glueMathPunctuation } from './mathGlue.ts';

const inline = (tex: string) => katex.renderToString(tex, { throwOnError: false });
const display = (tex: string) => katex.renderToString(tex, { displayMode: true, throwOnError: false });

/** A renderer that records what it was asked and answers with a marker. */
function recorder() {
  const calls: [string, boolean][] = [];
  const render = (tex: string, isDisplay: boolean) => {
    calls.push([tex, isDisplay]);
    return `<math>${calls.length}</math>`;
  };
  return { calls, render };
}

test('katexToMathml renders each formula again from its TeX source', () => {
  const { calls, render } = recorder();
  const out = katexToMathml(`testo ${inline(String.raw`a < b \text{ e } c`)} poi ${display('x^2')} fine`, render);
  assert.deepEqual(calls, [[String.raw`a < b \text{ e } c`, false], ['x^2', true]]);
  assert.equal(out, 'testo <span class="mml"><math>1</math></span> poi <span class="mml-display"><math>2</math></span> fine');
});

test('katexToMathml keeps a formula as KaTeX, without its MathML copy, when the renderer gives up', () => {
  const html = `a ${inline('x+1')} b ${display(String.raw`\frac{1}{2}`)} c`;
  const out = katexToMathml(html, () => null);
  assert.doesNotMatch(out, /<math|katex-mathml|mml/);
  assert.equal(out.match(/class="katex-html"/g)?.length, 2);
  assert.match(out, /^a <span class="katex">/);
  assert.match(out, /<span class="katex-display"><span class="katex">/);
  assert.match(out, / c$/);
});

test('katexToMathml mixes rendered formulas and fallbacks in order', () => {
  const out = katexToMathml(`${inline('a')} ${inline('b')} ${inline('c')}`, (tex) => (tex === 'b' ? null : `<math>${tex}</math>`));
  assert.match(out, /^<span class="mml"><math>a<\/math><\/span> <span class="katex">.*<\/span> <span class="mml"><math>c<\/math><\/span>$/);
  assert.doesNotMatch(out, /katex-mathml/);
});

test('katexToMathml puts the punctuation after an inline formula at the end of its last segment', () => {
  const { render } = recorder();
  const punct = (p: string) => `<mtext class="math-punct">${p}</mtext>`;
  assert.equal(
    katexToMathml(`vale ${inline('x')}, quindi ${inline('y')}).`, render),
    `vale <span class="mml"><math><mrow>1${punct(',')}</mrow></math></span> quindi <span class="mml"><math><mrow>2${punct(').')}</mrow></math></span>`,
  );
  const segments = '<math><mrow><mi>a</mi><mo>=</mo></mrow><mrow><mi>b</mi></mrow></math>';
  assert.equal(
    katexToMathml(`${inline('a=b')}; poi`, () => segments),
    `<span class="mml"><math><mrow><mi>a</mi><mo>=</mo></mrow><mrow><mi>b</mi>${punct(';')}</mrow></math></span> poi`,
  );
  // The glue for KaTeX, run after it as ContentFlow does, leaves MathML alone.
  const html = katexToMathml(`${inline('x')}.`, render);
  assert.equal(glueMathPunctuation(html), html);
});

test('katexToMathml reads the TeX of a formula that went through the sanitizer', () => {
  (globalThis as typeof globalThis & { window: Window }).window = new JSDOM('').window as unknown as Window;
  const { calls, render } = recorder();
  katexToMathml(sanitizeHtml(`<p>${inline(String.raw`a<b \;\&\; c>d \text{"x" e 'y'}`)}</p>`), render);
  assert.deepEqual(calls, [[String.raw`a<b \;\&\; c>d \text{"x" e 'y'}`, false]]);
});

test('katexToMathml leaves text without formulas and KaTeX error spans as they are', () => {
  assert.equal(katexToMathml('a &lt; b', () => '<math></math>'), 'a &lt; b');
  const error = '<span class="katex-error" title="ParseError">\\foo</span>';
  assert.equal(katexToMathml(`x ${error} ${inline('y')}`, () => '<math></math>'), `x ${error} <span class="mml"><math></math></span>`);
});

test('decodeEntities decodes the entities KaTeX and the serializer write', () => {
  assert.equal(decodeEntities('&amp;&lt;&gt;&quot;&#x27;&#39;&nbsp;&#8722;&unknown;'), '&<>"\'\' −&unknown;');
});

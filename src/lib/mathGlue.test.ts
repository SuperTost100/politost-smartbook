import { test } from 'node:test';
import assert from 'node:assert/strict';
import { glueMathPunctuation } from './mathGlue.ts';

const formula = '<span class="katex"><span class="katex-html"><span class="mord">x</span></span></span>';

test('a formula followed by a comma or full stop is wrapped together with it', () => {
  assert.equal(
    glueMathPunctuation(`Con ${formula}, a 50 °C.`),
    `Con <span class="math-glue">${formula},</span> a 50 °C.`,
  );
  assert.equal(
    glueMathPunctuation(`vale ${formula}). Poi`),
    `vale <span class="math-glue">${formula}).</span> Poi`,
  );
});

test('a formula followed by a space or a word is left alone', () => {
  const html = `Con ${formula} e ${formula}x`;
  assert.equal(glueMathPunctuation(html), html);
});

test('each formula is handled on its own', () => {
  assert.equal(
    glueMathPunctuation(`${formula}; ${formula} e ${formula}.`),
    `<span class="math-glue">${formula};</span> ${formula} e <span class="math-glue">${formula}.</span>`,
  );
});

test('text without a formula, or with an unclosed one, comes back unchanged', () => {
  assert.equal(glueMathPunctuation('Solo testo, senza formule.'), 'Solo testo, senza formule.');
  const open = '<span class="katex"><span>x</span>,';
  assert.equal(glueMathPunctuation(open), open);
});

test('a formula in several segments can still wrap between them, but not before its punctuation', () => {
  const two = '<span class="katex"><span class="katex-html"><span class="katex-base">a+</span><span class="katex-base">b</span></span></span>';
  const out = glueMathPunctuation(`${two}.`);
  assert.equal(
    out,
    `<span class="math-glue"><span class="katex"><span class="katex-html"><span class="katex-base">a+</span><span class="math-brk">\u200b</span><span class="katex-base">b</span></span></span>.</span>`,
  );
});

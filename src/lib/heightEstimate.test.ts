import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateTextHeight } from './heightEstimate.ts';

const prose = 'Una riga di testo che occupa spazio, come in un vero capitolo del libro. '.repeat(40);

test('an empty text takes no room', () => {
  assert.equal(estimateTextHeight('', 700), 0);
});

test('the same text is taller in a narrower column', () => {
  assert.ok(estimateTextHeight(prose, 322) > estimateTextHeight(prose, 732) * 1.5);
});

test('formulas, display math and figures add their height', () => {
  const plain = estimateTextHeight(prose, 700);
  assert.ok(estimateTextHeight(`${prose}\n\n<!--FORMULA:3.1-->\n\n`, 700) > plain + 50);
  assert.ok(estimateTextHeight(`${prose}\n\n$$a = b$$\n\n`, 700) > plain + 50);
  assert.ok(estimateTextHeight(`${prose}\n\n<!--IMAGE:{"src":"assets/a.svg","alt":"A"}-->\n\n`, 700) > plain + 300);
});

test('a paragraph of Fisica 1 lands near its measured height', () => {
  // Paragraph 3.1 of Fisica 1: three blocks of prose, 572 px tall with its heading in a 658 px column.
  const text = ['a'.repeat(316), 'b'.repeat(312), 'c'.repeat(605)].join('\n\n');
  const height = 61 + estimateTextHeight(text, 658);
  assert.ok(Math.abs(height - 572) / 572 < 0.15, `estimated ${height}`);
});

test('a box adds its frame, and its ::: lines do not count as text', () => {
  const plain = estimateTextHeight(prose, 700);
  const boxed = estimateTextHeight(`:::definition{id="1.1" title="palla"}\n${prose}\n:::`, 700);
  assert.ok(boxed > plain + 50 && boxed < plain + 120, `boxed ${boxed}, plain ${plain}`);
});

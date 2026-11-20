import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { parseContentBlocks, type BoxBlock } from './renderContent.ts';
import { preprocessContent } from './parser.ts';
import { boxElementId, boxIsShort, boxTitleKey, boxTone, boxWord, labelRepeatsTitle } from './boxes.ts';

// The parser sanitizes its HTML with DOMPurify, which needs a window.
before(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  (globalThis as typeof globalThis & { window: Window }).window = dom.window as unknown as Window;
});

function boxes(markdown: string): BoxBlock[] {
  return parseContentBlocks(preprocessContent(markdown)).filter((b): b is BoxBlock => b.type === 'box');
}

test('each kind has its own word, and theorem kinds keep theirs', () => {
  const words = boxes(
    [
      ':::definition\nA.\n:::',
      ':::theorem\nB.\n:::',
      ':::theorem{kind="proposition"}\nC.\n:::',
      ':::theorem{kind="corollary"}\nD.\n:::',
      ':::theorem{kind="lemma"}\nE.\n:::',
      'Testo.\n\n:::proof\nF.\n:::',
      ':::example\nG.\n:::',
      ':::mistake\nH.\n:::',
      ':::remark\nI.\n:::',
    ].join('\n\n'),
  ).map(boxWord);
  assert.deepEqual(words, [
    'Definizione', 'Teorema', 'Proposizione', 'Corollario', 'Lemma', 'Dimostrazione', 'Esempio', 'Errore tipico', 'Osservazione',
  ]);
});

test('definitions, theorems and mistakes have their own tone, the other kinds share the plain one', () => {
  assert.deepEqual(
    (['definition', 'theorem', 'mistake', 'proof', 'example', 'remark'] as const).map((box) => boxTone({ box })),
    ['definition', 'theorem', 'mistake', 'plain', 'plain', 'plain'],
  );
});

test('element ids name the kind, and the theorem kinds share the theorem prefix', () => {
  assert.equal(boxElementId({ box: 'definition', id: '1.2' }), 'definizione-1.2');
  assert.equal(boxElementId({ box: 'theorem', id: '1.2' }), 'teorema-1.2');
  const [lemma] = boxes(':::theorem{kind="lemma" id="1.3"}\nE.\n:::');
  assert.equal(boxElementId(lemma), 'teorema-1.3');
  assert.equal(boxElementId({ box: 'example', id: '1.2' }), 'esempio-1.2');
  assert.equal(boxElementId({ box: 'mistake', id: '1.2' }), 'errore-1.2');
  assert.equal(boxElementId({ box: 'remark', id: '1.2' }), 'osservazione-1.2');
  assert.equal(boxElementId({ box: 'definition' }), undefined);
  assert.equal(boxElementId({ box: 'proof', id: '1.2' }), undefined);
});

test('a formula label equal to the box title, ignoring case and spaces, repeats it', () => {
  const [box] = boxes(':::theorem{id="1.2" title="  di Weierstrass "}\nA.\n:::');
  const key = boxTitleKey(box.title);
  assert.equal(key, 'di weierstrass');
  assert.equal(labelRepeatsTitle('Di  Weierstrass', key), true);
  assert.equal(labelRepeatsTitle('Weierstrass', key), false);
  assert.equal(labelRepeatsTitle('di Weierstrass', undefined), false);
  assert.equal(boxTitleKey(undefined), undefined);
});

test('a title with entities or inline math compares as its text', () => {
  const [amp] = boxes(':::definition{title="Cauchy & Riemann"}\nA.\n:::');
  assert.equal(labelRepeatsTitle('cauchy & riemann', boxTitleKey(amp.title)), true);
  const [math] = boxes(':::theorem{title="limite di $x^2$"}\nA.\n:::');
  assert.equal(labelRepeatsTitle('limite di', boxTitleKey(math.title)), false);
});

test('a box of a few paragraphs or a figure with a caption line is short, a longer one is not', () => {
  const body = (markdown: string) => boxes(`:::example\n${markdown}\n:::`)[0].blocks;
  assert.equal(boxIsShort(body('Uno.\n\nDue.\n\n$$x$$\n\nTre.')), true);
  assert.equal(boxIsShort(body('Uno.\n\nDue.\n\n$$x$$\n\nTre.\n\nQuattro.')), false);
  assert.equal(boxIsShort(body('Uno.\n\n- a\n- b\n- c\n- d')), true);
  assert.equal(boxIsShort(body(Array.from({ length: 10 }, (_, i) => `- voce ${i}`).join('\n'))), false);
  assert.equal(boxIsShort(body(':::image{src="assets/a.svg" alt="A"}\n:::\n\nUno.')), true);
  assert.equal(boxIsShort(body(':::image{src="assets/a.svg" alt="A"}\n:::\n\nUno.\n\nDue.')), false);
});

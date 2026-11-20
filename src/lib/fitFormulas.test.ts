import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { fitWideFormulas } from '../print/fitFormulas.ts';

const { window } = new JSDOM('<!DOCTYPE html><body></body>');
Object.assign(globalThis, {
  document: window.document,
  getComputedStyle: window.getComputedStyle.bind(window),
  MutationObserver: window.MutationObserver,
});

const section = (id: string) => `<section class="paragraph-section" id="${id}"><p><span class="katex"><span class="katex-base">x</span></span> <a data-print-ref="r">ref</a></p></section>`;

function sheet() {
  const el = window.document.createElement('article');
  el.style.cssText = 'padding:0;border:0';
  el.innerHTML = `<div class="print-part">${section('a')}</div><div class="print-part"><h2>Esercizi</h2>${section('b')}</div>`;
  window.document.body.append(el);
  return el;
}

/** The sections whose formulas were measured during `run`. */
async function measured(root: HTMLElement, run: () => Promise<void>): Promise<string[]> {
  const proto = window.Element.prototype;
  const original = proto.getBoundingClientRect;
  const ids = new Set<string>();
  proto.getBoundingClientRect = function (this: Element) {
    const id = this.closest('.paragraph-section')?.id;
    if (id && root.contains(this)) ids.add(id);
    return original.call(this);
  };
  try {
    await run();
  } finally {
    proto.getBoundingClientRect = original;
  }
  return [...ids].sort();
}

test('fitting again measures only the paragraphs whose content changed', async () => {
  const root = sheet();
  assert.deepEqual(await measured(root, () => fitWideFormulas(root)), ['a', 'b']);
  assert.deepEqual(await measured(root, () => fitWideFormulas(root)), []);

  root.querySelector('#b p')!.append(' altro testo');
  assert.deepEqual(await measured(root, () => fitWideFormulas(root)), ['b']);

  root.querySelector('#a .katex')!.setAttribute('class', 'katex wide');
  assert.deepEqual(await measured(root, () => fitWideFormulas(root)), ['a']);
});

test('the links and ids linkPrintRefs sets do not count as changes', async () => {
  const root = sheet();
  await fitWideFormulas(root);
  root.querySelector('#a a')!.setAttribute('href', '#cap-1');
  root.querySelector('#b a')!.id = 'eq-1.1';
  assert.deepEqual(await measured(root, () => fitWideFormulas(root)), []);
});

test('a new paragraph in a fitted part is measured on its own', async () => {
  const root = sheet();
  await fitWideFormulas(root);
  root.querySelectorAll('.print-part')[1].insertAdjacentHTML('beforeend', section('c'));
  assert.deepEqual(await measured(root, () => fitWideFormulas(root)), ['c']);
});

test('a sheet that changes width while fitting is fitted again at the new width', async () => {
  const root = sheet();
  const proto = window.Element.prototype;
  const original = proto.getBoundingClientRect;
  const realNow = performance.now.bind(performance);
  let width = 800;
  let clock = 0;
  const fits: string[] = [];
  // Every unit takes longer than a slice, so the fit yields before each one.
  performance.now = () => (clock += 50);
  proto.getBoundingClientRect = function (this: Element) {
    if (this === root) return { ...original.call(this), width } as DOMRect;
    const id = this.closest('.paragraph-section')?.id;
    if (id && fits.at(-1) !== `${id}@${width}`) fits.push(`${id}@${width}`);
    if (id === 'a') width = 600;
    return original.call(this);
  };
  try {
    await fitWideFormulas(root);
  } finally {
    proto.getBoundingClientRect = original;
    performance.now = realNow;
  }
  // Section a was fitted at 800, the sheet became 600 wide, and both sections were fitted at 600.
  assert.deepEqual(fits, ['a@800', 'a@600', 'b@600']);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { flagWideFormulas, formulaName, markScrolling } from './scrollableMath.ts';

/** The few element calls markScrolling makes, on a plain map of attributes. */
function fakeElement() {
  const attrs = new Map<string, string>();
  return {
    attrs,
    hasAttribute: (name: string) => attrs.has(name),
    toggleAttribute: (name: string, on: boolean) => (on ? attrs.set(name, '') : attrs.delete(name), on),
    setAttribute: (name: string, value: string) => void attrs.set(name, value),
    removeAttribute: (name: string) => void attrs.delete(name),
    set tabIndex(value: number) {
      attrs.set('tabindex', String(value));
    },
  };
}

test('a formula that scrolls is a named tab stop, and stops being one when it fits again', () => {
  const el = fakeElement();
  let named = 0;
  const name = () => {
    named++;
    return 'Formula 2.1: Velocità media';
  };
  markScrolling(el as unknown as HTMLElement, false, name);
  assert.equal(el.attrs.size, 0);
  markScrolling(el as unknown as HTMLElement, true, name);
  assert.deepEqual(Object.fromEntries(el.attrs), {
    'data-wide': '',
    tabindex: '0',
    role: 'group',
    'aria-label': 'Formula 2.1: Velocità media',
  });
  // Flagged again (a resize that changes nothing): the name is not worked out again.
  markScrolling(el as unknown as HTMLElement, true, name);
  assert.equal(named, 1);
  markScrolling(el as unknown as HTMLElement, false, name);
  assert.equal(el.attrs.size, 0);
});

test('a numbered formula is named by its number and label, any other one "Formula"', () => {
  assert.equal(formulaName('4.1', 'Legge di Ohm'), 'Formula 4.1: Legge di Ohm');
  assert.equal(formulaName('4.1', ''), 'Formula 4.1');
  assert.equal(formulaName(undefined, 'Legge di Ohm'), 'Formula');
  assert.equal(formulaName(), 'Formula');
});

/** A page in jsdom, which has no layout: each test gives the elements the sizes the browser would. */
function page(html: string) {
  const dom = new JSDOM(`<!DOCTYPE html><body>${html}</body>`);
  const g = globalThis as Record<string, unknown>;
  g.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  const size = (selector: string, sizes: Partial<Record<'offsetWidth' | 'clientWidth' | 'scrollWidth', number>>) => {
    for (const el of dom.window.document.querySelectorAll(selector)) {
      for (const [key, value] of Object.entries(sizes)) Object.defineProperty(el, key, { value, configurable: true });
    }
  };
  return { doc: dom.window.document, size };
}

test('an inline formula wider than its line scrolls, one that fits does not', () => {
  const { doc, size } = page(`
    <div id="root"><p><span class="katex" id="wide"><span class="katex-base"></span></span>
    <span class="katex" id="narrow"><span class="katex-base"></span></span></p></div>`);
  size('p', { clientWidth: 300 });
  size('#wide .katex-base', { offsetWidth: 420 });
  size('#narrow .katex-base', { offsetWidth: 120 });
  flagWideFormulas([doc.getElementById('root')!]);
  assert.ok(doc.getElementById('wide')!.hasAttribute('data-wide'));
  assert.equal(doc.getElementById('wide')!.getAttribute('aria-label'), 'Formula');
  assert.ok(!doc.getElementById('narrow')!.hasAttribute('data-wide'));
});

test('a box around a scrolling formula does not scroll itself, and every root of the batch is measured', () => {
  const { doc, size } = page(`
    <div id="a"><div class="sb-formula-math" data-formula-id="3.1" data-formula-label="Seconda legge"><div class="katex-block" id="inner"></div></div></div>
    <div id="b"><div class="sb-formula-math" id="alone" data-formula-id="3.2"></div></div>`);
  size('.sb-formula-math, .katex-block', { clientWidth: 300, scrollWidth: 500 });
  flagWideFormulas([doc.getElementById('a')!, doc.getElementById('b')!]);
  assert.ok(doc.getElementById('inner')!.hasAttribute('data-wide'));
  assert.ok(!doc.querySelector('#a .sb-formula-math')!.hasAttribute('data-wide'));
  assert.equal(doc.getElementById('alone')!.getAttribute('aria-label'), 'Formula 3.2');
});

test('a formula that fits again leaves the Tab order', () => {
  const { doc, size } = page(`<div id="root"><div class="content-math" id="box"></div></div>`);
  const root = doc.getElementById('root')!;
  size('#box', { clientWidth: 300, scrollWidth: 500 });
  flagWideFormulas([root]);
  assert.equal(doc.getElementById('box')!.tabIndex, 0);
  size('#box', { clientWidth: 600, scrollWidth: 500 });
  flagWideFormulas([root]);
  assert.ok(!doc.getElementById('box')!.hasAttribute('tabindex'));
});

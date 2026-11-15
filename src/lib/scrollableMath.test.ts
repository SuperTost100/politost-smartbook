import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formulaName, markScrolling } from './scrollableMath.ts';

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

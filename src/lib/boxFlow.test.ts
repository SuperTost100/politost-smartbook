import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let render: (props: { content: string; boxStyle?: 'tinted' | 'flat' }) => Element;

before(async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  // DOMPurify and antd need a document. tsx compiles the components' JSX to React.createElement,
  // because the root tsconfig has no `jsx` setting, so React must be a global here.
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, React });
  const { ContentFlow } = await import('../components/ContentFlow.tsx');
  render = (props) => {
    const host = dom.window.document.createElement('div');
    host.innerHTML = renderToStaticMarkup(React.createElement(ContentFlow, props));
    return host;
  };
});

const text = ':::theorem{id="1.2" title="di Weierstrass"}\nEnunciato.\n:::\n\n:::proof\nDimostrazione.\n:::';

test('chapter text draws a theorem in a tinted box with its id and an open proof', () => {
  const box = render({ content: text, boxStyle: 'tinted' }).querySelector('.sb-box')!;
  assert.equal(box.getAttribute('role'), 'group');
  assert.equal(box.id, 'teorema-1.2');
  assert.ok(box.classList.contains('sb-box--tinted'));
  const label = [...box.querySelectorAll('[id]')].find((el) => el.id === box.getAttribute('aria-labelledby'));
  assert.equal(label?.textContent?.replace(/\s+/g, ' ').trim(), 'Teorema 1.2 · di Weierstrass');
  assert.equal(box.querySelector('details')?.hasAttribute('open'), true);
});

test('text in a card, the default, draws the same box flat, without a tint or an id', () => {
  const box = render({ content: text }).querySelector('.sb-box')!;
  assert.ok(box.classList.contains('sb-box--flat'));
  assert.ok(box.classList.contains('sb-box--line'));
  assert.ok(!box.classList.contains('sb-box--tinted'));
  assert.equal(box.id, '');
  assert.equal(box.querySelector('.sb-box-proof-body')?.textContent, 'Dimostrazione.');
});

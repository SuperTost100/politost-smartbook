import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { anchorElement, readScrollAnchor, saveScrollAnchor, type ScrollAnchor } from './scrollAnchor.ts';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

const anchor: ScrollAnchor = { paragraph: 'p3', piece: 1, block: 4, top: 120 };

test('an anchor is kept per history entry, and the oldest leave past a hundred', () => {
  const storage = memoryStorage();
  const get = () => storage;
  saveScrollAnchor('a', anchor, get);
  assert.deepEqual(readScrollAnchor('a', get), anchor);
  assert.equal(readScrollAnchor('b', get), undefined);
  for (let i = 0; i < 100; i++) saveScrollAnchor(`e${i}`, anchor, get);
  assert.equal(readScrollAnchor('a', get), undefined);
  assert.deepEqual(readScrollAnchor('e99', get), anchor);
});

test('a broken store reads as no anchor', () => {
  const storage = memoryStorage();
  storage.setItem('politost-scroll-anchors', '{"a":{"paragraph":3}}');
  assert.equal(readScrollAnchor('a', () => storage), undefined);
  storage.setItem('politost-scroll-anchors', 'not json');
  assert.equal(readScrollAnchor('a', () => storage), undefined);
});

test('storage that the browser blocks reads as no anchor and saves nothing', () => {
  const blocked = () => {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  };
  assert.equal(readScrollAnchor('a', blocked), undefined);
  assert.doesNotThrow(() => saveScrollAnchor('a', anchor, blocked));
  // The default storage too: its getter throws where storage is disabled by policy.
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get: blocked });
  try {
    assert.equal(readScrollAnchor('a'), undefined);
    assert.doesNotThrow(() => saveScrollAnchor('a', anchor));
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor);
    else delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
  }
});

test('an anchor names a block of a piece, the piece, or the paragraph', () => {
  const { document } = new JSDOM(`<article>
    <section class="paragraph-section" id="p3"><div class="paragraph-frame"><h2></h2><div class="paragraph-body">
      <div class="content-flow"><p>a</p></div>
      <div class="content-flow"><p>b</p><p id="target">c</p></div>
      <div class="paragraph-pending"></div>
    </div></div></section></article>`).window;
  const article = document.querySelector('article')!;
  assert.equal(anchorElement(article, { paragraph: 'p3', piece: 1, block: 1, top: 0 })?.id, 'target');
  assert.equal(anchorElement(article, { paragraph: 'p3', piece: 1, block: -1, top: 0 }), article.querySelectorAll('.content-flow')[1]);
  assert.equal(anchorElement(article, { paragraph: 'p3', piece: -1, block: -1, top: 0 })?.id, 'p3');
  // A piece not on the page yet, or a paragraph that is gone, names nothing.
  assert.equal(anchorElement(article, { paragraph: 'p3', piece: 2, block: 0, top: 0 }), null);
  assert.equal(anchorElement(article, { paragraph: 'p9', piece: 0, block: 0, top: 0 }), null);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { anchorAt, anchorElement, forgetScrollAnchor, readScrollAnchor, saveScrollAnchor, type ScrollAnchor } from './scrollAnchor.ts';

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

const anchor: ScrollAnchor = { chapter: 'fisica-1/sistemi-di-punti', paragraph: 'p3', piece: 1, block: 4, top: 120 };
const CHAPTER = anchor.chapter;

test('an anchor is kept per history entry, and the oldest leave past a hundred', () => {
  const storage = memoryStorage();
  const get = () => storage;
  saveScrollAnchor('a', anchor, get);
  assert.deepEqual(readScrollAnchor('a', CHAPTER, get), anchor);
  assert.equal(readScrollAnchor('b', CHAPTER, get), undefined);
  for (let i = 0; i < 100; i++) saveScrollAnchor(`e${i}`, anchor, get);
  assert.equal(readScrollAnchor('a', CHAPTER, get), undefined);
  assert.deepEqual(readScrollAnchor('e99', CHAPTER, get), anchor);
});

test('a broken store reads as no anchor', () => {
  const storage = memoryStorage();
  storage.setItem('politost-scroll-anchors', '{"a":{"paragraph":3}}');
  assert.equal(readScrollAnchor('a', CHAPTER, () => storage), undefined);
  storage.setItem('politost-scroll-anchors', 'not json');
  assert.equal(readScrollAnchor('a', CHAPTER, () => storage), undefined);
});

test("an anchor of another chapter is not this chapter's place", () => {
  // The first entry of every tab has the history key "default", whatever chapter it opened.
  const storage = memoryStorage();
  saveScrollAnchor('default', anchor, () => storage);
  assert.equal(readScrollAnchor('default', 'fisica-1/dinamica-del-punto', () => storage), undefined);
});

test('storage that the browser blocks reads as no anchor and saves nothing', () => {
  const blocked = () => {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  };
  assert.equal(readScrollAnchor('a', CHAPTER, blocked), undefined);
  assert.doesNotThrow(() => saveScrollAnchor('a', anchor, blocked));
  // The default storage too: its getter throws where storage is disabled by policy.
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get: blocked });
  try {
    assert.equal(readScrollAnchor('a', CHAPTER), undefined);
    assert.doesNotThrow(() => saveScrollAnchor('a', anchor));
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor);
    else delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
  }
});

test('at the top of the chapter, above its first paragraph, the anchor is the first paragraph where it is', () => {
  const { document } = new JSDOM('<article><header></header><section class="paragraph-section" id="p1"></section></article>').window;
  const article = document.querySelector('article')!;
  article.querySelector('section')!.getBoundingClientRect = () => ({ top: 312 }) as DOMRect;
  assert.deepEqual(anchorAt(article, CHAPTER, 400, 78), { chapter: CHAPTER, paragraph: 'p1', piece: -1, block: -1, top: 312 });
});

test('an anchor names a block of a piece, the piece, or the paragraph', () => {
  const { document } = new JSDOM(`<article>
    <section class="paragraph-section" id="p3"><div class="paragraph-frame"><h2></h2><div class="paragraph-body">
      <div class="content-flow"><p>a</p></div>
      <div class="content-flow"><p>b</p><p id="target">c</p></div>
      <div class="paragraph-pending"></div>
    </div></div></section></article>`).window;
  const article = document.querySelector('article')!;
  const at = (paragraph: string, piece: number, block: number) => anchorElement(article, { chapter: CHAPTER, paragraph, piece, block, top: 0 });
  assert.equal(at('p3', 1, 1)?.id, 'target');
  assert.equal(at('p3', 1, -1), article.querySelectorAll('.content-flow')[1]);
  assert.equal(at('p3', -1, -1)?.id, 'p3');
  // A piece not on the page yet, or a paragraph that is gone, names nothing.
  assert.equal(at('p3', 2, 0), null);
  assert.equal(at('p9', 0, 0), null);
});

test('below the last paragraph, at the end of the chapter, the anchor is the last paragraph where it is', () => {
  const { document } = new JSDOM(
    '<article><section class="paragraph-section" id="p1"></section><section class="paragraph-section" id="p2"></section><nav class="sb-pager"></nav></article>',
  ).window;
  const article = document.querySelector('article')!;
  const [first, last] = [...article.querySelectorAll('section')];
  first.getBoundingClientRect = () => ({ top: -9000, bottom: -5000 }) as DOMRect;
  last.getBoundingClientRect = () => ({ top: -4800, bottom: -120 }) as DOMRect;
  assert.deepEqual(anchorAt(article, CHAPTER, 180, 78), { chapter: CHAPTER, paragraph: 'p2', piece: -1, block: -1, top: -4800 });
});

test('a place with no anchor forgets the one saved before', () => {
  const storage = memoryStorage();
  saveScrollAnchor('a', anchor, () => storage);
  forgetScrollAnchor('a', () => storage);
  assert.equal(readScrollAnchor('a', CHAPTER, () => storage), undefined);
});

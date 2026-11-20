import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { pinIntoView, pinnedElement } from './scrollPin.ts';

test('a pin whose target has left the page does not scroll when the page resizes', () => {
  const dom = new JSDOM('<!DOCTYPE html><body><p id="target">Testo</p></body>');
  const resized: (() => void)[] = [];
  const scrolls: number[] = [];
  const g = globalThis as Record<string, unknown>;
  Object.assign(g, {
    window: dom.window,
    document: dom.window.document,
    ResizeObserver: class {
      constructor(callback: () => void) {
        resized.push(callback);
      }
      observe() {}
      disconnect() {}
    },
  });
  dom.window.scrollBy = ((options: ScrollToOptions) => void scrolls.push(options.top ?? 0)) as typeof dom.window.scrollBy;
  const target = dom.window.document.getElementById('target')!;
  target.scrollIntoView = () => undefined;
  pinIntoView(target, 'instant', 120);
  scrolls.length = 0;

  target.remove();
  for (const callback of resized) callback();
  assert.deepEqual(scrolls, []);
  assert.equal(pinnedElement(), null);
});

import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import katex from 'katex';
import { escapeHtml, sanitizeHtml } from './sanitizeHtml.ts';

describe('sanitizeHtml', () => {
  before(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    (globalThis as typeof globalThis & { window: Window }).window = dom.window as unknown as Window;
  });

  it('escapeHtml encodes angle brackets and script tags', () => {
    assert.equal(escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
    assert.equal(escapeHtml('<b>'), '&lt;b&gt;');
  });

  it('keeps KaTeX sqrt SVG markup', () => {
    const html = katex.renderToString(String.raw`\sqrt{\frac{2(h-x)}{g}}`, {
      displayMode: false,
      throwOnError: false,
    });
    const clean = sanitizeHtml(html);
    assert.match(clean, /<svg[\s>]/);
    assert.match(clean, /<path[\s>]/);
    assert.match(clean, /mord sqrt/);
  });
});

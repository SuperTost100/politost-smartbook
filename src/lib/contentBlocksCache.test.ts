import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { CONTENT_BLOCKS_CACHE_CHARS, cachedContentBlocks } from './contentBlocksCache.ts';

before(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  (globalThis as typeof globalThis & { window: Window }).window = dom.window as unknown as Window;
});

/** A code block of about a quarter of the cache, cheap to parse. */
const big = (label: string) => `\`\`\`\n${label}${'x'.repeat(CONTENT_BLOCKS_CACHE_CHARS / 8)}\n\`\`\``;

test('the same text is parsed once, until the cache is full', () => {
  const formula = 'La legge $pV = nRT$ vale per i gas ideali.';
  const first = cachedContentBlocks(formula);
  assert.equal(first[0].type, 'p');
  assert.equal(cachedContentBlocks(formula), first);

  for (let i = 0; i < 4; i++) cachedContentBlocks(big(`a${i}`));
  const again = cachedContentBlocks(formula);
  assert.notEqual(again, first, 'the oldest entry leaves when the cache is full');
  assert.deepEqual(again, first);
});

test('a text read recently stays when older ones leave', () => {
  const kept = cachedContentBlocks('Tenuto');
  const firstBig = cachedContentBlocks(big('b0'));
  for (let i = 1; i < 6; i++) {
    cachedContentBlocks(big(`b${i}`));
    assert.equal(cachedContentBlocks('Tenuto'), kept);
  }
  assert.notEqual(cachedContentBlocks(big('b0')), firstBig);
});

test('a text larger than the cache is not kept and pushes nothing out', () => {
  const kept = cachedContentBlocks('Resta');
  const huge = `\`\`\`\n${'y'.repeat(CONTENT_BLOCKS_CACHE_CHARS)}\n\`\`\``;
  const first = cachedContentBlocks(huge);
  assert.notEqual(cachedContentBlocks(huge), first);
  assert.equal(cachedContentBlocks('Resta'), kept);
});

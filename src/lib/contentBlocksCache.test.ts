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
  const first = cachedContentBlocks(formula, false);
  assert.equal(first[0].type, 'p');
  assert.equal(cachedContentBlocks(formula, false), first);

  for (let i = 0; i < 4; i++) cachedContentBlocks(big(`a${i}`), false);
  const again = cachedContentBlocks(formula, false);
  assert.notEqual(again, first, 'the oldest entry leaves when the cache is full');
  assert.deepEqual(again, first);
});

test('a text read recently stays when older ones leave', () => {
  const kept = cachedContentBlocks('Tenuto', false);
  const firstBig = cachedContentBlocks(big('b0'), false);
  for (let i = 1; i < 6; i++) {
    cachedContentBlocks(big(`b${i}`), false);
    assert.equal(cachedContentBlocks('Tenuto', false), kept);
  }
  assert.notEqual(cachedContentBlocks(big('b0'), false), firstBig);
});

test('a text larger than the cache is not kept and pushes nothing out', () => {
  const kept = cachedContentBlocks('Resta', false);
  const huge = `\`\`\`\n${'y'.repeat(CONTENT_BLOCKS_CACHE_CHARS)}\n\`\`\``;
  const first = cachedContentBlocks(huge, false);
  assert.notEqual(cachedContentBlocks(huge, false), first);
  assert.equal(cachedContentBlocks('Resta', false), kept);
});

test('blocks parsed with trusted math are never returned for an untrusted copy, and back', async () => {
  const { parseContentBlocks } = await import('./renderContent.ts');
  // DOMPurify drops the <mover> that KaTeX nests in an <mo> here, so the two outputs differ.
  const text = 'Si ha $f \\overset{\\mathrm{def}}{=} g$.';
  const trusted = cachedContentBlocks(text, true);
  assert.match(JSON.stringify(trusted), /<mo><mover>/);
  const sanitized = cachedContentBlocks(text, false);
  assert.deepEqual(sanitized, parseContentBlocks(text));
  assert.doesNotMatch(JSON.stringify(sanitized), /<mover>/);
  assert.equal(cachedContentBlocks(text, false), sanitized);
  assert.deepEqual(cachedContentBlocks(text, true), trusted);
});

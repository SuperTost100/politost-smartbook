/**
 * Smoke test for renderContent list/h3/bold handling.
 * Run: npx tsx scripts/test-render-content.ts
 */
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { parseContentBlocks, splitMarkdownBlocks } from '../src/lib/renderContent';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
(globalThis as typeof globalThis & { window: Window }).window = dom.window as unknown as Window;

const sample = `Prima frase.

Gli idrocarburi vengono distinti in due classi principali:
- **Idrocarburi alifatici**: non contengono l'anello benzenico.
- **Idrocarburi aromatici**: caratterizzati dall'anello benzenico.

### Struttura del benzene

Il benzene ha formula $C_6H_6$.`;

const blocks = splitMarkdownBlocks(sample);
assert.equal(blocks.filter((b) => b.kind === 'ul').length, 1);
assert.equal(blocks.filter((b) => b.kind === 'h3').length, 1);
const splitList = blocks.find((b) => b.kind === 'ul');
assert.ok(splitList && splitList.kind === 'ul');
assert.match(splitList.items[0], /\*\*Idrocarburi alifatici\*\*/);
assert.doesNotMatch(blocks.filter((b) => b.kind === 'p').map((b) => b.kind === 'p' ? b.text : '').join('\n'), /principali:\s*-/);

const parsed = parseContentBlocks(sample);
assert.equal(parsed.filter((b) => b.type === 'ul').length, 1);
assert.equal(parsed.filter((b) => b.type === 'h3').length, 1);
const parsedList = parsed.find((b) => b.type === 'ul');
assert.ok(parsedList && parsedList.type === 'ul');
const itemHtml = parsedList.items[0].map((s) => (s.type === 'text' ? s.html : '')).join('');
assert.match(itemHtml, /<strong>Idrocarburi alifatici<\/strong>/);

const listGap = `- **uno**
- **due**`;
const gap = splitMarkdownBlocks(listGap);
const gapList = gap.find((b) => b.kind === 'ul');
assert.ok(gapList && gapList.kind === 'ul');
assert.equal(gapList.items.length, 2);
assert.equal(parseContentBlocks(listGap).filter((b) => b.type === 'ul').length, 1);

console.log('renderContent OK');

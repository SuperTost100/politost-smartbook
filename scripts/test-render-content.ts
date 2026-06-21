/**
 * Smoke test for renderContent list/h3/bold handling.
 * Run: npx tsx scripts/test-render-content.ts
 */
import assert from 'node:assert/strict';
import { renderInlineMarkdown, splitMarkdownBlocks } from '../src/lib/renderContent';

const sample = `Prima frase.

Gli idrocarburi vengono distinti in due classi principali:
- **Idrocarburi alifatici**: non contengono l'anello benzenico.
- **Idrocarburi aromatici**: caratterizzati dall'anello benzenico.

### Struttura del benzene

Il benzene ha formula $C_6H_6$.`;

const blocks = splitMarkdownBlocks(sample);
assert.equal(blocks.filter((b) => b.kind === 'ul').length, 1);
assert.equal(blocks.filter((b) => b.kind === 'h3').length, 1);

const html = renderInlineMarkdown(sample);
assert.match(html, /<ul class="content-list">/);
assert.match(html, /<strong>Idrocarburi alifatici<\/strong>/);
assert.match(html, /<h3 class="content-subheading">/);
assert.doesNotMatch(html, /principali:\s*-/);

const listGap = `- **uno**
- **due**`;
const html2 = renderInlineMarkdown(listGap);
assert.equal(html2.match(/<ul/g)?.length, 1);

console.log('renderContent OK');

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { paginateSlices, slicePrintChapters } from './chapterSlices.ts';

test('print chapters are split and a yield runs before each one', async () => {
  const dom = new JSDOM(`<div class="print-flow">
    <header class="print-brand-block">Brand</header>
    <section data-print-chapter="c1">One</section>
    <section data-print-chapter="c2">Two</section>
  </div>`);
  const flow = dom.window.document.querySelector('.print-flow') as HTMLElement;
  const slices = slicePrintChapters(flow);
  assert.equal(slices.length, 2);
  assert.equal(slices[0].querySelectorAll('[data-print-chapter]').length, 1);
  assert.equal(slices[1].querySelector('.print-brand-block'), null);
  assert.equal(slices[1].textContent?.includes('One'), false);

  const order: string[] = [];
  await paginateSlices(
    slices,
    async (slice) => {
      order.push(`preview:${slice.getAttribute('data-print-chapter') ?? slice.querySelector('[data-print-chapter]')?.getAttribute('data-print-chapter')}`);
      return true;
    },
    async () => {
      order.push('yield');
    },
  );
  assert.deepEqual(order, ['yield', 'preview:c1', 'yield', 'preview:c2']);
});

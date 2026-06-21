import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { dedupePagedChunks } from '../src/dedupePages.ts';

function page(html: string): HTMLElement {
  const dom = new JSDOM(`<div class="pagedjs_pages">${html}</div>`);
  return dom.window.document.querySelector('.pagedjs_pages') as HTMLElement;
}

describe('dedupePagedChunks', () => {
  it('removes duplicate print-chunks already laid out on a prior page', () => {
    const root = page(`
      <div class="pagedjs_page">
        <div class="pagedjs_area">
          <div class="print-chunk" data-chunk-id="p1-0"><p>First page</p></div>
        </div>
      </div>
      <div class="pagedjs_page">
        <div class="pagedjs_area">
          <div class="print-chunk" data-chunk-id="p1-0"><p>Duplicate</p></div>
          <div class="print-chunk" data-chunk-id="p1-1"><p>Next chunk</p></div>
        </div>
      </div>
    `);

    dedupePagedChunks(root);

    const chunks = [...root.querySelectorAll('.print-chunk')].map(
      (el) => (el as HTMLElement).dataset.chunkId,
    );
    assert.deepEqual(chunks, ['p1-0', 'p1-1']);
    assert.equal(root.textContent?.includes('Duplicate'), false);
  });

  it('keeps split continuations marked with data-split-from', () => {
    const root = page(`
      <div class="pagedjs_page">
        <div class="pagedjs_area">
          <div class="print-chunk" data-chunk-id="p1-0"><p>Start</p></div>
        </div>
      </div>
      <div class="pagedjs_page">
        <div class="pagedjs_area">
          <div class="print-chunk" data-chunk-id="p1-0" data-split-from="p1-0">
            <p>Continuation</p>
          </div>
        </div>
      </div>
    `);

    dedupePagedChunks(root);

    assert.equal(root.querySelectorAll('.print-chunk').length, 2);
    assert.equal(root.textContent?.includes('Continuation'), true);
  });

  it('removes duplicate paragraph titles on later pages', () => {
    const root = page(`
      <div class="pagedjs_page">
        <div class="pagedjs_area">
          <section class="paragraph-section">
            <h3 class="paragraph-title"><span class="para-num">p1</span> I composti organici</h3>
          </section>
        </div>
      </div>
      <div class="pagedjs_page">
        <div class="pagedjs_area">
          <h3 class="paragraph-title"><span class="para-num">p1</span> I composti organici</h3>
        </div>
      </div>
    `);

    dedupePagedChunks(root);

    assert.equal(root.querySelectorAll('.paragraph-title').length, 1);
  });
});

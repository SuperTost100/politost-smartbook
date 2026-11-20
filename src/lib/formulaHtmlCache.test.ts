import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FORMULA_HTML_CACHE_SIZE, formulaHtml } from './formulaHtmlCache.ts';

test('a formula renders once, and the one read longest ago leaves when the cache is full', () => {
  let renders = 0;
  const render = (tex: string) => {
    renders++;
    return `<span>${tex}</span>`;
  };
  assert.equal(formulaHtml('E = mc^2', render), '<span>E = mc^2</span>');
  assert.equal(formulaHtml('E = mc^2', render), '<span>E = mc^2</span>');
  assert.equal(renders, 1);

  formulaHtml('a', render);
  for (let i = 0; i < FORMULA_HTML_CACHE_SIZE - 2; i++) formulaHtml(`x_${i}`, render);
  const full = renders;
  formulaHtml('E = mc^2', render); // read again, so it stays
  assert.equal(renders, full);
  formulaHtml('y', render); // pushes out "a", now the oldest
  const before = renders;
  formulaHtml('E = mc^2', render);
  assert.equal(renders, before);
  formulaHtml('a', render);
  assert.equal(renders, before + 1);
});

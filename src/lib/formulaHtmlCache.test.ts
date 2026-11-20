import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FORMULA_HTML_CACHE_SIZE, formulaHtml } from './formulaHtmlCache.ts';

test('a formula renders once, and the one read longest ago leaves when the cache is full', () => {
  let renders = 0;
  const render = (tex: string) => {
    renders++;
    return `<span>${tex}</span>`;
  };
  assert.equal(formulaHtml('E = mc^2', false, render), '<span>E = mc^2</span>');
  assert.equal(formulaHtml('E = mc^2', false, render), '<span>E = mc^2</span>');
  assert.equal(renders, 1);

  formulaHtml('a', false, render);
  for (let i = 0; i < FORMULA_HTML_CACHE_SIZE - 2; i++) formulaHtml(`x_${i}`, false, render);
  const full = renders;
  formulaHtml('E = mc^2', false, render); // read again, so it stays
  assert.equal(renders, full);
  formulaHtml('y', false, render); // pushes out "a", now the oldest
  const before = renders;
  formulaHtml('E = mc^2', false, render);
  assert.equal(renders, before);
  formulaHtml('a', false, render);
  assert.equal(renders, before + 1);
});

test('a formula rendered with trusted math is never returned for an untrusted copy', () => {
  const calls: boolean[] = [];
  const render = (tex: string, mathTrusted: boolean) => {
    calls.push(mathTrusted);
    return `${mathTrusted ? 'trusted' : 'sanitized'} ${tex}`;
  };
  assert.equal(formulaHtml('z = 1', true, render), 'trusted z = 1');
  assert.equal(formulaHtml('z = 1', false, render), 'sanitized z = 1');
  assert.equal(formulaHtml('z = 1', true, render), 'trusted z = 1');
  assert.equal(formulaHtml('z = 1', false, render), 'sanitized z = 1');
  assert.deepEqual(calls, [true, false]);
});

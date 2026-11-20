import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { hrefTo, inDocumentTarget, linkPrintRefs, printIds, refTargets, resolveRef } from './printLinks.ts';

test('a formula ref tries its equation, then its formula-sheet card; a paragraph ref its paragraph, then its chapter', () => {
  assert.deepEqual(refTargets('formula/7.11'), ['eq-7.11', 'formula-7.11']);
  assert.deepEqual(refTargets('chapter/3#p2'), ['cap-3-p2', 'cap-3']);
  assert.deepEqual(refTargets('https://example.com'), []);
  assert.deepEqual(refTargets('formula/'), []);
});

test('resolveRef picks the first target the document has, or null', () => {
  const has = (ids: string[]) => (id: string) => ids.includes(id);
  assert.equal(resolveRef('formula/7.11', has(['eq-7.11', 'formula-7.11'])), 'eq-7.11');
  assert.equal(resolveRef('formula/7.11', has(['formula-7.11'])), 'formula-7.11');
  assert.equal(resolveRef('formula/7.11', has([])), null);
  assert.equal(resolveRef('chapter/3#p9', has(['cap-3'])), 'cap-3');
});

test('a chapter equation and its formula-sheet card never share an id', () => {
  assert.notEqual(printIds.equation('1.2'), printIds.formulaCard('1.2'));
  assert.notEqual(printIds.exercise('ex', 'E1.1'), printIds.solution('ex', 'E1.1'));
});

function sheet(html: string) {
  const { document } = new JSDOM(`<!DOCTYPE html><body><article id="sheet">${html}</article></body>`).window;
  return document.getElementById('sheet')!;
}

const equation = (id: string, chapter: number) =>
  `<div class="numbered-formula" data-formula-id="${id}" data-formula-chapter="${chapter}"></div>`;
const ref = (target: string) => `<a data-print-ref="${target}">x</a>`;

test('a formula ref links to the first equation in its own chapter, never to a copy in another chapter', () => {
  const root = sheet(`
    <div data-print-chapter-n="2">${equation('3.1', 3)}${ref('formula/3.1')}</div>
    <div data-print-chapter-n="3">${equation('3.1', 3)}${equation('3.1', 3)}</div>`);
  linkPrintRefs(root);
  const copies = root.querySelectorAll('.numbered-formula');
  assert.deepEqual([...copies].map((el) => el.id), ['', 'eq-3.1', '']);
  assert.equal(root.querySelector('a')!.getAttribute('href'), '#eq-3.1');
});

test('without its chapter a formula ref falls back to the formula sheet, and without that it is plain text', () => {
  const withSheet = sheet(`
    <div data-print-chapter-n="2">${equation('3.1', 3)}${ref('formula/3.1')}</div>
    <div id="formula-3.1"></div>`);
  linkPrintRefs(withSheet);
  assert.equal(withSheet.querySelector('a')!.getAttribute('href'), '#formula-3.1');

  const alone = sheet(`<div data-print-chapter-n="2">${ref('formula/3.1')}</div>`);
  linkPrintRefs(alone);
  assert.equal(alone.querySelector('a')!.hasAttribute('href'), false);
});

test('a second pass drops the href of a target that is no longer printed', () => {
  const root = sheet(`<div data-print-chapter-n="1">${ref('chapter/1#p2')}<section id="cap-1-p2"></section></div>`);
  linkPrintRefs(root);
  assert.equal(root.querySelector('a')!.getAttribute('href'), '#cap-1-p2');
  root.querySelector('section')!.remove();
  linkPrintRefs(root);
  assert.equal(root.querySelector('a')!.hasAttribute('href'), false);
});

test('inDocumentTarget finds only ids inside the sheet, and ignores other hrefs', () => {
  const root = sheet(`<div id="${printIds.equation('1.2')}"></div>`);
  root.ownerDocument.body.insertAdjacentHTML('beforeend', '<div id="outside"></div>');
  assert.equal(inDocumentTarget(root, hrefTo('eq-1.2'))?.id, 'eq-1.2');
  assert.equal(inDocumentTarget(root, '#outside'), null);
  assert.equal(inDocumentTarget(root, 'https://example.com/#eq-1.2'), null);
  assert.equal(inDocumentTarget(root, '#%E0%A4%A'), null);
  assert.equal(inDocumentTarget(root, '#'), null);
});

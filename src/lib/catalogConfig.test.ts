import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalogAssets, catalogEntryToConfig, catalogPayloads } from './catalogConfig.ts';

const stub = {
  id: 'cloud-m01-demo',
  title: 'Demo Cloud Book',
  subject: 'demo',
  access: 'licensed',
  chapters: [{ id: 'c1', number: 1, title: 'Cap 1', file: 'chapters/01.md', printable: true }],
  sections: {
    formulario: { enabled: true, label: 'Formulario' },
    esercizi: { enabled: true, label: 'Esercizi' },
    esami: { enabled: true, label: 'Esami' },
    ide: { enabled: true, label: 'Laboratorio' },
    grafici: { enabled: true, label: 'Grafici' },
    risposte: { enabled: true, label: 'Risposte' },
  },
  esercizi: ':::esercizio{id="e1"}\nQ\n:::',
  ide: [{ id: 's', title: 'S', language: 'python', code: 'x = 1' }],
};

test('catalog section flags are copied instead of forced off', () => {
  const sections = catalogEntryToConfig(stub).sections;
  assert.equal(sections.smartbook.enabled, true);
  assert.equal(sections.esercizi.enabled, true);
  assert.equal(sections.esercizi.label, 'Esercizi');
  assert.equal(sections.esami.enabled, true);
  assert.equal(sections.ide.enabled, true);
  assert.equal(sections.grafici.enabled, true);
  assert.equal(sections.formulario.enabled, true);
  assert.equal(sections.risposte.enabled, true);
});

test('enabled sections load payloads and a flag alone stays empty', () => {
  const withPayload = catalogPayloads(stub);
  assert.match(withPayload.eserciziRaw, /esercizio/);
  assert.equal(withPayload.ide.length, 1);

  const flagOnly = catalogPayloads({
    ...stub,
    esercizi: undefined,
    ide: undefined,
  });
  assert.equal(flagOnly.eserciziRaw, '');
  assert.deepEqual(flagOnly.ide, []);

  const off = catalogPayloads({
    ...stub,
    sections: { esercizi: { enabled: false, label: 'Esercizi' } },
  });
  assert.equal(off.eserciziRaw, '');
});

test('catalog assets are copied when the entry sends them', () => {
  const assets = catalogAssets({
    ...stub,
    assets: { 'assets/diagram.svg': '/api/books/cloud-m01-demo/assets/diagram.svg' },
  });
  assert.equal(assets['assets/diagram.svg'], '/api/books/cloud-m01-demo/assets/diagram.svg');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizePlotlyConfig } from './plotlySanitize.ts';

test('plotly allowlist keeps a bar chart and drops unknown keys and HTML', () => {
  const cleaned = sanitizePlotlyConfig(
    [{
      type: 'bar',
      x: ['Lun'],
      y: [3],
      name: 'Ore',
      text: ['<b>Lun</b>'],
      onclick: 'alert(1)',
    }],
    { title: 'Esempio', updatemenus: [{ type: 'dropdown' }] },
  );
  assert.ok(cleaned);
  const trace = cleaned.data[0] as { text: string[]; onclick?: string };
  assert.deepEqual(trace.text, ['Lun']);
  assert.equal(trace.onclick, undefined);
  assert.equal((cleaned.layout as { updatemenus?: unknown }).updatemenus, undefined);
  assert.equal(cleaned.layout.title, 'Esempio');
});

test('plotly config outside the trace allowlist does not render', () => {
  assert.equal(sanitizePlotlyConfig([{ type: 'indicator', value: 1 }], {}), null);
  assert.equal(sanitizePlotlyConfig('nope', {}), null);
  const dropped = sanitizePlotlyConfig(
    [{ type: 'scatter', y: [1], marker: { size: 4, symbol: [() => 1] } }],
    {},
  );
  const marker = (dropped?.data[0] as { marker?: { symbol?: unknown } }).marker;
  assert.equal(marker?.symbol, undefined);
});

test('a scattergl trace draws as scatter, the bundled equivalent', () => {
  const cleaned = sanitizePlotlyConfig([{ type: 'scattergl', x: [1, 2], y: [3, 4] }], {});
  assert.ok(cleaned);
  assert.equal((cleaned.data[0] as { type: string }).type, 'scatter');
});

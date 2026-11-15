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

test('an axis keeps an equal scale, so a circle draws round', () => {
  const cleaned = sanitizePlotlyConfig([{ type: 'scatter', x: [1], y: [1] }], {
    xaxis: { range: [-2, 2] },
    yaxis: { scaleanchor: 'x', scaleratio: 1 },
  });
  assert.deepEqual(cleaned?.layout.yaxis, { scaleanchor: 'x', scaleratio: 1 });
  const second = sanitizePlotlyConfig([{ type: 'scatter', y: [1] }], { xaxis: { scaleanchor: 'y2', scaleratio: 0.5 } });
  assert.deepEqual(second?.layout.xaxis, { scaleanchor: 'y2', scaleratio: 0.5 });
});

test('a scale anchor that is not an axis id, or a ratio that is not a positive number, is dropped', () => {
  for (const scaleanchor of ['z', 'x0', 'x1', 'x02', 'xy', 'x 2', '<b>x</b>', 'x2; alert(1)', 1, true, ['x'], { id: 'x' }]) {
    const cleaned = sanitizePlotlyConfig([{ type: 'scatter', y: [1] }], { yaxis: { scaleanchor } });
    assert.deepEqual(cleaned?.layout.yaxis, {}, `scaleanchor ${JSON.stringify(scaleanchor)}`);
  }
  for (const scaleratio of [0, -1, '1', null, true, [1]]) {
    const cleaned = sanitizePlotlyConfig([{ type: 'scatter', y: [1] }], { yaxis: { scaleratio } });
    assert.deepEqual(cleaned?.layout.yaxis, {}, `scaleratio ${JSON.stringify(scaleratio)}`);
  }
  // JSON has no Infinity or NaN, but a config built in code can.
  for (const scaleratio of [Infinity, NaN]) {
    const cleaned = sanitizePlotlyConfig([{ type: 'scatter', y: [1] }], { yaxis: { scaleratio } });
    assert.deepEqual(cleaned?.layout.yaxis, {});
  }
});

test('scaleanchor and scaleratio count only on axes', () => {
  const cleaned = sanitizePlotlyConfig([{ type: 'scatter', y: [1], scaleanchor: 'x', marker: { scaleratio: 2 } }], {
    scaleanchor: 'x',
    legend: { scaleratio: 2 },
  });
  assert.equal((cleaned?.data[0] as { scaleanchor?: unknown }).scaleanchor, undefined);
  assert.deepEqual((cleaned?.data[0] as { marker?: unknown }).marker, {});
  assert.equal(cleaned?.layout.scaleanchor, undefined);
  assert.deepEqual(cleaned?.layout.legend, {});
});

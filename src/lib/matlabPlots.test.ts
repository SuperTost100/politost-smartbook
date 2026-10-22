import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PlotInstruction } from 'numbl';
import { plotsFromInstructions } from './matlabPlots.ts';

const line = (y: number[], extra: Record<string, unknown> = {}) => ({ x: y.map((_, i) => i + 1), y, ...extra });
const plot = (...traces: ReturnType<typeof line>[]) => ({ type: 'plot', traces }) as PlotInstruction;
const ins = (i: Record<string, unknown>) => i as unknown as PlotInstruction;

test('plot without hold on replaces the axes; with hold on it adds a trace', () => {
  const replaced = plotsFromInstructions([plot(line([1, 2])), plot(line([3, 4]))]);
  assert.equal(replaced.figures[0].data.length, 1);
  assert.deepEqual(replaced.figures[0].data[0].y, [3, 4]);

  const held = plotsFromInstructions([plot(line([1, 2])), ins({ type: 'set_hold', value: true }), plot(line([3, 4]))]);
  assert.equal(held.figures[0].data.length, 2);
  // MATLAB's colour order: blue, then orange.
  assert.deepEqual(held.figures[0].data.map((d) => (d.line as { color: string }).color), ['#0072BD', '#D95319']);
});

test('line style, marker and colour follow the MATLAB spec', () => {
  const { figures } = plotsFromInstructions([
    plot(line([1, 2], { color: [1, 0, 0], lineStyle: '--', marker: 'o' }), line([2, 3], { marker: 'o', lineStyle: 'none' })),
  ]);
  const [a, b] = figures[0].data;
  assert.equal(a.mode, 'lines+markers');
  assert.deepEqual(a.line, { color: 'rgb(255,0,0)', width: 1.5, dash: 'dash' });
  assert.equal(b.mode, 'markers');
});

test('labels, legend, grid, limits and log scale reach the layout', () => {
  const { figures } = plotsFromInstructions([
    ins({ type: 'set_axis_scale', value: 'semilogy' }),
    plot(line([1, 10, 100]), line([2, 20, 200])),
    ins({ type: 'set_xlabel', text: 'n' }),
    ins({ type: 'set_ylabel', text: '<b>errore</b>' }),
    ins({ type: 'set_legend', labels: ['a', 'b'] }),
    ins({ type: 'set_grid', value: true }),
    ins({ type: 'set_axis_limits', xlim: [0, 4], ylim: 'auto' }),
  ]);
  const { layout, data } = figures[0];
  const yaxis = layout.yaxis as Record<string, unknown>;
  assert.equal(yaxis.type, 'log');
  assert.deepEqual(yaxis.title, { text: 'errore', font: { size: 13 } });
  assert.equal(yaxis.exponentformat, 'power');
  assert.deepEqual((layout.xaxis as Record<string, unknown>).range, [0, 4]);
  assert.equal(layout.showlegend, true);
  assert.deepEqual(data.map((d) => d.name), ['a', 'b']);
});

test('a plain plot after semilogy without hold goes back to a linear scale', () => {
  const { figures } = plotsFromInstructions([ins({ type: 'set_axis_scale', value: 'semilogy' }), plot(line([1, 10])), plot(line([1, 2]))]);
  assert.equal((figures[0].layout.yaxis as Record<string, unknown>).type, 'linear');
});

test('figure, subplot, clf and close all shape the output like MATLAB', () => {
  const { figures } = plotsFromInstructions([
    plot(line([1])),
    ins({ type: 'close_all' }),
    ins({ type: 'set_figure_handle', handle: 1 }),
    ins({ type: 'set_subplot', rows: 2, cols: 1, index: 1 }),
    plot(line([1, 2])),
    ins({ type: 'set_title', text: 'sopra' }),
    ins({ type: 'set_subplot', rows: 2, cols: 1, index: 2 }),
    plot(line([2, 1])),
    ins({ type: 'set_figure_handle', handle: 2 }),
    plot(line([5])),
    ins({ type: 'clf' }),
  ]);
  assert.equal(figures.length, 1);
  const f = figures[0];
  assert.deepEqual(f.data.map((d) => d.yaxis), ['y', 'y2']);
  assert.equal(f.height, 560);
  assert.equal((f.layout.annotations as { text: string }[])[0].text, 'sopra');
});

test('3-D plots are listed as unsupported instead of failing', () => {
  const r = plotsFromInstructions([ins({ type: 'surf', trace: {} }), plot(line([1, 2]))]);
  assert.deepEqual(r.unsupported, ['surf']);
  assert.equal(r.figures.length, 1);
});

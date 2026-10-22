import type { PlotInstruction } from 'numbl';

/** A Plotly figure built from a MATLAB script's plot commands. */
export interface LabFigure {
  data: Record<string, unknown>[];
  layout: Record<string, unknown>;
  /** Pixel size for the PNG: taller when the figure has rows of subplots. */
  width: number;
  height: number;
}

type Rgb = [number, number, number];
interface Trace { x: number[]; y: number[]; lineStyle?: string; marker?: string; color?: Rgb; lineWidth?: number; markerSize?: number; width?: number }

interface Axes {
  traces: { kind: 'line' | 'bar'; trace: Trace }[];
  scale: 'linear' | 'semilogx' | 'semilogy' | 'loglog';
  title?: string;
  xlabel?: string;
  ylabel?: string;
  legend?: string[];
  grid: boolean;
  xlim?: [number, number];
  ylim?: [number, number];
  equal: boolean;
}

interface Figure { rows: number; cols: number; axes: Map<number, Axes>; current: number }

/** MATLAB's default line colours, in order. */
const COLOR_ORDER = ['#0072BD', '#D95319', '#EDB120', '#7E2F8E', '#77AC30', '#4DBEEE', '#A2142F'];

const DASH: Record<string, string> = { '-': 'solid', '--': 'dash', ':': 'dot', '-.': 'dashdot' };

const SYMBOL: Record<string, string> = {
  o: 'circle', '+': 'cross-thin-open', '*': 'asterisk-open', '.': 'circle', x: 'x-thin-open', s: 'square', d: 'diamond',
  '^': 'triangle-up', v: 'triangle-down', '>': 'triangle-right', '<': 'triangle-left', p: 'star', h: 'hexagram',
};

/** Instructions with no 2-D Plotly equivalent here: the student is told the figure is missing. */
const UNSUPPORTED: Record<string, string> = {
  plot3: 'plot3', line3: 'line3', surf: 'surf', surface: 'surface', mesh: 'mesh', contour: 'contour', imagesc: 'imagesc',
  pcolor: 'pcolor', patch: 'patch', bar3: 'bar3', uihtml: 'uihtml',
};

const newAxes = (): Axes => ({ traces: [], scale: 'linear', grid: false, equal: false });
const rgb = ([r, g, b]: Rgb) => `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
/** Labels end up in Plotly's SVG, which reads a few HTML tags: keep them as plain text. */
const plain = (text: string) => text.replace(/<[^>]*>/g, '');
const isRange = (v: unknown): v is [number, number] => Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number' && Number.isFinite(n));

/**
 * Replays numbl's plot instructions as MATLAB would draw them (figure, subplot, hold, clf, close all)
 * and returns one Plotly figure per MATLAB figure, plus the names of plot commands the lab cannot draw.
 */
export function plotsFromInstructions(instructions: PlotInstruction[]): { figures: LabFigure[]; unsupported: string[] } {
  const figures = new Map<number, Figure>();
  const unsupported = new Set<string>();
  let currentFigure = 0;
  let hold = false;

  const figure = (): Figure => {
    if (!figures.has(currentFigure)) figures.set(currentFigure, { rows: 1, cols: 1, axes: new Map(), current: 1 });
    return figures.get(currentFigure)!;
  };
  const axes = (): Axes => {
    const f = figure();
    if (!f.axes.has(f.current)) f.axes.set(f.current, newAxes());
    return f.axes.get(f.current)!;
  };
  const addTraces = (kind: 'line' | 'bar', traces: Trace[], replace: boolean) => {
    const a = axes();
    // A new plot without hold on replaces the axes, as in MATLAB; semilogy and loglog set the scale after this.
    if (replace && !hold) Object.assign(a, newAxes());
    for (const trace of traces) a.traces.push({ kind, trace });
  };

  let pendingScale: Axes['scale'] | null = null;
  for (const ins of instructions) {
    const i = ins as { type: string } & Record<string, unknown>;
    switch (i.type) {
      case 'set_figure_handle':
        currentFigure = Number(i.handle);
        figure();
        break;
      case 'set_subplot': {
        const f = figure();
        f.rows = Number(i.rows);
        f.cols = Number(i.cols);
        f.current = Number(i.index);
        break;
      }
      case 'set_hold':
        hold = Boolean(i.value);
        break;
      case 'set_axis_scale':
        pendingScale = String(i.value) as Axes['scale'];
        break;
      case 'plot':
      case 'line':
      case 'bar':
      case 'barh': {
        addTraces(i.type === 'bar' || i.type === 'barh' ? 'bar' : 'line', i.traces as Trace[], i.type !== 'line');
        if (pendingScale) axes().scale = pendingScale;
        pendingScale = null;
        break;
      }
      case 'set_title':
        axes().title = plain(String(i.text));
        break;
      case 'set_xlabel':
        axes().xlabel = plain(String(i.text));
        break;
      case 'set_ylabel':
        axes().ylabel = plain(String(i.text));
        break;
      case 'set_legend':
        axes().legend = (i.labels as unknown[]).map((l) => plain(String(l)));
        break;
      case 'set_grid':
        axes().grid = Boolean(i.value);
        break;
      case 'set_axis_limits': {
        const a = axes();
        if (isRange(i.xlim)) a.xlim = i.xlim;
        if (isRange(i.ylim)) a.ylim = i.ylim;
        break;
      }
      case 'set_axis':
        if (i.value === 'equal') axes().equal = true;
        break;
      case 'clf':
        figures.delete(currentFigure);
        break;
      case 'close_all':
        figures.clear();
        break;
      default:
        if (UNSUPPORTED[i.type]) unsupported.add(UNSUPPORTED[i.type]);
    }
  }

  const out: LabFigure[] = [];
  for (const [, f] of [...figures].sort(([a], [b]) => a - b)) {
    const used = [...f.axes].filter(([, a]) => a.traces.length > 0).sort(([a], [b]) => a - b);
    if (used.length === 0) continue;
    out.push(toPlotly(f, used));
  }
  return { figures: out, unsupported: [...unsupported] };
}

function toPlotly(f: Figure, used: [number, Axes][]): LabFigure {
  const data: Record<string, unknown>[] = [];
  const layout: Record<string, unknown> = {
    margin: { l: 60, r: 20, t: 40, b: 50 },
    paper_bgcolor: '#ffffff',
    plot_bgcolor: '#ffffff',
    font: { family: 'Helvetica, Arial, sans-serif', size: 13, color: '#222222' },
    showlegend: false,
  };
  const annotations: Record<string, unknown>[] = [];
  const single = f.rows * f.cols === 1;
  // Room between subplots for the x label of one and the title of the next, as fractions of the figure.
  const colGap = 0.07;
  const rowGap = 0.11;

  used.forEach(([index, a], n) => {
    const suffix = n === 0 ? '' : String(n + 1);
    const row = Math.floor((index - 1) / f.cols);
    const col = (index - 1) % f.cols;
    const xDomain = [col / f.cols + (col > 0 ? colGap : 0), (col + 1) / f.cols - (col < f.cols - 1 ? colGap : 0)];
    const yDomain = [1 - (row + 1) / f.rows + (row < f.rows - 1 ? rowGap : 0), 1 - row / f.rows - (row > 0 ? rowGap : 0)];
    const logX = a.scale === 'semilogx' || a.scale === 'loglog';
    const logY = a.scale === 'semilogy' || a.scale === 'loglog';
    // Powers of ten on tick labels (1e-4 as 10^-4, as MATLAB writes it), not SI prefixes such as 100µ.
    const axisStyle = { showline: true, linecolor: '#444444', mirror: true, ticks: 'outside', zeroline: false, showgrid: a.grid, gridcolor: '#e3e3e3', exponentformat: 'power' };
    layout[`xaxis${suffix}`] = {
      ...axisStyle, domain: xDomain, anchor: `y${suffix}`, type: logX ? 'log' : 'linear',
      ...(a.xlabel ? { title: { text: a.xlabel, font: { size: 13 } } } : {}),
      ...(a.xlim ? { range: logX ? a.xlim.map(Math.log10) : a.xlim } : {}),
    };
    layout[`yaxis${suffix}`] = {
      ...axisStyle, domain: yDomain, anchor: `x${suffix}`, type: logY ? 'log' : 'linear',
      ...(a.ylabel ? { title: { text: a.ylabel, font: { size: 13 } } } : {}),
      ...(a.ylim ? { range: logY ? a.ylim.map(Math.log10) : a.ylim } : {}),
      ...(a.equal ? { scaleanchor: `x${suffix}`, scaleratio: 1 } : {}),
    };
    if (a.title) {
      if (single) layout.title = { text: a.title, x: 0.5 };
      else annotations.push({ text: a.title, xref: 'paper', yref: 'paper', x: (xDomain[0] + xDomain[1]) / 2, y: yDomain[1] + 0.02, xanchor: 'center', yanchor: 'bottom', showarrow: false, font: { size: 13 } });
    }
    if (a.legend?.length) layout.showlegend = true;

    a.traces.forEach(({ kind, trace }, k) => {
      const color = trace.color ? rgb(trace.color) : COLOR_ORDER[k % COLOR_ORDER.length];
      const name = a.legend?.[k];
      const common = { x: trace.x, y: trace.y, xaxis: `x${suffix}`, yaxis: `y${suffix}`, name: name ?? '', showlegend: name !== undefined };
      if (kind === 'bar') {
        data.push({ ...common, type: 'bar', marker: { color }, width: trace.width });
        return;
      }
      const hasLine = trace.lineStyle !== 'none';
      const hasMarker = Boolean(trace.marker && trace.marker !== 'none');
      data.push({
        ...common,
        type: 'scatter',
        mode: hasLine && hasMarker ? 'lines+markers' : hasMarker ? 'markers' : 'lines',
        line: { color, width: (trace.lineWidth ?? 0.75) * 2, dash: DASH[trace.lineStyle ?? '-'] ?? 'solid' },
        ...(hasMarker ? { marker: { color, symbol: SYMBOL[trace.marker!] ?? 'circle', size: trace.marker === '.' ? 4 : (trace.markerSize ?? 6) + 2 } } : {}),
      });
    });
  });
  if (annotations.length) layout.annotations = annotations;
  return { data, layout, width: f.cols > 1 ? 760 : 640, height: f.rows > 1 ? 280 * f.rows : 420 };
}

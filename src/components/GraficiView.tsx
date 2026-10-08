import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plot } from '../lib/plotlyComponent';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { GraficoConfig } from '../types/smartbook';
import { evalExprAtX } from '../lib/safeMathExpr';
import { sanitizePlotlyConfig } from '../lib/plotlySanitize';
import { useChartColors } from '../lib/useChartColors';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { SectionHeader } from './ds/SectionHeader';
import { GraphPanel, type LegendItem } from './ds/GraphPanel';

interface GraficiViewProps {
  grafici: GraficoConfig[];
}

interface FunctionCfg {
  functions: { fn: string; label?: string }[];
  xDomain: [number, number];
  yDomain?: [number, number];
  xLabel?: string;
  yLabel?: string;
}

type Layout = Record<string, unknown>;

function asObject(value: unknown): Layout {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Layout) : {};
}

function buildPlotlyFromFunctions(cfg: FunctionCfg, colors: string[]) {
  const [xMin, xMax] = cfg.xDomain;
  const steps = 200;
  const xs = Array.from({ length: steps }, (_, i) => xMin + (i / (steps - 1)) * (xMax - xMin));

  return cfg.functions.map((f, i) => ({
    type: 'scatter' as const,
    mode: 'lines' as const,
    name: f.label ?? f.fn,
    x: xs,
    y: xs.map((x) => evalExprAtX(f.fn, x)),
    // the dash keeps series apart without colour
    line: { color: colors[i % colors.length], width: 2.25, dash: i === 1 ? ('dash' as const) : ('solid' as const) },
  }));
}

function axisTitle(title: unknown, colors: { font: string; tick: string }): { title?: Layout } {
  const t = typeof title === 'string' ? { text: title } : asObject(title);
  if (typeof t.text !== 'string' || !t.text) return {};
  return { title: { ...t, font: { family: colors.font, size: 12, color: colors.tick } } };
}

/**
 * Legend entries from the traces: name, colour and dash. Pie slices are not traces,
 * so a pie keeps Plotly's own legend (undefined here).
 */
function legendItems(data: object[], series: string[]): LegendItem[] | undefined {
  const traces = data.map(asObject);
  if (traces.some((t) => t.type === 'pie')) return undefined;
  const items: LegendItem[] = [];
  traces.forEach((trace, i) => {
    if (typeof trace.name !== 'string' || !trace.name || trace.showlegend === false) return;
    const line = asObject(trace.line);
    const marker = asObject(trace.marker);
    const color = [line.color, marker.color].find((c): c is string => typeof c === 'string') ?? series[i % series.length];
    items.push({ label: trace.name, color, dashed: typeof line.dash === 'string' && line.dash !== 'solid' });
  });
  return items.length > 0 ? items : undefined;
}

export function GraficiView({ grafici }: GraficiViewProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showTools, setShowTools] = useState(false);
  const colors = useChartColors();
  // Matches the one-column breakpoint of .grafici-layout in ds.css.
  const compact = useMediaQuery('(max-width: 820px), (max-height: 520px)');

  // The open graph lives in the URL, so a reload or a shared link keeps it.
  const index = Math.max(0, grafici.findIndex((g) => g.id === searchParams.get('grafico')));
  const grafico = grafici[index];
  const prev = grafici[index - 1];
  const next = grafici[index + 1];

  const select = (id: string) => {
    setSearchParams((params) => {
      params.set('grafico', id);
      return params;
    }, { replace: true });
  };

  const plot = useMemo(() => {
    if (!grafico) return null;
    if (grafico.type === 'plotly') {
      const cfg = grafico.config as { data?: unknown; layout?: unknown };
      return sanitizePlotlyConfig(cfg.data, cfg.layout);
    }
    const cfg = grafico.config as unknown as FunctionCfg;
    return {
      data: buildPlotlyFromFunctions(cfg, colors.series),
      layout: {
        xaxis: { title: cfg.xLabel ?? 'x', range: cfg.xDomain },
        yaxis: { title: cfg.yLabel ?? 'y', range: cfg.yDomain },
      },
    };
  }, [grafico, colors.series]);

  if (!grafico) {
    return <p className="empty-note">Nessun grafico disponibile.</p>;
  }

  const legend = plot ? legendItems(plot.data, colors.series) : undefined;

  // Book layouts are authored for a white page: keep the author's ranges and labels,
  // take colours, size and legend placement from the reader. The panel shows the title.
  const authorLayout = asObject(plot?.layout);
  const axis = (value: unknown) => ({
    ...asObject(value),
    // Plotly 3 dropped `title: "Ore"`; books still write it, so wrap it as `{ text }`.
    ...axisTitle(asObject(value).title, colors),
    gridcolor: colors.grid,
    linecolor: colors.axis,
    zerolinecolor: colors.axis,
    tickfont: { family: colors.font, size: 11, color: colors.tick },
    automargin: true,
  });
  const { title: _title, width: _width, height: _height, ...layoutRest } = authorLayout;
  const layout = {
    ...layoutRest,
    colorway: colors.series,
    paper_bgcolor: colors.surface,
    plot_bgcolor: colors.surface,
    font: { family: colors.font, size: 11, color: colors.tick },
    xaxis: axis(authorLayout.xaxis),
    yaxis: axis(authorLayout.yaxis),
    // The panel draws the legend under the plot: Plotly's own squeezes the plot when labels are long.
    showlegend: legend ? false : authorLayout.showlegend,
    legend: { ...asObject(authorLayout.legend), bgcolor: 'rgba(0,0,0,0)' },
    autosize: true,
    margin: { l: 48, r: 16, t: 16, b: 24 },
  };

  return (
    <div className="grafici-view sb-page">
      <SectionHeader
        title="Grafici e calcoli"
        actions={
          <button type="button" className="sb-btn sb-btn-secondary sb-btn-sm" aria-pressed={showTools} onClick={() => setShowTools((v) => !v)}>
            {showTools ? 'Nascondi strumenti' : 'Strumenti grafico'}
          </button>
        }
      />

      <div className={grafici.length > 1 ? 'grafici-layout' : undefined}>
        {grafici.length > 1 && compact && (
          <label className="grafici-select no-print">
            <span className="sb-eyebrow">Grafico {index + 1} di {grafici.length}</span>
            <select value={grafico.id} onChange={(e) => select(e.target.value)}>
              {grafici.map((g, i) => (
                <option key={g.id} value={g.id}>
                  {i + 1}. {g.title}
                </option>
              ))}
            </select>
          </label>
        )}
        {grafici.length > 1 && !compact && (
          <nav className="grafici-index no-print" aria-label="Elenco grafici">
            <span className="sb-eyebrow">Grafici · {grafici.length}</span>
            <ol>
              {grafici.map((g, i) => (
                <li key={g.id}>
                  <button type="button" aria-current={g.id === grafico.id ? 'true' : undefined} onClick={() => select(g.id)}>
                    <span className="grafici-index-num">{i + 1}</span>
                    <span>{g.title}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="grafici-main">
          <GraphPanel
            title={grafico.title}
            eyebrow={grafici.length > 1 && !compact ? `Grafico ${index + 1} di ${grafici.length}` : undefined}
            legend={legend}
          >
            {plot ? (
              <Plot
                key={grafico.id}
                data={plot.data}
                layout={layout}
                useResizeHandler
                style={{ width: '100%', height: compact ? '320px' : '420px' }}
                config={{ displayModeBar: showTools, responsive: true, displaylogo: false }}
              />
            ) : (
              <p className="empty-note">Questo grafico non può essere visualizzato.</p>
            )}
          </GraphPanel>

          {grafici.length > 1 && (
            <nav className="grafici-pager no-print" aria-label="Grafico precedente e successivo">
              {prev ? (
                <button type="button" className="grafici-pager-btn" onClick={() => select(prev.id)}>
                  <ChevronLeft size={16} strokeWidth={1.75} aria-hidden />
                  <span>
                    <span className="sb-eyebrow">Precedente</span>
                    <span className="grafici-pager-title">{prev.title}</span>
                  </span>
                </button>
              ) : <span />}
              {next && (
                <button type="button" className="grafici-pager-btn grafici-pager-btn--next" onClick={() => select(next.id)}>
                  <span>
                    <span className="sb-eyebrow">Successivo</span>
                    <span className="grafici-pager-title">{next.title}</span>
                  </span>
                  <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
                </button>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

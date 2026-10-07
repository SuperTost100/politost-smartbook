import { useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import type { GraficoConfig } from '../types/smartbook';
import { evalExprAtX } from '../lib/safeMathExpr';
import { sanitizePlotlyConfig } from '../lib/plotlySanitize';
import { useChartColors } from '../lib/useChartColors';
import { SectionHeader } from './ds/SectionHeader';
import { GraphPanel } from './ds/GraphPanel';

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

export function GraficiView({ grafici }: GraficiViewProps) {
  const [active, setActive] = useState(grafici[0]?.id ?? '');
  const [showTools, setShowTools] = useState(false);
  const colors = useChartColors();
  const grafico = grafici.find((g) => g.id === active) ?? grafici[0];

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
        xaxis: { title: cfg.xLabel ?? 't (s)', range: cfg.xDomain },
        yaxis: { title: cfg.yLabel ?? 'valore', range: cfg.yDomain },
      },
    };
  }, [grafico, colors.series]);

  if (!grafico) {
    return <p className="empty-note">Nessun grafico disponibile.</p>;
  }

  const axis = { gridcolor: colors.grid, linecolor: colors.axis, zerolinecolor: colors.axis, tickfont: { family: colors.font, size: 11, color: colors.tick } };
  const authorLayout = (plot?.layout ?? {}) as { xaxis?: object; yaxis?: object; title?: unknown };
  const legend =
    grafico.type === 'function'
      ? (grafico.config as unknown as FunctionCfg).functions.map((f) => f.label ?? f.fn)
      : undefined;

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
      <GraphPanel
        title={grafico.title}
        tabs={grafici.map((g) => ({ id: g.id, title: g.title }))}
        activeTab={grafico.id}
        onTab={setActive}
        legend={legend}
      >
        {plot ? (
          <Plot
            data={plot.data}
            layout={{
              ...plot.layout,
              // theme wins over any colours in the book's own layout
              title: typeof authorLayout.title === 'string' ? { text: authorLayout.title } : (authorLayout.title as object | undefined),
              colorway: colors.series,
              paper_bgcolor: colors.surface,
              plot_bgcolor: colors.surface,
              font: { family: colors.font, size: 11, color: colors.tick },
              xaxis: { ...authorLayout.xaxis, ...axis },
              yaxis: { ...authorLayout.yaxis, ...axis },
              autosize: true,
              margin: { l: 55, r: 20, t: 40, b: 50 },
            }}
            useResizeHandler
            style={{ width: '100%', height: '420px' }}
            config={{ displayModeBar: showTools, responsive: true }}
          />
        ) : (
          <p className="empty-note">Nessun grafico disponibile.</p>
        )}
      </GraphPanel>
    </div>
  );
}

import { useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import type { GraficoConfig } from '../types/smartbook';
import { evalExprAtX } from '../lib/safeMathExpr';

interface GraficiViewProps {
  grafici: GraficoConfig[];
}

function buildPlotlyFromFunctions(cfg: {
  functions: { fn: string; label?: string }[];
  xDomain: [number, number];
  yDomain?: [number, number];
  xLabel?: string;
  yLabel?: string;
}) {
  const [xMin, xMax] = cfg.xDomain;
  const steps = 200;
  const xs = Array.from({ length: steps }, (_, i) => xMin + (i / (steps - 1)) * (xMax - xMin));

  return cfg.functions.map((f) => ({
    type: 'scatter' as const,
    mode: 'lines' as const,
    name: f.label ?? f.fn,
    x: xs,
    y: xs.map((x) => evalExprAtX(f.fn, x)),
  }));
}

export function GraficiView({ grafici }: GraficiViewProps) {
  const [active, setActive] = useState(grafici[0]?.id ?? '');
  const [showTools, setShowTools] = useState(false);
  const grafico = grafici.find((g) => g.id === active) ?? grafici[0];

  const plotlyData = useMemo(() => {
    if (!grafico) return null;
    if (grafico.type === 'plotly') {
      return (grafico.config as { data: object[] }).data;
    }
    const cfg = grafico.config as {
      functions: { fn: string; label?: string }[];
      xDomain: [number, number];
      yDomain?: [number, number];
      xLabel?: string;
      yLabel?: string;
    };
    return buildPlotlyFromFunctions(cfg);
  }, [grafico]);

  const plotlyLayout = useMemo(() => {
    if (!grafico) return {};
    if (grafico.type === 'plotly') {
      return (grafico.config as { layout?: object }).layout ?? {};
    }
    const cfg = grafico.config as {
      xDomain: [number, number];
      yDomain?: [number, number];
      xLabel?: string;
      yLabel?: string;
    };
    return {
      title: grafico.title,
      xaxis: { title: cfg.xLabel ?? 't (s)', range: cfg.xDomain },
      yaxis: { title: cfg.yLabel ?? 'valore', range: cfg.yDomain },
    };
  }, [grafico]);

  if (!grafico || !plotlyData) {
    return <p className="empty-note">Nessun grafico disponibile.</p>;
  }

  return (
    <div className="grafici-view">
      <div className="view-toolbar">
        <h2>Grafici & Calcoli</h2>
        <button
          type="button"
          className="btn-print no-print"
          onClick={() => setShowTools((v) => !v)}
        >
          {showTools ? 'Nascondi strumenti' : 'Strumenti grafico'}
        </button>
      </div>

      <div className="grafici-tabs no-print">
        {grafici.map((g) => (
          <button
            key={g.id}
            type="button"
            className={g.id === active ? 'active' : ''}
            onClick={() => setActive(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      <div className="grafico-container">
        <h3>{grafico.title}</h3>
        <Plot
          data={plotlyData}
          layout={{
            ...plotlyLayout,
            autosize: true,
            margin: { l: 55, r: 20, t: 50, b: 50 },
          }}
          useResizeHandler
          style={{ width: '100%', height: '420px' }}
          config={{ displayModeBar: showTools, responsive: true }}
        />
        {grafico.type === 'function' && (
          <p className="grafico-legend no-print">
            Grafico generato dalle funzioni definite nel contenuto dello smartbook.
          </p>
        )}
      </div>
    </div>
  );
}

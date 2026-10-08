import type { ReactNode } from 'react';

export interface LegendItem {
  label: string;
  color: string;
  dashed?: boolean;
}

interface GraphPanelProps {
  title: string;
  /** Small line above the title, e.g. "Grafico 2 di 9". */
  eyebrow?: string;
  /** The plot (Plotly). */
  children: ReactNode;
  /** Series under the plot, in mono, each with its line sample. */
  legend?: LegendItem[];
}

/** A plot with its title and legend. The page around it switches graphs. */
export function GraphPanel({ title, eyebrow, children, legend }: GraphPanelProps) {
  return (
    <section className="sb-graph" aria-label={title}>
      <header className="sb-graph-head">
        {eyebrow && <span className="sb-eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </header>
      <div className="sb-graph-plot">{children}</div>
      {legend && legend.length > 0 && (
        <div className="sb-graph-legend">
          {legend.map((item, i) => (
            <span key={item.label + i}>
              <i style={{ borderTopColor: item.color, borderTopStyle: item.dashed ? 'dashed' : 'solid' }} aria-hidden />
              <code>{item.label}</code>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

import type { ReactNode } from 'react';
import { Segmented } from 'antd';

interface GraphPanelProps {
  title: string;
  tabs?: { id: string; title: string }[];
  activeTab?: string;
  onTab?: (id: string) => void;
  /** The plot (Plotly). */
  children: ReactNode;
  /** Function expressions shown in the legend, in mono; the second is drawn dashed. */
  legend?: string[];
}

/** A plot with its title, graph switcher and legend. */
export function GraphPanel({ title, tabs, activeTab, onTab, children, legend }: GraphPanelProps) {
  return (
    <section className="sb-graph" aria-label={title}>
      <header className="sb-graph-head">
        <h2>{title}</h2>
        {tabs && tabs.length > 1 && (
          <Segmented
            shape="round"
            size="small"
            className="sb-graph-tabs no-print"
            aria-label="Grafici disponibili"
            value={activeTab}
            onChange={(v) => onTab?.(String(v))}
            options={tabs.map((t) => ({ value: t.id, label: t.title }))}
          />
        )}
      </header>
      <div className="sb-graph-plot">{children}</div>
      {legend && legend.length > 0 && (
        <div className="sb-graph-legend">
          {legend.map((expr, i) => (
            <span key={expr + i}>
              <i className={i === 1 ? 's2' : i === 2 ? 's3' : undefined} aria-hidden />
              <code>{expr}</code>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

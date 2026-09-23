const TRACE_TYPES = new Set(['scatter', 'bar', 'scattergl', 'histogram', 'pie', 'box']);

const ALLOWED_KEYS = new Set([
  'type', 'mode', 'name', 'x', 'y', 'text', 'textposition', 'textfont', 'marker',
  'hovertemplate', 'hoverinfo', 'orientation', 'opacity',
  'title', 'xaxis', 'yaxis', 'shapes', 'annotations', 'showlegend',
  'plot_bgcolor', 'paper_bgcolor', 'margin', 'height', 'width', 'autosize', 'legend',
  'font', 'size', 'color', 'family', 'style', 'range', 'tickfont', 'tickvals', 'ticktext',
  'gridcolor', 'dtick', 'x0', 'x1', 'y0', 'y1', 'fillcolor', 'line', 'width', 'symbol',
  'showarrow', 'l', 'r', 't', 'b',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isPlainData(value: unknown): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }
  if (Array.isArray(value)) return value.every(isPlainData);
  if (!isPlainObject(value)) return false;
  return Object.values(value).every(isPlainData);
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '');
}

function sanitizeNode(value: unknown): unknown {
  if (typeof value === 'string') return stripHtml(value);
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  if (Array.isArray(value)) {
    return value.filter(isPlainData).map(sanitizeNode);
  }
  if (!isPlainObject(value)) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (!ALLOWED_KEYS.has(key) || !isPlainData(child)) continue;
    out[key] = sanitizeNode(child);
  }
  return out;
}

export function sanitizePlotlyConfig(
  data: unknown,
  layout: unknown,
): { data: object[]; layout: Record<string, unknown> } | null {
  if (!Array.isArray(data) || data.length === 0) return null;
  const traces: object[] = [];
  for (const trace of data) {
    if (!isPlainObject(trace)) return null;
    const type = typeof trace.type === 'string' ? trace.type : 'scatter';
    if (!TRACE_TYPES.has(type)) return null;
    const cleaned = sanitizeNode({ ...trace, type });
    if (!isPlainObject(cleaned)) return null;
    traces.push(cleaned);
  }
  if (layout == null) return { data: traces, layout: {} };
  if (!isPlainData(layout)) return null;
  const cleanedLayout = sanitizeNode(layout);
  if (!isPlainObject(cleanedLayout)) return null;
  return { data: traces, layout: cleanedLayout };
}

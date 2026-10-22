import type { WorkerMessage } from '../workers/pythonWorker';
import type { MatlabWorkerMessage } from '../workers/matlabWorker';
import type { LabFigure } from './matlabPlots';

export interface RunResult {
  stdout: string;
  stderr: string;
  error?: string;
  /** Figures as base64 PNG: matplotlib's in Python, MATLAB plots drawn with Plotly. */
  figures?: string[];
}

/** Called while the lab downloads packages the script imports, e.g. ['numpy', 'matplotlib']. */
export type OnLoadingPackages = (packages: string[]) => void;

const RUN_TIMEOUT_MS = 10_000;

/** One worker per language, thrown away with every run queued on it when a script gets stuck. */
interface Lane {
  create: () => Worker;
  /** First run downloads the runtime: give a slow connection time before calling it stuck. */
  loadTimeoutMs: number;
  loadError: string;
  worker: Worker | null;
  /** Runs waiting on the current worker; each settles with the given error if the worker is thrown away. */
  pending: Set<(error: string) => void>;
}

const python: Lane = {
  create: () => new Worker(new URL('../workers/pythonWorker.ts', import.meta.url), { type: 'module' }),
  // Pyodide is several MB, and matplotlib adds about 12 MB.
  loadTimeoutMs: 90_000,
  loadError: 'Python non si è avviato. Controlla la connessione e riprova.',
  worker: null,
  pending: new Set(),
};

const matlab: Lane = {
  create: () => new Worker(new URL('../workers/matlabWorker.ts', import.meta.url), { type: 'module' }),
  loadTimeoutMs: 60_000,
  loadError: 'MATLAB non si è avviato. Controlla la connessione e riprova.',
  worker: null,
  pending: new Set(),
};

function discard(lane: Lane, error: string) {
  lane.worker?.terminate();
  lane.worker = null;
  const runs = [...lane.pending];
  lane.pending.clear();
  for (const settle of runs) settle(error);
}

const STOPPED = 'Esecuzione interrotta.';

/** Stops the running script, e.g. when the student switches to another one. */
export function stopRuns(): void {
  for (const lane of [python, matlab]) if (lane.pending.size > 0) discard(lane, STOPPED);
}

/** Releases the lab runtimes, including idle workers and their loaded packages. */
export function disposeRuns(): void {
  for (const lane of [python, matlab]) discard(lane, STOPPED);
}

type Done<M> = Extract<M, { type: 'done' }>;

function run<M extends { id: string; type: string }>(
  lane: Lane,
  code: string,
  aborted: (error: string) => Done<M>,
  onMessage?: (msg: M) => void,
): Promise<Done<M>> {
  if (!lane.worker) lane.worker = lane.create();
  const worker = lane.worker;
  const id = crypto.randomUUID();

  return new Promise((resolve) => {
    let timer = 0;
    const settle = (result: Done<M>) => {
      window.clearTimeout(timer);
      worker.removeEventListener('message', listener);
      lane.pending.delete(abort);
      resolve(result);
    };
    const abort = (error: string) => settle(aborted(error));
    timer = window.setTimeout(() => discard(lane, lane.loadError), lane.loadTimeoutMs);

    function listener(event: MessageEvent<M>) {
      const msg = event.data;
      if (msg.id !== id) return;
      if (msg.type === 'started') {
        window.clearTimeout(timer);
        timer = window.setTimeout(
          () => discard(lane, `Tempo scaduto: lo script girava da più di ${RUN_TIMEOUT_MS / 1000} s ed è stato interrotto.`),
          RUN_TIMEOUT_MS,
        );
        return;
      }
      if (msg.type === 'done') settle(msg as Done<M>);
      else onMessage?.(msg);
    }

    lane.pending.add(abort);
    worker.addEventListener('message', listener);
    worker.postMessage({ id, code });
  });
}

export async function runPython(code: string, onLoadingPackages?: OnLoadingPackages): Promise<RunResult> {
  const msg = await run<WorkerMessage>(
    python,
    code,
    (error) => ({ id: '', type: 'done', stdout: '', stderr: '', error, figures: [] }),
    (m) => { if (m.type === 'loading') onLoadingPackages?.(m.packages); },
  );
  return { stdout: msg.stdout, stderr: msg.stderr, error: msg.error, figures: msg.figures };
}

export async function runMatlab(code: string): Promise<RunResult> {
  const msg = await run<MatlabWorkerMessage>(matlab, code, (error) => ({ id: '', type: 'done', stdout: '', stderr: '', error, plots: [] }));
  const result: RunResult = { stdout: msg.stdout, stderr: msg.stderr, error: msg.error };
  if (msg.plots.length > 0) {
    try {
      result.figures = await renderPng(msg.plots);
    } catch (e) {
      result.stderr = [result.stderr, `Errore nel disegnare la figura: ${e instanceof Error ? e.message : String(e)}`].filter(Boolean).join('\n');
    }
  }
  return result;
}

/** Draws MATLAB figures with the reader's Plotly build, as PNG like the Python lab's figures. */
async function renderPng(plots: LabFigure[]): Promise<string[]> {
  const { default: Plotly } = await import('plotly.js/dist/plotly-cartesian.min.js');
  const pngs: string[] = [];
  for (const p of plots) {
    const url: string = await Plotly.toImage(
      { data: p.data, layout: { ...p.layout, width: p.width, height: p.height }, config: { staticPlot: true } },
      { format: 'png', width: p.width, height: p.height, scale: 2 },
    );
    pngs.push(url.replace(/^data:image\/png;base64,/, ''));
  }
  return pngs;
}

export async function runCode(language: string, code: string, onLoadingPackages?: OnLoadingPackages): Promise<RunResult> {
  const lang = language.toLowerCase();
  if (lang === 'python' || lang === 'py') return runPython(code, onLoadingPackages);
  if (lang === 'matlab' || lang === 'octave' || lang === 'm') return runMatlab(code);
  return {
    stdout: '',
    stderr: '',
    error: `Linguaggio "${language}" non supportato. Usa python o matlab.`,
  };
}

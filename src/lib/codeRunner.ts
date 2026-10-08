import { runMatlab } from './matlabRunner';
import type { WorkerMessage } from '../workers/pythonWorker';

export interface RunResult {
  stdout: string;
  stderr: string;
  error?: string;
  /** matplotlib figures as base64 PNG. */
  figures?: string[];
}

/** Called while the lab downloads packages the script imports, e.g. ['numpy', 'matplotlib']. */
export type OnLoadingPackages = (packages: string[]) => void;

const PYTHON_TIMEOUT_MS = 10_000;
/** First run downloads Pyodide (several MB), and matplotlib adds about 12 MB: give a slow connection time. */
const PYTHON_LOAD_TIMEOUT_MS = 90_000;

let pythonWorker: Worker | null = null;
/** Runs waiting on the current worker; each settles with the given error if the worker is thrown away. */
const pendingRuns = new Set<(error: string) => void>();

function getPythonWorker(): Worker {
  if (!pythonWorker) {
    pythonWorker = new Worker(new URL('../workers/pythonWorker.ts', import.meta.url), {
      type: 'module',
    });
  }
  return pythonWorker;
}

/** A stuck script keeps the worker busy forever, so it is thrown away along with every run queued on it. */
function discardPythonWorker(error: string) {
  pythonWorker?.terminate();
  pythonWorker = null;
  const runs = [...pendingRuns];
  pendingRuns.clear();
  for (const settle of runs) settle(error);
}

/** Stops the running script, e.g. when the student switches to another one. */
export function stopPython(): void {
  if (pendingRuns.size > 0) discardPythonWorker('Esecuzione interrotta.');
}

export async function runPython(code: string, onLoadingPackages?: OnLoadingPackages): Promise<RunResult> {
  const worker = getPythonWorker();
  const id = crypto.randomUUID();

  return new Promise((resolve) => {
    let timer = 0;
    const settle = (result: RunResult) => {
      window.clearTimeout(timer);
      worker.removeEventListener('message', onMessage);
      pendingRuns.delete(abort);
      resolve(result);
    };
    const abort = (error: string) => settle({ stdout: '', stderr: '', error });
    timer = window.setTimeout(
      () => discardPythonWorker('Python non si è avviato. Controlla la connessione e riprova.'),
      PYTHON_LOAD_TIMEOUT_MS,
    );

    function onMessage(event: MessageEvent<WorkerMessage>) {
      const msg = event.data;
      if (msg.id !== id) return;
      if (msg.type === 'loading') {
        onLoadingPackages?.(msg.packages);
        return;
      }
      if (msg.type === 'started') {
        window.clearTimeout(timer);
        timer = window.setTimeout(
          () => discardPythonWorker(`Tempo scaduto: lo script girava da più di ${PYTHON_TIMEOUT_MS / 1000} s ed è stato interrotto.`),
          PYTHON_TIMEOUT_MS,
        );
        return;
      }
      settle({ stdout: msg.stdout, stderr: msg.stderr, error: msg.error, figures: msg.figures });
    }

    pendingRuns.add(abort);
    worker.addEventListener('message', onMessage);
    worker.postMessage({ id, code });
  });
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

import { runMatlab } from './matlabRunner';
import type { WorkerMessage } from '../workers/pythonWorker';

export interface RunResult {
  stdout: string;
  stderr: string;
  error?: string;
}

const PYTHON_TIMEOUT_MS = 10_000;
/** First run downloads Pyodide (several MB); give a slow connection time before giving up. */
const PYTHON_LOAD_TIMEOUT_MS = 90_000;

let pythonWorker: Worker | null = null;

function getPythonWorker(): Worker {
  if (!pythonWorker) {
    pythonWorker = new Worker(new URL('../workers/pythonWorker.ts', import.meta.url), {
      type: 'module',
    });
  }
  return pythonWorker;
}

/** A stuck script keeps the worker busy forever, so a timeout throws the worker away. */
function discardPythonWorker(worker: Worker) {
  worker.terminate();
  if (pythonWorker === worker) pythonWorker = null;
}

export async function runPython(code: string): Promise<RunResult> {
  const worker = getPythonWorker();
  const id = crypto.randomUUID();

  return new Promise((resolve) => {
    const fail = (error: string) => {
      worker.removeEventListener('message', onMessage);
      discardPythonWorker(worker);
      resolve({ stdout: '', stderr: '', error });
    };
    let timer = window.setTimeout(
      () => fail('Python non si è avviato. Controlla la connessione e riprova.'),
      PYTHON_LOAD_TIMEOUT_MS,
    );

    function onMessage(event: MessageEvent<WorkerMessage>) {
      const msg = event.data;
      if (msg.id !== id) return;
      window.clearTimeout(timer);
      if (msg.type === 'started') {
        timer = window.setTimeout(
          () => fail(`Tempo scaduto: lo script girava da più di ${PYTHON_TIMEOUT_MS / 1000} s ed è stato interrotto.`),
          PYTHON_TIMEOUT_MS,
        );
        return;
      }
      worker.removeEventListener('message', onMessage);
      resolve({ stdout: msg.stdout, stderr: msg.stderr, error: msg.error });
    }

    worker.addEventListener('message', onMessage);
    worker.postMessage({ id, code });
  });
}

export async function runCode(language: string, code: string): Promise<RunResult> {
  const lang = language.toLowerCase();
  if (lang === 'python' || lang === 'py') return runPython(code);
  if (lang === 'matlab' || lang === 'octave' || lang === 'm') return runMatlab(code);
  return {
    stdout: '',
    stderr: '',
    error: `Linguaggio "${language}" non supportato. Usa python o matlab.`,
  };
}

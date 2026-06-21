import { runMatlab } from './matlabRunner';

export interface RunResult {
  stdout: string;
  stderr: string;
  error?: string;
}

const PYTHON_TIMEOUT_MS = 10_000;

let pythonWorker: Worker | null = null;

function getPythonWorker(): Worker {
  if (!pythonWorker) {
    pythonWorker = new Worker(new URL('../workers/pythonWorker.ts', import.meta.url), {
      type: 'module',
    });
  }
  return pythonWorker;
}

export async function runPython(code: string): Promise<RunResult> {
  const worker = getPythonWorker();
  const id = crypto.randomUUID();

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      worker.removeEventListener('message', onMessage);
      resolve({
        stdout: '',
        stderr: '',
        error: 'Timeout: esecuzione superata (10s)',
      });
    }, PYTHON_TIMEOUT_MS);

    function onMessage(event: MessageEvent<{ id: string; stdout: string; stderr: string; error?: string }>) {
      if (event.data.id !== id) return;
      window.clearTimeout(timer);
      worker.removeEventListener('message', onMessage);
      resolve({
        stdout: event.data.stdout,
        stderr: event.data.stderr,
        error: event.data.error,
      });
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

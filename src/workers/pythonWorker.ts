/// <reference lib="webworker" />

type PyodideInterface = {
  runPythonAsync: (code: string) => Promise<unknown>;
};

let pyodideReady: Promise<PyodideInterface> | null = null;

async function getPyodide(): Promise<PyodideInterface> {
  if (!pyodideReady) {
    pyodideReady = (async () => {
      const { loadPyodide } = await import(
        /* @vite-ignore */ new URL('/pyodide/pyodide.mjs', self.location.origin).href
      ) as { loadPyodide: (opts: { indexURL: string }) => Promise<PyodideInterface> };
      return loadPyodide({ indexURL: '/pyodide/' });
    })();
  }
  return pyodideReady;
}

export interface WorkerRunResult {
  stdout: string;
  stderr: string;
  error?: string;
}

self.onmessage = async (event: MessageEvent<{ id: string; code: string }>) => {
  const { id, code } = event.data;
  try {
    const pyodide = await getPyodide();
    const wrapped = `
import sys
from io import StringIO
_stdout = StringIO()
_stderr = StringIO()
_old_out, _old_err = sys.stdout, sys.stderr
sys.stdout, sys.stderr = _stdout, _stderr
_err = None
try:
${code.split('\n').map((l) => (l.trim() ? `    ${l}` : '')).join('\n')}
except Exception as e:
    _err = e
finally:
    sys.stdout, sys.stderr = _old_out, _old_err

{'stdout': _stdout.getvalue(), 'stderr': _stderr.getvalue(), 'error': str(_err) if _err else ''}
`;
    const result = await pyodide.runPythonAsync(wrapped) as {
      get: (k: string) => string;
    };
    const payload: WorkerRunResult = {
      stdout: result.get('stdout') ?? '',
      stderr: result.get('stderr') ?? '',
      error: result.get('error') || undefined,
    };
    self.postMessage({ id, ...payload });
  } catch (e) {
    self.postMessage({
      id,
      stdout: '',
      stderr: '',
      error: e instanceof Error ? e.message : String(e),
    });
  }
};

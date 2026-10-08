/// <reference lib="webworker" />

type PyProxy = {
  destroy?: () => void;
  toJs: () => unknown;
};

type PyCallable = PyProxy & ((code: string) => Promise<PyProxy>);

type PyodideInterface = {
  runPython: (code: string, options?: { globals?: PyProxy }) => unknown;
  globals: { get: (name: string) => PyProxy & (() => PyProxy & { get: (key: string) => PyCallable }) };
};

/**
 * Runs the student's code as written (no re-indenting, so string literals stay intact),
 * in a fresh namespace per run, and returns a traceback that starts at their code.
 */
const RUNNER = `
import ast, inspect, io, linecache, traceback
from contextlib import redirect_stderr, redirect_stdout

FILENAME = "<laboratorio>"

async def run(src):
    out, err = io.StringIO(), io.StringIO()
    linecache.cache[FILENAME] = (len(src), None, src.splitlines(True), FILENAME)
    error = ""
    with redirect_stdout(out), redirect_stderr(err):
        try:
            code = compile(src, FILENAME, "exec", flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
            result = eval(code, {"__name__": "__main__"})
            if inspect.iscoroutine(result):
                await result
        except BaseException as exc:
            tb = exc.__traceback__
            error = "".join(traceback.format_exception(type(exc), exc, tb.tb_next if tb else None))
    return out.getvalue(), err.getvalue(), error
`;

let runnerReady: Promise<PyCallable> | null = null;

function getRunner(): Promise<PyCallable> {
  if (!runnerReady) {
    runnerReady = (async () => {
      const { loadPyodide } = await import(
        /* @vite-ignore */ new URL('/pyodide/pyodide.mjs', self.location.origin).href
      ) as { loadPyodide: (opts: { indexURL: string }) => Promise<PyodideInterface> };
      const pyodide = await loadPyodide({ indexURL: '/pyodide/' });
      const scope = pyodide.globals.get('dict')();
      pyodide.runPython(RUNNER, { globals: scope });
      return scope.get('run');
    })();
    runnerReady.catch(() => {
      runnerReady = null;
    });
  }
  return runnerReady;
}

export type WorkerMessage =
  | { id: string; type: 'started' }
  | { id: string; type: 'done'; stdout: string; stderr: string; error?: string };

function post(message: WorkerMessage) {
  self.postMessage(message);
}

self.onmessage = async (event: MessageEvent<{ id: string; code: string }>) => {
  const { id, code } = event.data;
  try {
    const run = await getRunner();
    // The page starts its timeout here, so a slow Pyodide download does not count.
    post({ id, type: 'started' });
    const result = await run(code);
    const [stdout, stderr, error] = result.toJs() as [string, string, string];
    result.destroy?.();
    post({ id, type: 'done', stdout, stderr, error: error || undefined });
  } catch (e) {
    post({ id, type: 'done', stdout: '', stderr: '', error: e instanceof Error ? e.message : String(e) });
  }
};

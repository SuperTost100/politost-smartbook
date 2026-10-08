/// <reference lib="webworker" />

type PyProxy = {
  destroy?: () => void;
  toJs: () => unknown;
};

type PyCallable = PyProxy & ((...args: unknown[]) => PyProxy | Promise<PyProxy>);

type PyodideInterface = {
  runPython: (code: string, options?: { globals?: PyProxy }) => unknown;
  runPythonAsync: (code: string) => Promise<unknown>;
  loadPackage: (names: string[], options?: { messageCallback?: (msg: string) => void; errorCallback?: (msg: string) => void }) => Promise<unknown>;
  globals: { get: (name: string) => PyProxy & (() => PyProxy & { get: (key: string) => PyCallable }) };
};

/** Modules the lab can import beyond the standard library, and the Pyodide package that provides each. */
const LAB_MODULES: Record<string, string> = {
  numpy: 'numpy',
  matplotlib: 'matplotlib',
  mpl_toolkits: 'matplotlib',
  pylab: 'matplotlib',
};

/**
 * Runs the student's code as written (no re-indenting, so string literals stay intact),
 * in a fresh namespace per run, and returns a traceback that starts at their code.
 */
const RUNNER = `
import ast, base64, inspect, io, linecache, os, sys, traceback, warnings
from contextlib import redirect_stderr, redirect_stdout

FILENAME = "<laboratorio>"
MAX_FIGURES = 10

# A worker has no canvas: figures render to PNG, and plt.show() has nothing to do.
os.environ["MPLBACKEND"] = "agg"
warnings.filterwarnings("ignore", message=".*non-interactive.*")

def imports(src):
    from pyodide.code import find_imports
    try:
        return find_imports(src)
    except SyntaxError:
        return []

def figures():
    plt = sys.modules.get("matplotlib.pyplot")
    if plt is None:
        return [], ""
    pngs, error = [], ""
    try:
        for num in plt.get_fignums()[:MAX_FIGURES]:
            buf = io.BytesIO()
            plt.figure(num).savefig(buf, format="png", dpi=110, bbox_inches="tight")
            pngs.append(base64.b64encode(buf.getvalue()).decode("ascii"))
    except Exception as exc:
        error = "Errore nel disegnare la figura: " + "".join(traceback.format_exception_only(type(exc), exc))
    finally:
        plt.close("all")
    return pngs, error

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
    pngs, figure_error = figures()
    return out.getvalue(), err.getvalue(), error or figure_error, pngs
`;

interface Runner {
  pyodide: PyodideInterface;
  run: PyCallable;
  imports: PyCallable;
  loaded: Set<string>;
}

let runnerReady: Promise<Runner> | null = null;

function getRunner(): Promise<Runner> {
  if (!runnerReady) {
    runnerReady = (async () => {
      const { loadPyodide } = await import(
        /* @vite-ignore */ new URL('/pyodide/pyodide.mjs', self.location.origin).href
      ) as { loadPyodide: (opts: { indexURL: string }) => Promise<PyodideInterface> };
      const pyodide = await loadPyodide({ indexURL: '/pyodide/' });
      const scope = pyodide.globals.get('dict')();
      pyodide.runPython(RUNNER, { globals: scope });
      return { pyodide, run: scope.get('run'), imports: scope.get('imports'), loaded: new Set<string>() };
    })();
    runnerReady.catch(() => {
      runnerReady = null;
    });
  }
  return runnerReady;
}

/** The lab packages the script imports that this worker has not loaded yet. */
function missingPackages(runner: Runner, code: string): string[] {
  const found = runner.imports(code) as PyProxy;
  const modules = found.toJs() as string[];
  found.destroy?.();
  const packages = new Set(modules.map((m) => LAB_MODULES[m]));
  return ['numpy', 'matplotlib'].filter((p) => packages.has(p) && !runner.loaded.has(p));
}

/**
 * Downloads the packages and imports them once, so the first import (matplotlib builds
 * its font cache) does not count against the script's time limit.
 */
async function loadPackages(runner: Runner, packages: string[]): Promise<string | undefined> {
  const errors: string[] = [];
  await runner.pyodide.loadPackage(packages, { messageCallback: () => undefined, errorCallback: (msg) => errors.push(msg) });
  if (errors.length > 0) {
    return `Non riesco a caricare ${packages.join(' e ')}: questa installazione del reader potrebbe non includerli.\n${errors.join('\n')}`;
  }
  await runner.pyodide.runPythonAsync(packages.includes('matplotlib') ? 'import numpy, matplotlib.pyplot' : 'import numpy');
  // matplotlib brings numpy with it.
  for (const p of [...packages, 'numpy']) runner.loaded.add(p);
  return undefined;
}

export type WorkerMessage =
  | { id: string; type: 'loading'; packages: string[] }
  | { id: string; type: 'started' }
  | { id: string; type: 'done'; stdout: string; stderr: string; error?: string; figures: string[] };

function post(message: WorkerMessage) {
  self.postMessage(message);
}

async function handle({ id, code }: { id: string; code: string }) {
  try {
    const runner = await getRunner();
    const packages = missingPackages(runner, code);
    if (packages.length > 0) {
      post({ id, type: 'loading', packages });
      const error = await loadPackages(runner, packages);
      if (error) {
        post({ id, type: 'done', stdout: '', stderr: '', error, figures: [] });
        return;
      }
    }
    // The page starts its timeout here, so a slow download does not count.
    post({ id, type: 'started' });
    const result = await runner.run(code);
    const [stdout, stderr, error, figures] = result.toJs() as [string, string, string, string[]];
    result.destroy?.();
    post({ id, type: 'done', stdout, stderr, error: error || undefined, figures });
  } catch (e) {
    post({ id, type: 'done', stdout: '', stderr: '', error: e instanceof Error ? e.message : String(e), figures: [] });
  }
}

// One run at a time: a run waiting on a package download must not overlap the next one,
// or share its redirected output and pyplot figures.
let queue = Promise.resolve();
self.onmessage = (event: MessageEvent<{ id: string; code: string }>) => {
  queue = queue.then(() => handle(event.data));
};

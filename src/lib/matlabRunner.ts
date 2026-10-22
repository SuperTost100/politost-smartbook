import { executeCode } from 'numbl';
import { MATLAB_SHIMS } from './matlabShims';
import { plotsFromInstructions, type LabFigure } from './matlabPlots';

export interface MatlabResult {
  stdout: string;
  stderr: string;
  error?: string;
  /** Figures drawn by plot commands, as Plotly figures. */
  plots: LabFigure[];
}

const MAIN_FILE = 'laboratorio.m';

/**
 * Runs a MATLAB script with numbl, a MATLAB-compatible interpreter, in the calling thread.
 * The reader calls it from a worker, which is thrown away if the script never ends.
 * The interpreter runs without its JIT, which compiles with `new Function` and would need 'unsafe-eval' in the CSP.
 */
export function executeMatlab(code: string): MatlabResult {
  let stdout = '';
  let stderr = '';
  let error: string | undefined;
  let instructions: Parameters<typeof plotsFromInstructions>[0] = [];
  try {
    const result = executeCode(
      code,
      {
        onOutput: (text) => { stdout += text; },
        onDrawnow: (plots) => { instructions = instructions.concat(plots); },
        displayResults: true,
        optimization: '0',
        implicitCwdPath: null,
      },
      MATLAB_SHIMS,
      MAIN_FILE,
    );
    instructions = instructions.concat(result.plotInstructions);
  } catch (e) {
    error = describeError(e);
  }
  const { figures, unsupported } = plotsFromInstructions(instructions);
  if (unsupported.length > 0) {
    stderr = `Il laboratorio disegna solo grafici 2D: ${unsupported.join(', ')} non viene mostrato.`;
  }
  return { stdout: stdout.trimEnd(), stderr, error, plots: figures };
}

function describeError(e: unknown): string {
  if (!(e instanceof Error)) return `Errore: ${String(e)}`;
  // numbl runs eval'd text through its JIT, which needs `new Function`, and the CSP refuses that.
  if (e.name === 'EvalError' || /code generation from strings|unsafe-eval/i.test(e.message)) {
    return 'Errore: eval con cicli non è disponibile nel laboratorio. Scrivi il codice direttamente nello script.';
  }
  const { line, file } = e as Error & { line?: number; file?: string };
  const where = typeof line === 'number'
    ? file && file !== MAIN_FILE ? ` (in ${file.replace(/\.m$/, '')}, riga ${line})` : ` alla riga ${line}`
    : '';
  const kind = e.name === 'SyntaxError' ? 'Errore di sintassi' : 'Errore';
  return `${kind}${where}: ${e.message}`;
}

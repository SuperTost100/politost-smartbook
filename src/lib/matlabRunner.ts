import type { RunResult } from './codeRunner';
import { evalScopedArithmeticJs } from './safeMathExpr';

/** Nomi di funzione note che NON vanno trattate come moltiplicazione implicita */
const KNOWN_FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
  'sinh', 'cosh', 'tanh',
  'sqrt', 'abs', 'log', 'log2', 'log10', 'exp',
  'ceil', 'floor', 'round', 'mod', 'rem',
  'max', 'min', 'sign',
  'fprintf', 'disp', 'sprintf', 'printf',
]);

/** Converte espressioni MATLAB/Octave in JavaScript valutabile */
function matlabExprToJs(expr: string): string {
  let js = expr.trim().replace(/;$/g, '');

  // Potenza: ^ → **
  js = js.replace(/\^/g, '**');

  // Moltiplicazione implicita: 2x → 2*x (digit seguito da lettera)
  js = js.replace(/(\d)([a-zA-Z_])/g, '$1*$2');

  // Moltiplicazione implicita: x( → x*( ma NON per funzioni note
  js = js.replace(/([a-zA-Z_]\w*)\s*(\()/g, (_, name, paren) => {
    if (KNOWN_FUNCTIONS.has(name)) return `${name}${paren}`;
    // Se è un nome di variabile nello scope, trattalo come moltiplicazione
    return `${name}*${paren}`;
  });

  // Moltiplicazione implicita: )x → )*x o )( → )*(
  js = js.replace(/\)([a-zA-Z_0-9(])/g, ')*$1');

  // Array literals: [1, 2; 3, 4] → [1,2,3,4]
  js = js.replace(/\[([^\]]+)\]/g, (_, inner) => {
    const vals = inner.split(/[,;\s]+/).filter(Boolean).map((v: string) => matlabExprToJs(v));
    return `[${vals.join(',')}]`;
  });

  // Mappatura funzioni MATLAB → Math.xxx
  js = js.replace(/\bsin\b/g, 'Math.sin');
  js = js.replace(/\bcos\b/g, 'Math.cos');
  js = js.replace(/\btan\b/g, 'Math.tan');
  js = js.replace(/\basin\b/g, 'Math.asin');
  js = js.replace(/\bacos\b/g, 'Math.acos');
  js = js.replace(/\batan\b/g, 'Math.atan');
  js = js.replace(/\batan2\b/g, 'Math.atan2');
  js = js.replace(/\bsinh\b/g, 'Math.sinh');
  js = js.replace(/\bcosh\b/g, 'Math.cosh');
  js = js.replace(/\btanh\b/g, 'Math.tanh');
  js = js.replace(/\bsqrt\b/g, 'Math.sqrt');
  js = js.replace(/\babs\b/g, 'Math.abs');
  js = js.replace(/\blog\b/g, 'Math.log');
  js = js.replace(/\blog2\b/g, 'Math.log2');
  js = js.replace(/\blog10\b/g, 'Math.log10');
  js = js.replace(/\bexp\b/g, 'Math.exp');
  js = js.replace(/\bceil\b/g, 'Math.ceil');
  js = js.replace(/\bfloor\b/g, 'Math.floor');
  js = js.replace(/\bround\b/g, 'Math.round');
  js = js.replace(/\bmax\b/g, 'Math.max');
  js = js.replace(/\bmin\b/g, 'Math.min');
  js = js.replace(/\bsign\b/g, 'Math.sign');
  js = js.replace(/\bpi\b/g, 'Math.PI');
  js = js.replace(/\bInf\b/g, 'Infinity');

  return js;
}

function formatPrintf(fmt: string, values: number[]): string {
  let vi = 0;
  return fmt
    .replace(/%\.(\d+)f/g, (_, dec) => {
      const val = values[vi++] ?? 0;
      return val.toFixed(Number(dec));
    })
    .replace(/%f/g, () => String(values[vi++] ?? 0))
    .replace(/%d/g, () => String(Math.round(values[vi++] ?? 0)))
    .replace(/%s/g, () => String(values[vi++] ?? ''))
    .replace(/%e/g, () => (values[vi++] ?? 0).toExponential())
    .replace(/%g/g, () => String(values[vi++] ?? 0))
    .replace(/\\n/g, '\n');
}

/** Rimuove i commenti MATLAB (%) rispettando le stringhe quotate */
function stripMatlabComment(line: string): string {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "'" && !inDouble) { inSingle = !inSingle; continue; }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; continue; }
    if (ch === '%' && !inSingle && !inDouble) {
      return line.slice(0, i);
    }
  }
  return line;
}

/** Interprete MATLAB didattico (sottoinsieme compatibile Octave) */
export async function runMatlab(code: string): Promise<RunResult> {
  const scope: Record<string, number | number[]> = {};
  const output: string[] = [];

  const evalExpr = (expr: string): number | number[] => {
    const js = matlabExprToJs(expr);
    try {
      const result = evalScopedArithmeticJs(js, scope);
      if (typeof result === 'number' && isNaN(result)) throw new Error('Risultato NaN');
      return result;
    } catch (e) {
      throw new Error(`Espressione non valida: ${expr} → ${js} (${e instanceof Error ? e.message : e})`);
    }
  };

  const parseFprintfArgs = (argsStr: string): number[] => {
    const parts: string[] = [];
    let current = '';
    let depth = 0;
    for (const ch of argsStr) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) {
        parts.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) parts.push(current.trim());
    return parts.map((p) => {
      const v = evalExpr(p);
      return typeof v === 'number' ? v : Number(v);
    });
  };

  const lines = code
    .split('\n')
    .map((l) => stripMatlabComment(l).trim())
    .filter((l) => l.length > 0);

  try {
    for (const line of lines) {
      // fprintf('format', arg1, arg2, ...)
      const fprintfMatch = line.match(/fprintf\s*\(\s*['"]([^'"]*)['"]\s*(?:,\s*(.+))?\)\s*;?$/);
      if (fprintfMatch) {
        const [, fmt, argsStr] = fprintfMatch;
        const values = argsStr ? parseFprintfArgs(argsStr) : [];
        output.push(formatPrintf(fmt, values));
        continue;
      }

      // disp('stringa')
      const dispStrMatch = line.match(/disp\s*\(\s*['"]([^'"]*)['"]\s*\)\s*;?$/);
      if (dispStrMatch) {
        output.push(dispStrMatch[1]);
        continue;
      }

      // disp(espressione)
      const dispMatch = line.match(/disp\s*\(\s*(.+)\s*\)\s*;?$/);
      if (dispMatch) {
        const val = evalExpr(dispMatch[1]);
        if (Array.isArray(val)) output.push(val.map(String).join('  '));
        else output.push(String(val));
        continue;
      }

      // assegnamento: variabile = espressione
      const assignMatch = line.match(/^([a-zA-Z_]\w*)\s*=\s*(.+?)\s*;?$/);
      if (assignMatch) {
        scope[assignMatch[1]] = evalExpr(assignMatch[2]);
        continue;
      }

      // Espressione semplice senza assegnamento (ignora silenziosamente se termina con ;)
      if (line.endsWith(';')) {
        try { evalExpr(line.replace(/;$/, '')); } catch { /* ignora */ }
        continue;
      }

      throw new Error(`Riga non supportata: ${line}`);
    }

    return { stdout: output.join('\n'), stderr: '' };
  } catch (e) {
    return {
      stdout: output.join('\n'),
      stderr: '',
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

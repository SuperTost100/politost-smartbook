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

type MatlabValue = number | number[] | string;

/** One pass over the format, so arguments are consumed left to right. */
function formatPrintf(fmt: string, values: MatlabValue[]): string {
  let vi = 0;
  const next = () => values[vi++];
  const num = (v: MatlabValue | undefined) => (typeof v === 'number' ? v : Number(v ?? 0));
  return fmt
    .replace(/%(?:\.(\d+))?([fdseg%])/g, (_, dec: string | undefined, conv: string) => {
      if (conv === '%') return '%';
      const v = next();
      switch (conv) {
        case 'f': return dec !== undefined ? num(v).toFixed(Number(dec)) : num(v).toFixed(6);
        case 'd': return String(Math.round(num(v)));
        case 'e': return num(v).toExponential(dec !== undefined ? Number(dec) : 6);
        case 'g': return String(num(v));
        default: return v === undefined ? '' : String(v);
      }
    })
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t');
}

/** 'text' or "text" → the text; anything else → null */
function stringLiteral(expr: string): string | null {
  const m = expr.trim().match(/^'((?:[^']|'')*)'$|^"((?:[^"]|"")*)"$/);
  if (!m) return null;
  return m[1] !== undefined ? m[1].replace(/''/g, "'") : m[2].replace(/""/g, '"');
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
  const strings: Record<string, string> = {};
  let stdout = '';
  const printLine = (text: string) => {
    stdout += `${text}\n`;
  };

  const evalExpr = (expr: string): number | number[] => {
    const js = matlabExprToJs(expr);
    try {
      const result = evalScopedArithmeticJs(js, scope);
      if (typeof result === 'number' && isNaN(result)) throw new Error('Risultato NaN');
      return result;
    } catch (e) {
      throw new Error(`Espressione non valida: ${expr} → ${js} (${e instanceof Error ? e.message : e})`, { cause: e });
    }
  };

  /** A string literal, a string variable, sprintf(...) or a numeric expression. */
  const evalValue = (expr: string): MatlabValue => {
    const literal = stringLiteral(expr);
    if (literal !== null) return literal;
    const name = expr.trim();
    if (name in strings) return strings[name];
    const sprintfMatch = name.match(/^sprintf\s*\(([\s\S]*)\)$/);
    if (sprintfMatch) return formatCall(sprintfMatch[1]);
    return evalExpr(expr);
  };

  const formatCall = (argsStr: string): string => {
    const [fmtExpr, ...rest] = splitArgs(argsStr);
    const fmt = stringLiteral(fmtExpr ?? '');
    if (fmt === null) throw new Error(`Il formato deve essere una stringa: ${fmtExpr}`);
    return formatPrintf(fmt, rest.map(evalValue));
  };

  function splitArgs(argsStr: string): string[] {
    const parts: string[] = [];
    let current = '';
    let depth = 0;
    let quote: string | null = null;
    for (const ch of argsStr) {
      if (quote) {
        if (ch === quote) quote = null;
        current += ch;
        continue;
      }
      if (ch === "'" || ch === '"') quote = ch;
      if (ch === '(' || ch === '[') depth++;
      if (ch === ')' || ch === ']') depth--;
      if (ch === ',' && depth === 0) {
        parts.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
  }

  const lines = code
    .split('\n')
    .map((l) => stripMatlabComment(l).trim())
    .filter((l) => l.length > 0);

  try {
    for (const line of lines) {
      // fprintf('format', arg1, arg2, ...) — no implicit newline, as in MATLAB
      const fprintfMatch = line.match(/^fprintf\s*\(([\s\S]*)\)\s*;?$/);
      if (fprintfMatch) {
        stdout += formatCall(fprintfMatch[1]);
        continue;
      }

      // disp(valore)
      const dispMatch = line.match(/^disp\s*\(\s*(.+)\s*\)\s*;?$/);
      if (dispMatch) {
        const val = evalValue(dispMatch[1]);
        printLine(Array.isArray(val) ? val.map(String).join('  ') : String(val));
        continue;
      }

      // assegnamento: variabile = espressione o stringa
      const assignMatch = line.match(/^([a-zA-Z_]\w*)\s*=\s*(.+?)\s*;?$/);
      if (assignMatch) {
        const [, name, expr] = assignMatch;
        const val = evalValue(expr);
        if (typeof val === 'string') {
          strings[name] = val;
          delete scope[name];
        } else {
          scope[name] = val;
          delete strings[name];
        }
        if (!line.endsWith(';')) printLine(`${name} = ${Array.isArray(val) ? val.join('  ') : val}`);
        continue;
      }

      // Espressione semplice senza assegnamento (ignora silenziosamente se termina con ;)
      if (line.endsWith(';')) {
        try { evalExpr(line.replace(/;$/, '')); } catch { /* ignora */ }
        continue;
      }

      throw new Error(`Riga non supportata: ${line}`);
    }

    return { stdout: stdout.replace(/\n$/, ''), stderr: '' };
  } catch (e) {
    return {
      stdout: stdout.replace(/\n$/, ''),
      stderr: '',
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

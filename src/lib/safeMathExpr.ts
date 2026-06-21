/** Evaluate simple math expressions in x without arbitrary JS execution. */

const EXPR_CHARS = /^[0-9x+\-*/().^ \t]+$/;
const NUMERIC_JS = /^[\d+\-*/(). \t]+$/;

export function evalExprAtX(expr: string, x: number): number {
  const trimmed = expr.trim();
  if (!trimmed || !EXPR_CHARS.test(trimmed)) return NaN;

  const js = trimmed.replace(/\^/g, '**').replace(/\bx\b/g, `(${x})`);
  if (!NUMERIC_JS.test(js)) return NaN;

  try {
    const result = Function(`"use strict"; return (${js});`)() as number;
    return typeof result === 'number' && Number.isFinite(result) ? result : NaN;
  } catch {
    return NaN;
  }
}

const FORBIDDEN_JS = /[;{}\[\]`$\\@#&|=<>!?:'"]/;
const FORBIDDEN_WORDS =
  /\b(function|return|new|this|window|global|import|eval|constructor|prototype|process)\b/i;

/** Guard transpiled MATLAB-like JS before scoped evaluation. */
export function assertSafeArithmeticJs(js: string): void {
  if (js.length > 500) throw new Error('Espressione troppo lunga');
  if (FORBIDDEN_JS.test(js)) throw new Error('Caratteri non consentiti');
  if (FORBIDDEN_WORDS.test(js)) throw new Error('Espressione non consentita');
}

export function evalScopedArithmeticJs(
  js: string,
  scope: Record<string, number | number[]>,
): number | number[] {
  assertSafeArithmeticJs(js);
  const keys = Object.keys(scope);
  const vals = keys.map((k) => scope[k]);
  const fn = new Function(...keys, `"use strict"; return (${js});`);
  return fn(...vals) as number | number[];
}

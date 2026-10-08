import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evalExprAtX, assertSafeArithmeticJs, evalScopedArithmeticJs } from './safeMathExpr.ts';

test('evalExprAtX evaluates polynomials', () => {
  assert.equal(evalExprAtX('x^2', 3), 9);
  assert.equal(evalExprAtX('2*x + 1', 4), 9);
});

test('evalExprAtX accepts the math functions and constants graphs use', () => {
  assert.equal(evalExprAtX('sin(x)', Math.PI / 2), 1);
  assert.equal(evalExprAtX('Math.cos(x)', 0), 1);
  assert.equal(evalExprAtX('exp(-x) * sqrt(4)', 0), 2);
  assert.equal(evalExprAtX('2*pi*x', 1), 2 * Math.PI);
  assert.equal(evalExprAtX('e^x', 1), Math.E);
  assert.equal(evalExprAtX('max(x, 2)', 5), 5);
  assert.equal(evalExprAtX('1.5e2 + x', 1), 151);
});

test('evalExprAtX rejects unsafe expressions', () => {
  assert.ok(Number.isNaN(evalExprAtX('alert(1)', 1)));
  assert.ok(Number.isNaN(evalExprAtX('constructor', 1)));
  assert.ok(Number.isNaN(evalExprAtX('sin.constructor', 1)));
  assert.ok(Number.isNaN(evalExprAtX('toString(x)', 1)));
  assert.ok(Number.isNaN(evalExprAtX('y + 1', 1)));
  assert.ok(Number.isNaN(evalExprAtX('sin', 1)));
});

test('MATLAB arithmetic still needs the Math. prefix', () => {
  assert.throws(() => evalScopedArithmeticJs('sin(0)', {}));
});

test('assertSafeArithmeticJs blocks injection', () => {
  assert.throws(() => assertSafeArithmeticJs('1; process.exit()'));
  assert.throws(() => assertSafeArithmeticJs('this.constructor'));
});

test('evalScopedArithmeticJs accepts arithmetic and rejects alert(1)', () => {
  assert.equal(evalScopedArithmeticJs('2+2', {}), 4);
  assert.equal(evalScopedArithmeticJs('Math.sin(0)', {}), 0);
  assert.throws(() => evalScopedArithmeticJs('alert(1)', {}));
});

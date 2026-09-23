import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evalExprAtX, assertSafeArithmeticJs, evalScopedArithmeticJs } from './safeMathExpr.ts';

test('evalExprAtX evaluates polynomials', () => {
  assert.equal(evalExprAtX('x^2', 3), 9);
  assert.equal(evalExprAtX('2*x + 1', 4), 9);
});

test('evalExprAtX rejects unsafe expressions', () => {
  assert.ok(Number.isNaN(evalExprAtX('alert(1)', 1)));
  assert.ok(Number.isNaN(evalExprAtX('constructor', 1)));
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

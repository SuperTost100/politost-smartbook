import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evalExprAtX, assertSafeArithmeticJs } from './safeMathExpr.ts';

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

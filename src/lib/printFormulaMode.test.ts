import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decideFormulaMode,
  MEASUREMENT_VERSION,
  readFormulaModePrefs,
  rememberFormulaChoice,
  rememberLayoutSpeed,
  SLOW_LAYOUT_MS,
} from './printFormulaMode.ts';

const fast = { mode: 'fast', source: 'device' };
const best = { mode: 'best', source: 'device' };

test('decideFormulaMode picks fast print above the threshold and the book formulas up to it', () => {
  assert.deepEqual(decideFormulaMode({ chosen: null, layoutMs: SLOW_LAYOUT_MS + 0.1 }), fast);
  assert.deepEqual(decideFormulaMode({ chosen: null, layoutMs: SLOW_LAYOUT_MS }), best);
  assert.deepEqual(decideFormulaMode({ chosen: null, layoutMs: 1, cores: 8, memoryGb: 8 }), best);
});

test('decideFormulaMode follows the calibration in docs/Print.md', () => {
  // 2x slowdown: 46.7 ms, Fisica 1 in Migliore in 45 s. 4x: 91.9 ms, 92 s.
  assert.deepEqual(decideFormulaMode({ chosen: null, layoutMs: 46.7, cores: 8, memoryGb: 8 }), best);
  assert.deepEqual(decideFormulaMode({ chosen: null, layoutMs: 91.9, cores: 8, memoryGb: 8 }), fast);
});

test('decideFormulaMode asks for a measurement when nothing else decides', () => {
  assert.equal(decideFormulaMode({ chosen: null, layoutMs: null }), null);
  assert.equal(decideFormulaMode({ chosen: null, layoutMs: null, cores: 8, memoryGb: 8 }), null);
});

test('decideFormulaMode takes few cores or little memory as a slow device without measuring', () => {
  assert.deepEqual(decideFormulaMode({ chosen: null, layoutMs: null, cores: 2 }), fast);
  assert.deepEqual(decideFormulaMode({ chosen: null, layoutMs: 1, memoryGb: 2 }), fast);
  // Zero means the browser hides the value.
  assert.equal(decideFormulaMode({ chosen: null, layoutMs: null, cores: 0, memoryGb: 0 }), null);
});

test('a choice made by hand wins over the measurement and the hardware', () => {
  assert.deepEqual(decideFormulaMode({ chosen: 'best', layoutMs: 500, cores: 1, memoryGb: 1 }), { mode: 'best', source: 'chosen' });
  assert.deepEqual(decideFormulaMode({ chosen: 'fast', layoutMs: 1, cores: 16 }), { mode: 'fast', source: 'chosen' });
});

function memoryStore() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), data };
}

test('the choice and the measurement are remembered together', () => {
  const store = memoryStore();
  assert.deepEqual(readFormulaModePrefs(store), { chosen: null, layoutMs: null });
  rememberLayoutSpeed(42.5, store);
  rememberFormulaChoice('best', store);
  assert.deepEqual(readFormulaModePrefs(store), { chosen: 'best', layoutMs: 42.5 });
  rememberFormulaChoice('fast', store);
  assert.deepEqual(readFormulaModePrefs(store), { chosen: 'fast', layoutMs: 42.5 });
});

test('a measurement from another version of the benchmark or a broken value is measured again', () => {
  const store = memoryStore();
  store.setItem('politost-print-formulas', JSON.stringify({ chosen: 'fast', layoutMs: 12, version: MEASUREMENT_VERSION - 1 }));
  assert.deepEqual(readFormulaModePrefs(store), { chosen: 'fast', layoutMs: null });
  store.setItem('politost-print-formulas', '{not json');
  assert.deepEqual(readFormulaModePrefs(store), { chosen: null, layoutMs: null });
  store.setItem('politost-print-formulas', JSON.stringify({ chosen: 'veloce', layoutMs: -1, version: MEASUREMENT_VERSION }));
  assert.deepEqual(readFormulaModePrefs(store), { chosen: null, layoutMs: null });
});

test('storage that throws neither breaks reading nor writing', () => {
  const broken = {
    getItem: () => {
      throw new Error('denied');
    },
    setItem: () => {
      throw new Error('denied');
    },
  };
  assert.deepEqual(readFormulaModePrefs(broken), { chosen: null, layoutMs: null });
  assert.doesNotThrow(() => rememberFormulaChoice('fast', broken));
  assert.deepEqual(readFormulaModePrefs(null), { chosen: null, layoutMs: null });
});

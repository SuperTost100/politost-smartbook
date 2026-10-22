import { test } from 'node:test';
import assert from 'node:assert/strict';
import { disposeRuns, runMatlab, runPython, stopRuns } from './codeRunner.ts';

test('disposing the lab releases an idle Python worker and the next run starts fresh', async (t) => {
  class FakeWorker extends EventTarget {
    static instances: FakeWorker[] = [];
    terminated = false;
    constructor() { super(); FakeWorker.instances.push(this); }
    terminate() { this.terminated = true; }
    postMessage({ id }: { id: string }) {
      queueMicrotask(() => this.dispatchEvent(new MessageEvent('message', {
        data: { type: 'done', id, stdout: 'done', stderr: '' },
      })));
    }
  }
  for (const [key, value] of [['Worker', FakeWorker], ['window', globalThis]] as const) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, key, previous);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
  try {
    assert.equal((await runPython('print(1)')).stdout, 'done');
    const first = FakeWorker.instances[0];
    assert.equal(first.terminated, false);
    disposeRuns();
    assert.equal(first.terminated, true);
    assert.equal((await runPython('print(2)')).stdout, 'done');
    assert.equal(FakeWorker.instances.length, 2);
    assert.equal(FakeWorker.instances[1].terminated, false);
  } finally {
    disposeRuns();
  }
});

test('stopping a MATLAB script that never ends settles the run and throws its worker away', async (t) => {
  class StuckWorker extends EventTarget {
    static instances: StuckWorker[] = [];
    terminated = false;
    constructor() { super(); StuckWorker.instances.push(this); }
    terminate() { this.terminated = true; }
    postMessage({ id }: { id: string }) {
      queueMicrotask(() => this.dispatchEvent(new MessageEvent('message', { data: { type: 'started', id } })));
    }
  }
  for (const [key, value] of [['Worker', StuckWorker], ['window', globalThis]] as const) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, key, previous);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
  try {
    const pending = runMatlab('while true\nend');
    await new Promise((r) => setTimeout(r, 0));
    stopRuns();
    assert.equal((await pending).error, 'Esecuzione interrotta.');
    assert.equal(StuckWorker.instances[0].terminated, true);
  } finally {
    disposeRuns();
  }
});

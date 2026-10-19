import { test } from 'node:test';
import assert from 'node:assert/strict';
import { disposePython, runPython } from './codeRunner.ts';

test('disposing an idle Python worker releases it and the next run starts fresh', async (t) => {
  class FakeWorker extends EventTarget {
    static instances: FakeWorker[] = [];
    terminated = false;
    constructor() { super(); FakeWorker.instances.push(this); }
    terminate() { this.terminated = true; }
    postMessage({ id }: { id: string }) {
      queueMicrotask(() => this.dispatchEvent(new MessageEvent('message', {
        data: { type: 'result', id, stdout: 'done', stderr: '' },
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
    disposePython();
    assert.equal(first.terminated, true);
    assert.equal((await runPython('print(2)')).stdout, 'done');
    assert.equal(FakeWorker.instances.length, 2);
    assert.equal(FakeWorker.instances[1].terminated, false);
  } finally {
    disposePython();
  }
});

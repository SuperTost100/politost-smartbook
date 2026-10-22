/// <reference lib="webworker" />
import { executeMatlab, type MatlabResult } from '../lib/matlabRunner';

export type MatlabWorkerMessage =
  | { id: string; type: 'started' }
  | ({ id: string; type: 'done' } & MatlabResult);

function post(message: MatlabWorkerMessage) {
  self.postMessage(message);
}

// numbl is loaded with this module, so the first message arrives once the interpreter is ready.
self.onmessage = (event: MessageEvent<{ id: string; code: string }>) => {
  const { id, code } = event.data;
  // The page starts its timeout here: a slow first download does not count.
  post({ id, type: 'started' });
  post({ id, type: 'done', ...executeMatlab(code) });
};

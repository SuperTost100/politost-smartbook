import assert from 'node:assert/strict';
import { it } from 'node:test';
import { appendGoogleScript, startAnalytics } from './googleServices.ts';

it('queues native Google Arguments commands and loads the CMP without CORS', () => {
  const globals = ['window', 'document', 'location', 'HTMLScriptElement'];
  const saved = new Map(globals.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  class Script { id = ''; async = false; src = ''; crossOrigin: string | null = null; referrerPolicy = ''; }
  const elements: Script[] = [];
  const dataLayer: unknown[] = [];
  const replacements = {
    window: { dataLayer }, location: { origin: 'https://reader.test' }, HTMLScriptElement: Script,
    document: { getElementById: (id: string) => elements.find((element) => element.id === id) ?? null,
      createElement: () => new Script(), head: { appendChild: (element: Script) => elements.push(element) } },
  };
  try {
    for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { configurable: true, value });
    startAnalytics('G-READERTEST', '/reader/');
    for (const command of dataLayer) assert.equal(Object.prototype.toString.call(command), '[object Arguments]');
    const commands = dataLayer.map((command) => Array.from(command as IArguments));
    assert.equal(commands[0][0], 'consent');
    assert.equal(commands[2][0], 'config');
    const script = appendGoogleScript('cmp', 'https://fundingchoicesmessages.google.com/i/pub-1234567890123456?ers=1');
    assert.equal(script.crossOrigin, null);
  } finally {
    for (const key of globals) {
      const descriptor = saved.get(key);
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});

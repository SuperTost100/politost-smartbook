import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runMatlab } from './matlabRunner.ts';

test('the built-in MATLAB greeting runs', async () => {
  const r = await runMatlab("nome = 'Studente';\nfprintf('Ciao, %s!\\n', nome);\nfprintf('Benvenuto nel laboratorio.\\n');");
  assert.equal(r.error, undefined);
  assert.equal(r.stdout, 'Ciao, Studente!\nBenvenuto nel laboratorio.');
});

test('fprintf has no implicit newline; disp has one', async () => {
  const r = await runMatlab("fprintf('a');\nfprintf('b\\n');\ndisp('c')\ndisp(2+3)");
  assert.equal(r.stdout, 'ab\nc\n5');
});

test('numeric formats consume arguments in order', async () => {
  const r = await runMatlab("r = 2;\nfprintf('r = %d, area = %.2f, %s\\n', r, pi*r^2, 'ok');");
  assert.equal(r.stdout, 'r = 2, area = 12.57, ok');
});

test('sprintf builds a string variable', async () => {
  const r = await runMatlab("s = sprintf('%d + %d', 1, 2);\ndisp(s)");
  assert.equal(r.stdout, '1 + 2');
});

test('an assignment without semicolon echoes, as in MATLAB', async () => {
  const r = await runMatlab('x = 3*4');
  assert.equal(r.stdout, 'x = 12');
});

test('unsupported lines report an error', async () => {
  const r = await runMatlab('for i = 1:3');
  assert.ok(r.error);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executeMatlab } from './matlabRunner.ts';

test('the built-in MATLAB greeting runs', () => {
  const r = executeMatlab("nome = 'Studente';\nfprintf('Ciao, %s!\\n', nome);\nfprintf('Benvenuto nel laboratorio.\\n');");
  assert.equal(r.error, undefined);
  assert.equal(r.stdout, 'Ciao, Studente!\nBenvenuto nel laboratorio.');
});

test('fprintf has no implicit newline; disp has one', () => {
  const r = executeMatlab("fprintf('a');\nfprintf('b\\n');\ndisp('c')\ndisp(2+3)");
  assert.equal(r.stdout, 'ab\nc\n5');
});

test('an assignment without semicolon echoes its value', () => {
  assert.equal(executeMatlab('x = 3*4').stdout, 'x =\n12');
  assert.equal(executeMatlab('x = 3*4;').stdout, '');
});

test('loops, conditions and a local function run, as a course script needs', () => {
  const r = executeMatlab([
    's = 0;',
    'for k = 1:10',
    '  s = s + k^2;',
    'end',
    'r = bisezione(@(x) x.^2 - 2, 0, 2, 1e-10);',
    "if s == 385, fprintf('%d %.8f\\n', s, r); end",
    'function r = bisezione(f, a, b, tol)',
    '  while (b - a)/2 > tol',
    '    c = (a + b)/2;',
    '    if f(a)*f(c) <= 0, b = c; else, a = c; end',
    '  end',
    '  r = (a + b)/2;',
    'end',
  ].join('\n'));
  assert.equal(r.error, undefined);
  assert.equal(r.stdout, '385 1.41421356');
});

test('matrices: backslash, LU and element-wise operators', () => {
  const r = executeMatlab([
    'A = [4 -1 0; -1 4 -1; 0 -1 4]; b = [1; 2; 3];',
    'x = A\\b;',
    '[L, U, P] = lu(A);',
    "fprintf('%.6f %.1e %g\\n', x(2), norm(L*U - P*A), sum([1 2 3].^2 ./ [1 2 3]));",
  ].join('\n'));
  assert.equal(r.error, undefined);
  assert.equal(r.stdout, '0.857143 0.0e+00 6');
});

test('fzero, integral, hilb and vander come from the shims and give MATLAB\'s values', () => {
  const r = executeMatlab([
    "fprintf('%.12f\\n', fzero(@(x) cos(x) - x, 1));",
    "fprintf('%.12f\\n', fzero(@(x) x.^3 - 2*x - 5, [2 3]));",
    "fprintf('%.10f\\n', integral(@(x) exp(-x.^2), 0, 1));",
    "fprintf('%g ', hilb(2)); fprintf('| '); fprintf('%g ', vander([2 3]));",
  ].join('\n'));
  assert.equal(r.error, undefined);
  assert.equal(r.stdout, '0.739085133215\n2.094551481542\n0.7468241328\n1 0.5 0.5 0.333333 | 2 3 1 1');
});

test('fzero without a sign change reports it in Italian', () => {
  const r = executeMatlab('fzero(@(x) x^2 + 1, 0)');
  assert.match(r.error ?? '', /nessun cambio di segno/);
});

test('a runtime error names its line', () => {
  const r = executeMatlab("disp('prima')\nA = [1 2; 3 4];\nC = A * [1 2 3]");
  assert.equal(r.stdout, 'prima');
  assert.match(r.error ?? '', /^Errore alla riga 3: /);
});

test('a syntax error is reported as such', () => {
  const r = executeMatlab('x = (1 + ;');
  assert.match(r.error ?? '', /^Errore di sintassi alla riga 1/);
});

test('plots come back as Plotly figures, 3-D plots as a note', () => {
  const r = executeMatlab("x = linspace(0, 1, 5);\nplot(x, x.^2, 'r-o'); title('Parabola');\n[X, Y] = meshgrid(1:2); figure; surf(X, Y, X + Y);");
  assert.equal(r.error, undefined);
  assert.equal(r.plots.length, 1);
  assert.deepEqual((r.plots[0].layout.title as { text: string }).text, 'Parabola');
  assert.match(r.stderr, /surf/);
});

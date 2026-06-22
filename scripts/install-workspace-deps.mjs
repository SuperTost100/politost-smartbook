/** Install file:-linked packages under packages/ (npm does not hoist their deps). */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packages = path.join(root, 'packages');

execSync('npm install --omit=dev --ignore-scripts', {
  cwd: path.join(packages, 'pagedjs-politost'),
  stdio: 'inherit',
});
execSync('npm install --ignore-scripts', {
  cwd: path.join(packages, 'print-engine'),
  stdio: 'inherit',
});

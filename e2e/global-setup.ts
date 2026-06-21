import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export default async function globalSetup() {
  execSync('npm run build', { cwd: root, stdio: 'inherit' });
}

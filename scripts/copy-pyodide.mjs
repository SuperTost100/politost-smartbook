import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'pyodide');
const dest = join(root, 'public', 'pyodide');

/** Packages the lab can import, served from our origin like Pyodide itself (the CSP allows no CDN). */
const LAB_PACKAGES = ['numpy', 'matplotlib'];

// prebuild passes --strict: a production build must not ship a lab without them.
const strict = process.argv.includes('--strict');
const skip = process.env.SMARTBOOK_LAB_PACKAGES === '0';

function copyRecursive(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from)) {
    const srcPath = join(from, entry);
    const destPath = join(to, entry);
    if (statSync(srcPath).isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      cpSync(srcPath, destPath);
    }
  }
}

/** The packages and everything they depend on, from Pyodide's lock file. */
function resolvePackages(lock, names) {
  const seen = new Map();
  const queue = [...names];
  while (queue.length) {
    const name = queue.shift();
    if (seen.has(name)) continue;
    const pkg = lock.packages[name];
    if (!pkg) throw new Error(`${name} is not in pyodide-lock.json`);
    seen.set(name, pkg);
    queue.push(...pkg.depends);
  }
  return [...seen.values()];
}

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

async function download(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // Covers the body too, so a stalled download cannot hang npm ci or the build.
      const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`${url}: ${lastError instanceof Error ? lastError.message : lastError}`);
}

async function copyLabPackages(version) {
  const lock = JSON.parse(readFileSync(join(src, 'pyodide-lock.json'), 'utf8'));
  const packages = resolvePackages(lock, LAB_PACKAGES);
  const cache = join(root, 'node_modules', '.cache', 'pyodide-packages', version);
  mkdirSync(cache, { recursive: true });
  let downloaded = 0;
  let bytes = 0;
  for (const pkg of packages) {
    const cached = join(cache, pkg.file_name);
    let data = existsSync(cached) ? readFileSync(cached) : null;
    if (!data || sha256(data) !== pkg.sha256) {
      data = await download(`https://cdn.jsdelivr.net/pyodide/v${version}/full/${pkg.file_name}`);
      if (sha256(data) !== pkg.sha256) throw new Error(`${pkg.file_name}: sha256 does not match pyodide-lock.json`);
      writeFileSync(cached, data);
      downloaded += 1;
    }
    writeFileSync(join(dest, pkg.file_name), data);
    bytes += data.length;
  }
  const mb = (bytes / 1024 / 1024).toFixed(1);
  console.log(`Copied ${packages.length} lab packages (${mb} MB, ${downloaded} downloaded) to public/pyodide/`);
}

if (!existsSync(src)) {
  console.warn('pyodide package not found — run npm install first');
  process.exit(0);
}

copyRecursive(src, dest);
console.log('Copied pyodide assets to public/pyodide/');

if (skip) {
  console.warn('SMARTBOOK_LAB_PACKAGES=0: the lab will not have numpy or matplotlib.');
} else {
  const { version } = JSON.parse(readFileSync(join(src, 'package.json'), 'utf8'));
  try {
    await copyLabPackages(version);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (strict) {
      console.error(`Could not get the lab packages: ${message}\nSet SMARTBOOK_LAB_PACKAGES=0 to build without numpy and matplotlib.`);
      process.exit(1);
    }
    console.warn(`Could not get the lab packages, the lab will run without numpy and matplotlib: ${message}`);
  }
}

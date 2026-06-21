#!/usr/bin/env npx tsx
/**
 * Impacchetta una cartella smartbook in .ptsb (plain ZIP).
 * Per export cifrato usa ptsb-pack CLI Python.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseArgs } from 'node:util';
import { zipSync } from 'fflate';
import { validateBundle } from '../src/lib/validateChapter.ts';
import type { SmartbookConfig } from '../src/types/smartbook.ts';

function collectFiles(dir: string, base = dir): Record<string, Uint8Array> {
  const out: Record<string, Uint8Array> = {};
  for (const name of readdirSync(dir)) {
    if (name === 'LOADER_SNIPPET.txt') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      Object.assign(out, collectFiles(full, base));
    } else {
      const rel = relative(base, full).replace(/\\/g, '/');
      out[rel] = new Uint8Array(readFileSync(full));
    }
  }
  return out;
}

function main(): void {
  const { values } = parseArgs({
    options: {
      dir: { type: 'string', short: 'd' },
      out: { type: 'string', short: 'o' },
    },
  });

  const dir = values.dir;
  const out = values.out;
  if (!dir || !out) {
    console.error('Usage: npx tsx scripts/pack-ptsb.ts --dir src/content/esempio --out esempio.ptsb');
    process.exit(2);
  }

  const config = JSON.parse(readFileSync(join(dir, 'smartbook.json'), 'utf-8')) as SmartbookConfig;
  const files = collectFiles(dir);
  const chapterFiles: Record<string, string> = {};
  for (const [path, bytes] of Object.entries(files)) {
    if (path.startsWith('chapters/') && path.endsWith('.md')) {
      chapterFiles[path.slice('chapters/'.length)] = new TextDecoder().decode(bytes);
    }
  }
  const assets: Record<string, Uint8Array> = {};
  for (const [path, bytes] of Object.entries(files)) {
    if (path.startsWith('assets/')) assets[path] = bytes;
  }

  const validation = validateBundle(config, chapterFiles, assets, {
    eserciziRaw: files['esercizi.md'] ? new TextDecoder().decode(files['esercizi.md']) : '',
    esamiRaw: files['esami.md'] ? new TextDecoder().decode(files['esami.md']) : '',
  });
  if (!validation.valid) {
    console.error(validation.errors.join('\n'));
    process.exit(1);
  }

  const manifest = {
    formatVersion: 1,
    packageType: 'smartbook',
    encrypted: false,
    access: config.access ?? 'public',
    createdAt: new Date().toISOString(),
    producer: 'pack-ptsb.ts',
  };

  const zipEntries: Record<string, Uint8Array> = {
    'ptsb.json': new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
    ...files,
  };

  const zip = zipSync(zipEntries);
  writeFileSync(out, zip);
  console.log(`Creato ${out} (${zip.length} bytes)`);
}

main();

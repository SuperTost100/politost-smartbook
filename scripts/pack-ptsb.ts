#!/usr/bin/env npx tsx
/**
 * Impacchetta una cartella smartbook in .ptsb (plain ZIP).
 * Per export cifrato usa ptsb-pack CLI Python.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseArgs } from 'node:util';
import { packBook } from '@politost/content-core';

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

  let packed: ReturnType<typeof packBook>;
  try {
    packed = packBook(collectFiles(dir), { producer: 'pack-ptsb.ts' });
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
  for (const warning of packed.bundle.warnings) console.warn(warning);
  writeFileSync(out, packed.bytes);
  console.log(`Creato ${out} (${packed.bytes.length} bytes)`);
}

main();

/**
 * CLI validator — riusa validateChapter.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { validateChapter } from '../src/lib/validateChapter';

function main(): void {
  const { values } = parseArgs({
    options: {
      file: { type: 'string', short: 'f' },
      'chapter-number': { type: 'string', short: 'n' },
      compact: { type: 'boolean', default: false },
      output: { type: 'string', short: 'o' },
    },
  });

  const file = values.file;
  const chapterNumber = Number(values['chapter-number']);

  if (!file || !Number.isFinite(chapterNumber) || chapterNumber < 1) {
    console.error(
      'Usage: npx tsx scripts/validate-chapter.ts --file <path> --chapter-number <N> [--compact] [--output <path>]',
    );
    process.exit(2);
  }

  const raw = readFileSync(file, 'utf-8');
  const result = validateChapter(raw, chapterNumber);
  const payload = values.compact
    ? {
        valid: result.valid,
        chapterNumber: result.chapterNumber,
        paragraphCount: result.paragraphCount,
        formulaCount: result.formulaCount,
        errors: result.errors,
        warnings: result.warnings,
      }
    : result;
  const json = JSON.stringify(payload, null, values.compact ? 0 : 2);

  if (values.output) {
    writeFileSync(values.output, json, 'utf-8');
  } else {
    console.log(json);
  }
  process.exit(result.valid ? 0 : 1);
}

main();

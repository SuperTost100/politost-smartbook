import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strToU8, zipSync } from 'fflate';
import { parsePtsbFile } from './ptsb.ts';

test('uploaded future-format books retain their compatibility warning', async () => {
  const bytes = zipSync({
    'smartbook.json': strToU8(JSON.stringify({
      id: 'future-book',
      title: 'Future book',
      subject: 'Test',
      specVersion: '2.0',
      sections: {},
      chapters: [{ id: 'intro', number: 1, title: 'Intro', file: 'intro.md', printable: true }],
    })),
    'chapters/intro.md': strToU8('## p1 | Intro\n\nTesto.\n'),
  });
  const bundle = await parsePtsbFile(new File([new Uint8Array(bytes).buffer], 'future.ptsb'));
  assert.equal(bundle.config.id, 'future-book');
  assert.ok(bundle.warnings?.some((warning) => warning.includes('formato 2.0')));
  assert.ok(bundle.importedAt);
});

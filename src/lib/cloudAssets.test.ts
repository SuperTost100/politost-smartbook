import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assetMapFromChapter, resolveBookAsset } from './cloudAssets.ts';

test('cloud resolveAsset returns an API URL when the map has no entry', () => {
  const url = resolveBookAsset('assets/diagram.svg', {}, 'cloud-demo');
  assert.equal(typeof url, 'string');
  assert.match(url ?? '', /\/api\/books\/cloud-demo\/assets\/diagram\.svg$/);
  assert.equal(resolveBookAsset('assets/diagram.svg', {}, undefined), undefined);
  assert.equal(
    resolveBookAsset('assets/diagram.svg', { 'assets/diagram.svg': 'blob:local' }, 'cloud-demo'),
    'blob:local',
  );
});

test('chapter assets come from the response or from image refs', () => {
  const fromResponse = assetMapFromChapter('cloud-demo', 'no image', {
    'assets/diagram.svg': 'https://cdn.example/diagram.svg',
  });
  assert.equal(fromResponse['assets/diagram.svg'], 'https://cdn.example/diagram.svg');

  const fromMarkdown = assetMapFromChapter(
    'cloud-demo',
    ':::image{src="assets/diagram.svg" alt="Diagram"}\n:::\n',
    null,
  );
  assert.match(fromMarkdown['assets/diagram.svg'] ?? '', /diagram\.svg$/);
});

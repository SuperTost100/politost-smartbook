import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dir = new URL('../../design-system/tokens/', import.meta.url);
const tokens = JSON.parse(readFileSync(new URL('tokens.json', dir), 'utf8')) as {
  color: { tokens: { name: string; value?: Record<'light' | 'dark', string>; alias?: string }[]; covers: { name: string; cover: string; ink: string }[] };
};
const css = readFileSync(new URL('tokens.css', dir), 'utf8');

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const GROUNDS = ['bg', 'surface', 'surface-raised', 'page', 'surface-overlay'];
const PAIRS: [string, string[], number][] = [
  ['ink', [...GROUNDS, 'code-bg', 'star-soft', 'success-soft', 'info-soft', 'primary-soft', 'danger-soft'], 4.5],
  ['ink-muted', GROUNDS, 4.5],
  ['ink-subtle', GROUNDS, 4.5],
  ['primary-text', [...GROUNDS, 'primary-soft'], 4.5],
  ['on-primary', ['primary', 'primary-hover', 'primary-active'], 4.5],
  ['star-text', ['star-soft', 'page', 'surface'], 4.5],
  ['success', ['success-soft', 'page', 'surface', 'surface-raised'], 4.5],
  ['info', ['info-soft', 'page', 'surface'], 4.5],
  ['danger', ['danger-soft', 'page', 'surface'], 4.5],
  ['border-control', GROUNDS, 3],
  ['focus-ring', GROUNDS, 3],
  ['star', ['page', 'surface', 'bg'], 3],
];

describe('design tokens', () => {
  for (const mode of ['light', 'dark'] as const) {
    const value = (name: string) => {
      const t = tokens.color.tokens.find((x) => x.name === name);
      assert.ok(t?.value, `${name} has no value`);
      return t.value[mode];
    };

    it(`holds the contrast pairs in ${mode}`, () => {
      const failures: string[] = [];
      for (const [fg, grounds, need] of PAIRS) {
        for (const g of grounds) {
          const c = contrast(value(fg), value(g));
          if (c < need) failures.push(`${fg} on ${g}: ${c.toFixed(2)} < ${need}`);
        }
      }
      assert.deepEqual(failures, []);
    });
  }

  it('keeps cover text readable on every cover', () => {
    for (const c of tokens.color.covers) assert.ok(contrast(c.ink, c.cover) >= 4.5, `${c.name}: ${contrast(c.ink, c.cover).toFixed(2)}`);
  });

  it('has tokens.css generated from the current tokens.json', () => {
    for (const t of tokens.color.tokens) {
      if (t.alias) assert.ok(css.includes(`--${t.name}: var(--${t.alias});`), `${t.name} alias missing`);
      else for (const mode of ['light', 'dark'] as const) assert.ok(css.includes(`--${t.name}: ${t.value![mode]};`), `${t.name} (${mode}) is stale: run npm run tokens`);
    }
  });
});

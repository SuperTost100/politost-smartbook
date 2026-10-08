import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { forgetReadingPosition, getReadingPosition, readingPositionPath, saveReadingPosition } from './readingPosition.ts';

const data = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, String(v)),
    removeItem: (k: string) => void data.delete(k),
  },
});

const pos = { chapterId: 'nel-libro', chapterNumber: 2, chapterTitle: 'Cosa trovi nel libro', paragraphId: 'p2' };

describe('readingPosition', () => {
  beforeEach(() => data.clear());

  it('saves and reads one position per book', () => {
    saveReadingPosition('esempio', pos);
    saveReadingPosition('altro', { ...pos, chapterId: 'intro', paragraphId: undefined });
    assert.deepEqual(getReadingPosition('esempio'), pos);
    assert.equal(getReadingPosition('altro')?.chapterId, 'intro');
    assert.equal(getReadingPosition('nessuno'), undefined);
  });

  it('forgets a book', () => {
    saveReadingPosition('esempio', pos);
    forgetReadingPosition('esempio');
    assert.equal(getReadingPosition('esempio'), undefined);
  });

  it('ignores corrupt or foreign data', () => {
    data.set('politost-last-read', 'not json');
    assert.equal(getReadingPosition('esempio'), undefined);
    data.set('politost-last-read', JSON.stringify({ esempio: { chapterId: 3 }, ok: pos }));
    assert.equal(getReadingPosition('esempio'), undefined);
    assert.deepEqual(getReadingPosition('ok'), pos);
    data.set('politost-last-read', '[1,2]');
    assert.equal(getReadingPosition('0'), undefined);
  });

  it('keeps a __proto__ book id as a plain entry', () => {
    data.set('politost-last-read', '{"__proto__":{"chapterId":"x","chapterNumber":1,"chapterTitle":"X"}}');
    assert.equal(getReadingPosition('__proto__')?.chapterId, 'x');
    assert.equal(getReadingPosition('chapterId'), undefined);
  });

  it('builds the chapter path, with the paragraph as hash', () => {
    assert.equal(readingPositionPath('esempio', pos), '/libro/esempio/capitolo/nel-libro#p2');
    assert.equal(readingPositionPath('esempio', { ...pos, paragraphId: undefined }), '/libro/esempio/capitolo/nel-libro');
  });
});

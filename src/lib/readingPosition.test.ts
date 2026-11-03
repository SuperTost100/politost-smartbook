import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { forgetAllReadingPositions, forgetReadingPosition, getReadingPosition, lastReadingPosition, readingPositionPath, saveReadingPosition } from './readingPosition.ts';

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
    saveReadingPosition('esempio', pos, 1000);
    saveReadingPosition('altro', { ...pos, chapterId: 'intro', paragraphId: undefined });
    assert.deepEqual(getReadingPosition('esempio'), { ...pos, readAt: 1000 });
    assert.equal(getReadingPosition('altro')?.chapterId, 'intro');
    assert.equal(getReadingPosition('nessuno'), undefined);
  });

  it('forgets a book', () => {
    saveReadingPosition('esempio', pos);
    forgetReadingPosition('esempio');
    assert.equal(getReadingPosition('esempio'), undefined);
  });

  it('forgets every book at once', () => {
    saveReadingPosition('esempio', pos);
    saveReadingPosition('fisica-1', { ...pos, chapterId: 'cinematica' });
    forgetAllReadingPositions();
    assert.equal(lastReadingPosition(['esempio', 'fisica-1']), undefined);
    assert.equal(data.has('politost-last-read'), false);
  });

  it('ignores corrupt or foreign data', () => {
    data.set('politost-last-read', 'not json');
    assert.equal(getReadingPosition('esempio'), undefined);
    data.set('politost-last-read', JSON.stringify({ esempio: { chapterId: 3 }, ok: pos, far: { ...pos, progress: 140 } }));
    assert.equal(getReadingPosition('esempio'), undefined);
    assert.deepEqual(getReadingPosition('ok'), pos);
    assert.equal(getReadingPosition('far'), undefined);
    data.set('politost-last-read', '[1,2]');
    assert.equal(getReadingPosition('0'), undefined);
  });

  it('keeps a __proto__ book id as a plain entry', () => {
    data.set('politost-last-read', '{"__proto__":{"chapterId":"x","chapterNumber":1,"chapterTitle":"X"}}');
    assert.equal(getReadingPosition('__proto__')?.chapterId, 'x');
    assert.equal(getReadingPosition('chapterId'), undefined);
  });

  it('resumes the most recently read book, and old positions without a time count as oldest', () => {
    data.set('politost-last-read', JSON.stringify({ vecchio: pos }));
    saveReadingPosition('fisica', { ...pos, chapterId: 'cinematica' }, 2000);
    saveReadingPosition('esempio', pos, 3000);
    assert.equal(lastReadingPosition(['vecchio', 'fisica', 'esempio'])?.bookId, 'esempio');
    saveReadingPosition('fisica', { ...pos, chapterId: 'dinamica' }, 4000);
    assert.equal(lastReadingPosition(['vecchio', 'fisica', 'esempio'])?.bookId, 'fisica');
    assert.equal(lastReadingPosition(['vecchio', 'esempio'])?.bookId, 'esempio');
    assert.equal(lastReadingPosition(['vecchio'])?.bookId, 'vecchio');
    assert.equal(lastReadingPosition(['nessuno']), undefined);
  });

  it('keeps the time when nothing changed', () => {
    saveReadingPosition('esempio', pos, 1000);
    saveReadingPosition('esempio', pos, 5000);
    assert.equal(getReadingPosition('esempio')?.readAt, 1000);
  });

  it('builds the chapter path, with the paragraph as hash', () => {
    assert.equal(readingPositionPath('esempio', pos), '/libro/esempio/capitolo/nel-libro#p2');
    assert.equal(readingPositionPath('esempio', { ...pos, paragraphId: undefined }), '/libro/esempio/capitolo/nel-libro');
  });
});

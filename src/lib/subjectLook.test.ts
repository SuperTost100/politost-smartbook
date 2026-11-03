import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { subjectLook } from './subjectLook.ts';

describe('subjectLook', () => {
  it('gives known subjects their cover and drawing', () => {
    assert.deepEqual(subjectLook('Fisica'), { cover: 'terracotta', art: 'fisica' });
    assert.deepEqual(subjectLook('Analisi 1'), { cover: 'sage', art: 'analisi' });
    assert.deepEqual(subjectLook('Geometria e algebra lineare'), { cover: 'plum', art: 'geometria' });
    assert.deepEqual(subjectLook('Chimica'), { cover: 'slate', art: 'chimica' });
    assert.deepEqual(subjectLook('Esempio'), { cover: 'ochre', art: 'generic' });
  });

  it('hashes other subjects onto a stable cover that is never the example ochre', () => {
    const a = subjectLook('Economia aziendale');
    assert.deepEqual(subjectLook('Economia aziendale'), a);
    assert.equal(a.art, 'generic');
    for (const s of ['Diritto', 'Storia', 'Meccanica razionale', 'Elettrotecnica', 'Statistica', '']) {
      assert.notEqual(subjectLook(s).cover, 'ochre');
    }
  });
});

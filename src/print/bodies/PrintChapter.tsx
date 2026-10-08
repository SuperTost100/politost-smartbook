import { useMemo } from 'react';
import type { Chapter } from '../../types/smartbook';
import { buildFormulaIndex, preprocessContent } from '../../lib/parser';
import { ContentFlow } from '../../components/ContentFlow';

interface PrintChapterProps {
  chapter: Chapter;
  allChapters: Chapter[];
  resolveAsset?: (src: string) => string | undefined;
}

export function PrintChapter({ chapter, allChapters, resolveAsset }: PrintChapterProps) {
  const formulaIndex = useMemo(() => buildFormulaIndex(allChapters), [allChapters]);

  return (
    <div data-print-chapter={chapter.meta.id}>
      {chapter.paragraphs.map((para, i) => (
        <section key={para.id} className="paragraph-section">
          <h2 className="paragraph-title">
            <span className="para-num">{chapter.meta.number}.{i + 1}</span> {para.title}
          </h2>
          <div className="paragraph-body">
            <ContentFlow
              variant="print"
              content={preprocessContent(para.content)}
              formulaIndex={formulaIndex}
              resolveAsset={resolveAsset}
            />
          </div>
        </section>
      ))}
    </div>
  );
}

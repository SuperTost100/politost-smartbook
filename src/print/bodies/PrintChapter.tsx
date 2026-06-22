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
    <>
      {chapter.paragraphs.map((para) => (
        <section key={para.id} className="paragraph-section">
          <h3 className="paragraph-title">
            <span className="para-num">{para.id}</span> {para.title}
          </h3>
          <div className="paragraph-body">
            <ContentFlow
              variant="print"
              chunkPrefix={para.id}
              content={preprocessContent(para.content)}
              formulaIndex={formulaIndex}
              resolveAsset={resolveAsset}
            />
          </div>
        </section>
      ))}
    </>
  );
}

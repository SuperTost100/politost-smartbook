import { memo } from 'react';
import type { Chapter, FormulaRef } from '../../types/smartbook';
import { preprocessContent } from '../../lib/parser';
import { ContentFlow } from '../../components/ContentFlow';

interface PrintChapterProps {
  chapter: Chapter;
  formulaIndex: Map<string, FormulaRef>;
  resolveAsset?: (src: string) => string | undefined;
  /** h2 under the document title; h3 in the whole book, where the chapter title is the h2. */
  heading?: 'h2' | 'h3';
}

/** Memoized: a chapter is the largest part of the sheet, and the options panel never changes it. */
export const PrintChapter = memo(function PrintChapter({ chapter, formulaIndex, resolveAsset, heading = 'h2' }: PrintChapterProps) {
  const Heading = heading;
  return (
    <div data-print-chapter={chapter.meta.id}>
      {chapter.paragraphs.map((para, i) => (
        <section key={para.id} className="paragraph-section">
          <Heading className="paragraph-title">
            <span className="para-num">{chapter.meta.number}.{i + 1}</span> {para.title}
          </Heading>
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
});

import { useEffect, useMemo, useRef } from 'react';
import type { Chapter } from '../types/smartbook';
import { buildFormulaIndex, preprocessContent } from '../lib/parser';
import { ContentFlow } from './ContentFlow';
import { ChapterHeader } from './ds/ChapterHeader';
import { ParagraphHeading } from './ds/ParagraphHeading';
import { ChapterPager } from './ds/ChapterPager';
import { useReaderProgress } from '../context/ReaderProgressContext';
import { usePrintMode } from '../hooks/usePrintMode';
import { useRefClick } from '../hooks/useRefClick';

interface SmartbookViewProps {
  bookId: string;
  chapter: Chapter;
  allChapters: Chapter[];
  resolveAsset?: (src: string) => string | undefined;
}

/** ~200 words per minute, rounded up, at least one minute. */
function readingMinutes(chapter: Chapter): number {
  const words = chapter.paragraphs.reduce((n, p) => n + p.content.split(/\s+/).filter(Boolean).length, 0);
  return Math.max(1, Math.ceil(words / 200));
}

export function SmartbookView({ bookId, chapter, allChapters, resolveAsset }: SmartbookViewProps) {
  const { setParagraphs, setActiveParagraphId } = useReaderProgress();
  const paraRefs = useRef<Record<string, HTMLElement | null>>({});
  const print = usePrintMode();

  const formulaIndex = useMemo(() => buildFormulaIndex(allChapters), [allChapters]);

  useEffect(() => {
    setParagraphs(
      chapter.paragraphs.map((p, i) => ({ id: p.id, number: `${chapter.meta.number}.${i + 1}`, title: p.title })),
    );
    setActiveParagraphId(chapter.paragraphs[0]?.id);
    return () => setParagraphs([]);
  }, [chapter, setParagraphs, setActiveParagraphId]);

  useEffect(() => {
    // header (64px) + breathing room
    const topOffset = 64 + 24;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActiveParagraphId(e.target.getAttribute('data-para-id') ?? chapter.paragraphs[0]?.id ?? '');
          }
        }
      },
      { rootMargin: `-${topOffset}px 0px -60% 0px`, threshold: 0 },
    );

    chapter.paragraphs.forEach((p) => {
      const el = paraRefs.current[p.id];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [chapter, setActiveParagraphId]);

  const chapterLinks = useMemo(() => allChapters.map((c) => c.meta), [allChapters]);
  const handleRefClick = useRefClick(bookId, chapterLinks);

  const { prev, next } = useMemo(() => {
    const idx = allChapters.findIndex((c) => c.meta.id === chapter.meta.id);
    const toTarget = (c?: Chapter) =>
      c ? { number: c.meta.number, title: c.meta.title, href: `/libro/${bookId}/capitolo/${c.meta.id}` } : null;
    return { prev: idx > 0 ? toTarget(allChapters[idx - 1]) : null, next: idx >= 0 ? toTarget(allChapters[idx + 1]) : null };
  }, [allChapters, chapter.meta.id, bookId]);

  return (
    <div className="smartbook-view">
      <ChapterHeader
        number={chapter.meta.number}
        title={chapter.meta.title}
        paragraphs={chapter.paragraphs.length}
        minutes={readingMinutes(chapter)}
        onPrint={
          chapter.meta.printable
            ? () => print({ bookId, section: 'capitolo', chapterId: chapter.meta.id })
            : undefined
        }
      />

      <article className="chapter-content">
        {chapter.paragraphs.map((para, i) => (
          <section
            key={para.id}
            id={para.id}
            data-para-id={para.id}
            ref={(el) => { paraRefs.current[para.id] = el; }}
            className="paragraph-section"
          >
            <ParagraphHeading number={`${chapter.meta.number}.${i + 1}`} id={para.id}>
              {para.title}
            </ParagraphHeading>
            <div className="paragraph-body">
              <ContentFlow
                content={preprocessContent(para.content)}
                formulaIndex={formulaIndex}
                resolveAsset={resolveAsset}
                onRefClick={handleRefClick}
              />
            </div>
          </section>
        ))}
      </article>

      <ChapterPager prev={prev} next={next} />
    </div>
  );
}

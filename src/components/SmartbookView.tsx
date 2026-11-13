import { useEffect, useMemo, useRef } from 'react';
import type { Chapter } from '../types/smartbook';
import { buildFormulaIndex, preprocessContent } from '../lib/parser';
import { ContentFlow } from './ContentFlow';
import { ChapterHeader } from './ds/ChapterHeader';
import { ParagraphHeading } from './ds/ParagraphHeading';
import { ChapterPager } from './ds/ChapterPager';
import { PracticeLinks, type PracticeLink } from './ds/PracticeLinks';
import { useReaderProgress } from '../context/ReaderProgressContext';
import { useRefClick } from '../hooks/useRefClick';
import { closestIntersectingParagraph } from '../lib/activeParagraph';
import { saveReadingPosition } from '../lib/readingPosition';
import { chapterProgress } from '../lib/chapterProgress';
import { ptsbLayout } from '../../design-system/theme/ptsb-tokens';

interface SmartbookViewProps {
  bookId: string;
  chapter: Chapter;
  allChapters: Chapter[];
  resolveAsset?: (src: string) => string | undefined;
  /** Links to this chapter's exercises (and the exam questions after the last chapter), before the pager. */
  practice?: PracticeLink[];
}

/** ~200 words per minute, rounded up, at least one minute. */
function readingMinutes(chapter: Chapter): number {
  const words = chapter.paragraphs.reduce((n, p) => n + p.content.split(/\s+/).filter(Boolean).length, 0);
  return Math.max(1, Math.ceil(words / 200));
}

export function SmartbookView({ bookId, chapter, allChapters, resolveAsset, practice = [] }: SmartbookViewProps) {
  const { setParagraphs, activeParagraphId, setActiveParagraphId } = useReaderProgress();
  const paraRefs = useRef<Record<string, HTMLElement | null>>({});

  const formulaIndex = useMemo(() => buildFormulaIndex(allChapters), [allChapters]);
  // The chapter re-renders on every change of the active paragraph, so the text work runs once per chapter.
  const minutes = useMemo(() => readingMinutes(chapter), [chapter]);
  const contents = useMemo(() => chapter.paragraphs.map((p) => preprocessContent(p.content)), [chapter]);

  useEffect(() => {
    setParagraphs(
      chapter.paragraphs.map((p, i) => ({ id: p.id, number: `${chapter.meta.number}.${i + 1}`, title: p.title })),
    );
    setActiveParagraphId(chapter.paragraphs[0]?.id);
    return () => setParagraphs([]);
  }, [chapter, setParagraphs, setActiveParagraphId]);

  useEffect(() => {
    // header + breathing room. The band runs to 55% of the viewport:
    // scrolling a heading clear of the header can land it just below 40%.
    const bandTop = ptsbLayout.headerHeight + 24;
    const bandBottomCut = 45;
    const bandBottomShare = (100 - bandBottomCut) / 100;

    const intersections = new Map<Element, IntersectionObserverEntry>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) intersections.set(entry.target, entry);
          else intersections.delete(entry.target);
        }
        const closest = closestIntersectingParagraph(
          [...intersections.values()],
          bandTop,
          window.innerHeight * bandBottomShare,
        );
        if (closest) {
          setActiveParagraphId(closest.target.getAttribute('data-para-id') ?? chapter.paragraphs[0]?.id ?? '');
        }
      },
      { rootMargin: `-${bandTop}px 0px -${bandBottomCut}% 0px`, threshold: 0 },
    );

    chapter.paragraphs.forEach((p) => {
      const el = paraRefs.current[p.id];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [chapter, setActiveParagraphId]);

  // Home offers to resume here. The first paragraph counts as the top of the chapter.
  useEffect(() => {
    const index = chapter.paragraphs.findIndex((p) => p.id === activeParagraphId);
    if (index < 0) return;
    const paragraph = chapter.paragraphs[index];
    saveReadingPosition(bookId, {
      chapterId: chapter.meta.id,
      chapterNumber: chapter.meta.number,
      chapterTitle: chapter.meta.title,
      paragraphId: index > 0 ? activeParagraphId : undefined,
      paragraphNumber: index > 0 ? `${chapter.meta.number}.${index + 1}` : undefined,
      paragraphTitle: index > 0 ? paragraph.title : undefined,
      progress: chapterProgress(index, chapter.paragraphs.length),
    });
  }, [bookId, chapter, activeParagraphId]);

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
        minutes={minutes}
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
                content={contents[i]}
                formulaIndex={formulaIndex}
                resolveAsset={resolveAsset}
                onRefClick={handleRefClick}
              />
            </div>
          </section>
        ))}
      </article>

      <PracticeLinks links={practice} />
      <ChapterPager prev={prev} next={next} />
    </div>
  );
}

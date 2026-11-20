import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import type { Chapter, FormulaRef } from '../types/smartbook';
import { buildFormulaIndex, preprocessContent } from '../lib/parser';
import { ContentFlow } from './ContentFlow';
import { ChapterHeader } from './ds/ChapterHeader';
import { ParagraphHeading } from './ds/ParagraphHeading';
import { ChapterPager } from './ds/ChapterPager';
import { PracticeLinks, type PracticeLink } from './ds/PracticeLinks';
import { useReaderProgress } from '../context/ReaderProgressContext';
import { useRefClick } from '../hooks/useRefClick';
import { useSkippedAnchor } from '../hooks/useSkippedAnchor';
import { useProgressiveCount } from '../hooks/useProgressiveCount';
import { cachedContentBlocks } from '../lib/contentBlocksCache';
import { mountOrder, pieceForHash, splitContentPieces } from '../lib/contentPieces';
import { formulaHtml } from '../lib/formulaHtmlCache';
import { useMathTrusted } from '../context/MathTrustContext';
import { runWhenIdle } from '../lib/progressive';
import { closestIntersectingParagraph } from '../lib/activeParagraph';
import { saveReadingPosition } from '../lib/readingPosition';
import { pinIntoView, pinnedElement, READER_INPUT, scrollsThePage } from '../lib/scrollPin';
import { anchorAt, anchorElement, forgetScrollAnchor, readScrollAnchor, saveScrollAnchor } from '../lib/scrollAnchor';
import { chapterProgress } from '../lib/chapterProgress';
import { estimateTextHeight, HEADING_HEIGHT } from '../lib/heightEstimate';
import { ptsbLayout } from '../../design-system/theme/ptsb-tokens';

interface SmartbookViewProps {
  bookId: string;
  chapter: Chapter;
  allChapters: Chapter[];
  resolveAsset?: (src: string) => string | undefined;
  /** Links to this chapter's exercises (and the exam questions after the last chapter), before the pager. */
  practice?: PracticeLink[];
}

/** Text per piece of a paragraph, about a screen: a piece is what one task parses and shows. */
const PIECE_CHARS = 1500;
/** Text shown at once when the chapter opens, enough to fill the screen at the landing. */
const FIRST_CHARS = 3000;

/** ~200 words per minute, rounded up, at least one minute. */
function readingMinutes(chapter: Chapter): number {
  const words = chapter.paragraphs.reduce((n, p) => n + p.content.split(/\s+/).filter(Boolean).length, 0);
  return Math.max(1, Math.ceil(words / 200));
}

export function SmartbookView({ bookId, chapter, allChapters, resolveAsset, practice = [] }: SmartbookViewProps) {
  const { setParagraphs, activeParagraphId, setActiveParagraphId } = useReaderProgress();
  const { hash, key: entry } = useLocation();
  const navigationType = useNavigationType();
  const paraRefs = useRef<Record<string, HTMLElement | null>>({});

  const formulaIndex = useMemo(() => buildFormulaIndex(allChapters), [allChapters]);
  // The chapter re-renders on every change of the active paragraph, so the text work runs once per chapter.
  const minutes = useMemo(() => readingMinutes(chapter), [chapter]);
  const contents = useMemo(() => chapter.paragraphs.map((p) => preprocessContent(p.content)), [chapter]);

  // The browser skips the layout of paragraphs far from the screen (content-visibility in ds.css) and
  // gives them this height until it lays them out. It depends on the width of the text.
  const articleRef = useRef<HTMLElement>(null);
  const [columnWidth, setColumnWidth] = useState(0);
  useLayoutEffect(() => {
    const article = articleRef.current;
    if (!article) return;
    const measure = () => setColumnWidth((article.querySelector('.content-flow') ?? article).clientWidth);
    measure();
    // The observer also reports every change of height while the chapter fills in: the same width does not re-render.
    const observer = new ResizeObserver(measure);
    observer.observe(article);
    return () => observer.disconnect();
  }, []);
  useSkippedAnchor(articleRef, '.paragraph-section', chapter);
  // A long paragraph appears a piece at a time: first the pieces at the landing, then the rest of the
  // chapter in later tasks (useProgressiveCount), so the text shows quickly and the page keeps answering.
  // A piece not shown yet keeps its estimated height. The piece a link points at is always shown.
  const pieces = useMemo(() => contents.map((content) => splitContentPieces(content, PIECE_CHARS)), [contents]);
  const pieceHeights = useMemo(
    () => (columnWidth > 0 ? pieces.map((list) => list.map((piece) => estimateTextHeight(piece, columnWidth))) : null),
    [pieces, columnWidth],
  );
  const paragraphIds = useMemo(() => chapter.paragraphs.map((p) => p.id), [chapter]);
  // Back, forward or a reload returns to the text the reader left (scrollAnchor), not to a pixel offset.
  // The hash belongs to the place: a hash typed in the address of the open chapter is a new history
  // entry whose key is "default", like the tab's first entry, and it must land on its target.
  const chapterKey = `${bookId}/${chapter.meta.id}${hash}`;
  const restore = useMemo(() => {
    const anchor = navigationType === 'POP' ? readScrollAnchor(entry, chapterKey) : undefined;
    const paragraph = anchor ? paragraphIds.indexOf(anchor.paragraph) : -1;
    return anchor && paragraph >= 0 && anchor.piece < pieces[paragraph].length
      ? { anchor, piece: [paragraph, Math.max(0, anchor.piece)] as const }
      : undefined;
  }, [navigationType, entry, chapterKey, paragraphIds, pieces]);
  const [landing] = useState(() => restore?.piece ?? pieceForHash(pieces, paragraphIds, hash));
  const order = useMemo(() => mountOrder(pieces, landing), [pieces, landing]);
  const firstCount = useMemo(() => {
    let chars = 0;
    let n = 0;
    while (n < order.length && (n === 0 || chars < FIRST_CHARS)) chars += pieces[order[n][0]][order[n++][1]].length;
    return n;
  }, [order, pieces]);
  // The same trust as ContentFlow, so the entries prepared here are the ones it reads.
  const mathTrusted = useMathTrusted();
  const prepare = useCallback((index: number) => {
    const [i, j] = order[index];
    cachedContentBlocks(pieces[i][j], mathTrusted);
  }, [order, pieces, mathTrusted]);
  const shownCount = useProgressiveCount(order.length, firstCount, prepare, order);
  // Once the chapter is all on the page, the chapters before and after it are parsed while the reader
  // reads, within the caches' limits, so moving to one only has to put it on the page. The work waits
  // while the reader scrolls.
  const settled = shownCount >= order.length;
  useEffect(() => {
    if (!settled) return;
    const at = allChapters.findIndex((c) => c.meta.id === chapter.meta.id);
    const neighbours = [allChapters[at + 1], allChapters[at - 1]].filter((c): c is Chapter => Boolean(c));
    let scrolledAt = 0;
    const onScroll = () => {
      scrolledAt = performance.now();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    const stop = runWhenIdle(
      neighbours.flatMap((c) => [
        ...c.paragraphs.flatMap((p) => splitContentPieces(preprocessContent(p.content), PIECE_CHARS)).map((piece) => () => void cachedContentBlocks(piece, mathTrusted)),
        ...c.formulas.map((f) => () => void formulaHtml(f.latex, mathTrusted)),
      ]),
      () => performance.now() - scrolledAt < 1000,
    );
    return () => {
      stop();
      window.removeEventListener('scroll', onScroll);
    };
  }, [settled, allChapters, chapter, mathTrusted]);
  const shown = useMemo(() => {
    const set = new Set(order.slice(0, shownCount).map(([i, j]) => `${i}.${j}`));
    const linked = restore?.piece ?? pieceForHash(pieces, paragraphIds, hash);
    if (linked) set.add(`${linked[0]}.${linked[1]}`);
    return set;
  }, [order, shownCount, pieces, paragraphIds, hash, restore]);

  useLayoutEffect(() => {
    const article = articleRef.current;
    const target = article && restore && anchorElement(article, restore.anchor);
    // The pin ends with the entry: Forward can leave without any input that would release it.
    return target ? pinIntoView(target, 'instant', restore.anchor.top) : undefined;
  }, [restore]);

  // The block at the top of the screen, under the header, is saved for this history entry whenever the
  // reader stops scrolling, and once more when the entry is left. An entry being restored keeps its
  // saved place until the reader scrolls: passing through it with quick Back and Forward presses
  // would otherwise save wherever the restore had got to. A place with no anchor forgets the old one.
  useLayoutEffect(() => {
    const article = articleRef.current;
    if (!article) return;
    let readerMoved = !restore;
    const onInput = (event: Event) => {
      if (scrollsThePage(event)) readerMoved = true;
    };
    const save = () => {
      if (!readerMoved) return;
      const box = article.getBoundingClientRect();
      const anchor = anchorAt(article, chapterKey, box.left + box.width / 2, ptsbLayout.headerHeight + 8);
      if (anchor) saveScrollAnchor(entry, anchor);
      else forgetScrollAnchor(entry);
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(save, 150);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', save);
    for (const type of READER_INPUT) window.addEventListener(type, onInput, { capture: true, passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', save);
      for (const type of READER_INPUT) window.removeEventListener(type, onInput, true);
      save();
    };
  }, [entry, chapterKey, restore]);

  useEffect(() => {
    setParagraphs(
      chapter.paragraphs.map((p, i) => ({ id: p.id, number: `${chapter.meta.number}.${i + 1}`, title: p.title })),
    );
    setActiveParagraphId(chapter.paragraphs[0]?.id);
    return () => setParagraphs([]);
  }, [chapter, setParagraphs, setActiveParagraphId]);

  // A link to a paragraph makes it the current one, from the first render and on every later hash
  // in this chapter (in-text links, back and forward). The last paragraphs share one scroll position,
  // so the page may not move and the observer below would never hear of the change.
  useEffect(() => {
    const linked = chapter.paragraphs.find((p) => `#${p.id}` === hash);
    if (linked) setActiveParagraphId(linked.id);
  }, [chapter, hash, setActiveParagraphId]);

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
        // A landing on a paragraph holds it until the reader moves: the last paragraphs never reach
        // the band, and figures loading above shift everything while the page settles.
        const landed = pinnedElement()?.closest('[data-para-id]')?.getAttribute('data-para-id');
        if (landed && chapter.paragraphs.some((p) => p.id === landed)) {
          setActiveParagraphId(landed);
          return;
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

      <ChapterArticle
        chapter={chapter}
        pieces={pieces}
        pieceHeights={pieceHeights}
        shown={shown}
        formulaIndex={formulaIndex}
        resolveAsset={resolveAsset}
        onRefClick={handleRefClick}
        articleRef={articleRef}
        paraRefs={paraRefs}
      />

      <PracticeLinks links={practice} />
      <ChapterPager prev={prev} next={next} />
    </div>
  );
}

interface ChapterArticleProps {
  chapter: Chapter;
  pieces: string[][];
  pieceHeights: number[][] | null;
  /** The pieces on the page, as "paragraph.piece". */
  shown: Set<string>;
  formulaIndex: Map<string, FormulaRef>;
  resolveAsset?: (src: string) => string | undefined;
  onRefClick: (e: React.MouseEvent) => void;
  articleRef: RefObject<HTMLElement | null>;
  paraRefs: RefObject<Record<string, HTMLElement | null>>;
}

/**
 * The chapter's text. Memoized: the view re-renders whenever the active paragraph changes as the
 * reader scrolls, and the text stays the same, so scrolling only updates the outline.
 */
const ChapterArticle = memo(function ChapterArticle({
  chapter,
  pieces,
  pieceHeights,
  shown,
  formulaIndex,
  resolveAsset,
  onRefClick,
  articleRef,
  paraRefs,
}: ChapterArticleProps) {
  return (
    <article ref={articleRef} className="chapter-content">
      {chapter.paragraphs.map((para, i) => (
        <section
          key={para.id}
          id={para.id}
          data-para-id={para.id}
          ref={(el) => { paraRefs.current[para.id] = el; }}
          className="paragraph-section"
        >
          <div
            className="paragraph-frame"
            style={pieceHeights ? { containIntrinsicSize: `auto ${HEADING_HEIGHT + pieceHeights[i].reduce((a, b) => a + b, 0)}px` } : undefined}
          >
            <ParagraphHeading number={`${chapter.meta.number}.${i + 1}`} id={para.id}>
              {para.title}
            </ParagraphHeading>
            <div className="paragraph-body">
              {pieces[i].map((piece, j) =>
                shown.has(`${i}.${j}`) ? (
                  <ContentFlow
                    key={j}
                    content={piece}
                    formulaIndex={formulaIndex}
                    resolveAsset={resolveAsset}
                    onRefClick={onRefClick}
                    boxStyle="tinted"
                  />
                ) : (
                  <div key={j} className="paragraph-pending" style={{ height: pieceHeights?.[i][j] ?? 0 }} />
                ),
              )}
            </div>
          </div>
        </section>
      ))}
    </article>
  );
});

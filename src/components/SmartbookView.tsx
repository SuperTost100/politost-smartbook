import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Chapter } from '../types/smartbook';
import { buildFormulaIndex, preprocessContent } from '../lib/parser';
import { ContentFlow } from './ContentFlow';
import { ParagraphNav } from './ParagraphNav';
import { usePrintMode } from '../hooks/usePrintMode';

interface SmartbookViewProps {
  bookId: string;
  chapter: Chapter;
  allChapters: Chapter[];
  resolveAsset?: (src: string) => string | undefined;
}

export function SmartbookView({ bookId, chapter, allChapters, resolveAsset }: SmartbookViewProps) {
  const [activePara, setActivePara] = useState(chapter.paragraphs[0]?.id);
  const paraRefs = useRef<Record<string, HTMLElement | null>>({});
  const navigate = useNavigate();
  const print = usePrintMode();

  const formulaIndex = useMemo(() => buildFormulaIndex(allChapters), [allChapters]);

  const jumpToPara = useCallback((id: string) => {
    setActivePara(id);
    paraRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    const chromePx = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--app-chrome-height')
    ) || 112;
    const topOffset = chromePx + 56;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActivePara(e.target.getAttribute('data-para-id') ?? chapter.paragraphs[0]?.id ?? '');
          }
        }
      },
      { rootMargin: `-${topOffset}px 0px -60% 0px`, threshold: 0 }
    );

    chapter.paragraphs.forEach((p) => {
      const el = paraRefs.current[p.id];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [chapter]);

  const handleRefClick = useCallback(
    (e: React.MouseEvent) => {
      const target = (e.target as HTMLElement).closest('.smartbook-ref') as HTMLElement | null;
      if (!target) return;
      e.preventDefault();
      const ref = target.dataset.ref;
      if (!ref) return;

      if (ref.startsWith('formula/')) {
        navigate(`/libro/${bookId}/formulario#${ref.replace('formula/', '')}`);
      } else if (ref.startsWith('chapter/')) {
        const [, rest] = ref.split('chapter/');
        const [chNum, para] = rest.split('#');
        const ch = allChapters.find((c) => c.meta.number === Number(chNum));
        if (ch) navigate(`/libro/${bookId}/capitolo/${ch.meta.id}#${para}`);
      }
    },
    [bookId, allChapters, navigate]
  );

  const nextChapter = useMemo(() => {
    const idx = allChapters.findIndex((c) => c.meta.id === chapter.meta.id);
    return idx >= 0 && idx < allChapters.length - 1 ? allChapters[idx + 1] : null;
  }, [allChapters, chapter.meta.id]);

  return (
    <div className="smartbook-view">
      <div className="view-toolbar">
        <h2>Cap. {chapter.meta.number} — {chapter.meta.title}</h2>
        {chapter.meta.printable && (
          <button
            type="button"
            className="btn-print no-print"
            onClick={() => print({ bookId, section: 'capitolo', chapterId: chapter.meta.id })}
          >
            Versione stampabile
          </button>
        )}
      </div>

      <ParagraphNav
        paragraphs={chapter.paragraphs}
        activeId={activePara}
        onJump={jumpToPara}
      />

      <article className="chapter-content">
        {chapter.paragraphs.map((para) => (
          <section
            key={para.id}
            id={para.id}
            data-para-id={para.id}
            ref={(el) => { paraRefs.current[para.id] = el; }}
            className="paragraph-section"
          >
            <h3 className="paragraph-title">
              <span className="para-num">{para.id}</span> {para.title}
            </h3>
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

      {nextChapter && (
        <nav className="chapter-next-nav" aria-label="Capitolo successivo">
          <Link
            to={`/libro/${bookId}/capitolo/${nextChapter.meta.id}`}
            className="chapter-next-link"
          >
            <span className="chapter-next-body">
              <span className="chapter-next-eyebrow">Capitolo successivo</span>
              <span className="chapter-next-title">
                Cap. {nextChapter.meta.number} — {nextChapter.meta.title}
              </span>
            </span>
            <span className="chapter-next-arrow" aria-hidden>→</span>
          </Link>
        </nav>
      )}
    </div>
  );
}

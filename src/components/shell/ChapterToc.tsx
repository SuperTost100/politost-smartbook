import { Link } from 'react-router-dom';
import { useReaderProgress } from '../../context/ReaderProgressContext';
import { subjectTone } from '../../lib/subjectTone';

export interface TocChapter {
  id: string;
  number: number;
  title: string;
  path: string;
}

interface ChapterTocProps {
  subject: string;
  bookTitle: string;
  chapters: TocChapter[];
  activeChapterId?: string;
  /** Called after a navigation (closes the drawer on small screens). */
  onNavigate?: () => void;
}

/** Book block, then the chapters; the current chapter expands to its paragraphs. */
export function ChapterToc({ subject, bookTitle, chapters, activeChapterId, onNavigate }: ChapterTocProps) {
  const { paragraphs, activeParagraphId, jumpTo } = useReaderProgress();

  return (
    <aside className="sb-toc" aria-label="Indice capitoli">
      <div className="sb-toc-book">
        <span className={`sb-tag sb-tag-subject sb-tone-${subjectTone(subject)}`}>{subject}</span>
        <h2>{bookTitle}</h2>
      </div>
      <span className="sb-eyebrow">Indice</span>
      <ol>
        {chapters.map((ch) => {
          const active = ch.id === activeChapterId;
          return (
            <li key={ch.id}>
              <Link
                to={ch.path}
                className="sb-toc-ch"
                aria-current={active ? 'page' : undefined}
                onClick={onNavigate}
              >
                <span className="sb-toc-num">{ch.number}</span>
                <span>{ch.title}</span>
              </Link>
              {active && paragraphs.length > 0 && (
                <ol className="sb-toc-paras">
                  {paragraphs.map((p) => (
                    <li key={p.id}>
                      <a
                        href={`#${p.id}`}
                        className="sb-toc-para"
                        aria-current={p.id === activeParagraphId ? 'location' : undefined}
                        onClick={(e) => {
                          e.preventDefault();
                          jumpTo(p.id);
                          onNavigate?.();
                        }}
                      >
                        {p.title}
                      </a>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

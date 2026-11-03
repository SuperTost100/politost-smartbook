import { Link } from 'react-router-dom';
import { useReaderProgress } from '../../context/ReaderProgressContext';

export interface TocChapter {
  id: string;
  number: number;
  title: string;
  path: string;
}

interface ChapterTocProps {
  chapters: TocChapter[];
  activeChapterId?: string;
  /** Called after a navigation (closes the drawer on small screens). */
  onNavigate?: () => void;
}

/** The chapters in an inset panel; the open chapter is raised and lists its paragraphs. */
export function ChapterToc({ chapters, activeChapterId, onNavigate }: ChapterTocProps) {
  const { paragraphs, activeParagraphId, jumpTo } = useReaderProgress();

  return (
    <aside className="sb-toc" aria-label="Indice capitoli">
      <h2 className="sb-panel-label">Indice</h2>
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

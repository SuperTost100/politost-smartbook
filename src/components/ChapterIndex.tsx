import { Link } from 'react-router-dom';
import type { ChapterMeta } from '../types/smartbook';

interface ChapterIndexProps {
  bookId: string;
  chapters: ChapterMeta[];
  activeChapterId?: string;
  variant?: 'sidebar' | 'inline';
  open?: boolean;
  onClose?: () => void;
}

export function ChapterIndex({
  bookId,
  chapters,
  activeChapterId,
  variant = 'sidebar',
  open = true,
  onClose,
}: ChapterIndexProps) {
  const isInline = variant === 'inline';

  const handleNavigate = () => {
    if (isInline) onClose?.();
  };

  return (
    <aside
      id={isInline ? 'chapter-index-drawer' : undefined}
      className={`chapter-index${isInline ? ' chapter-inline' : ''}${isInline && open ? ' open' : ''}`}
      aria-label="Indice capitoli"
      aria-hidden={isInline && !open ? true : undefined}
    >
      {!isInline && <h3 className="chapter-index-title">Indice</h3>}
      <ol className="chapter-list">
        {chapters.map((ch) => (
          <li key={ch.id} className={ch.id === activeChapterId ? 'active' : ''}>
            <Link to={`/libro/${bookId}/capitolo/${ch.id}`} onClick={handleNavigate}>
              <span className="ch-num">{ch.number}.</span>
              {ch.title}
            </Link>
          </li>
        ))}
      </ol>
    </aside>
  );
}

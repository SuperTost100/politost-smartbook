import { Link } from 'react-router-dom';
import type { ChapterMeta } from '../types/smartbook';

interface ChapterIndexProps {
  bookId: string;
  chapters: ChapterMeta[];
  activeChapterId?: string;
}

export function ChapterIndex({ bookId, chapters, activeChapterId }: ChapterIndexProps) {
  return (
    <aside className="chapter-index" aria-label="Indice capitoli">
      <h3 className="chapter-index-title">Indice</h3>
      <ol className="chapter-list">
        {chapters.map((ch) => (
          <li key={ch.id} className={ch.id === activeChapterId ? 'active' : ''}>
            <Link to={`/libro/${bookId}/capitolo/${ch.id}`}>
              <span className="ch-num">{ch.number}.</span>
              {ch.title}
            </Link>
          </li>
        ))}
      </ol>
    </aside>
  );
}

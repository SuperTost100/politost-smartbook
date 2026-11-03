import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, Cloud, FileText, Lock, Trash2 } from 'lucide-react';
import { BookCover } from './BookCover';

export type BookSource = 'builtin' | 'remote' | 'cloud' | 'uploaded';

const SOURCE: Record<BookSource, { label: string; Icon: typeof Cloud }> = {
  builtin: { label: 'Incluso nell’app', Icon: BookOpen },
  remote: { label: 'Dal catalogo', Icon: Cloud },
  cloud: { label: 'Dal tuo account', Icon: Cloud },
  uploaded: { label: 'Importato qui', Icon: FileText },
};

interface BookCardProps {
  subject: string;
  title: string;
  authors?: string;
  /** Authors and version. */
  meta?: string;
  href: string;
  source: BookSource;
  licensed?: boolean;
  /** Where the reader left off: `label` names the chapter in full, `short` is the visible text. */
  resume?: { href: string; label: string; short: string };
  /** The book Home offers to resume; its cover carries the ribbon. */
  reading?: boolean;
  /** Only for imported books. */
  onRemove?: () => void;
}

/** A book in the library: a raised tile with the cover, the title as the link, and its origin. */
export function BookCard({ subject, title, authors, meta, href, source, licensed, resume, reading, onRemove }: BookCardProps) {
  const { label, Icon } = SOURCE[source];
  return (
    <li className="sb-book">
      <BookCover subject={subject} title={title} author={authors} reading={reading} className="sb-book-cover" />
      <h3>
        <Link to={href} className="sb-book-link" aria-label={`Apri ${title}`}>{title}</Link>
      </h3>
      {meta && <p className="sb-book-meta">{meta}</p>}
      <div className="sb-book-chips">
        <span className="sb-chip">
          <Icon size={14} strokeWidth={1.75} aria-hidden />
          {label}
        </span>
        {licensed && (
          <span className="sb-chip sb-chip-licensed">
            <Lock size={14} strokeWidth={1.75} aria-hidden />
            Richiede accesso
          </span>
        )}
      </div>
      {(resume || onRemove) && (
        <div className="sb-book-foot">
          {resume && (
            <Link to={resume.href} className="sb-btn sb-btn-sm" aria-label={`Riprendi ${title}: ${resume.label}`}>
              Riprendi · {resume.short}
              <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
            </Link>
          )}
          {onRemove && (
            <button type="button" className="sb-btn sb-btn-ghost sb-btn-sm" onClick={onRemove}>
              <Trash2 size={14} strokeWidth={1.75} aria-hidden />
              Rimuovi da questo dispositivo
            </button>
          )}
        </div>
      )}
    </li>
  );
}

import { Link } from 'react-router-dom';
import { Lock, Trash2, Upload } from 'lucide-react';
import { Mark } from '../shell/Lockup';
import { subjectTone } from '../../lib/subjectTone';

interface BookCardProps {
  subject: string;
  title: string;
  /** Authors and version, or the contents line. */
  meta?: string;
  href: string;
  uploaded?: boolean;
  cloud?: boolean;
  licensed?: boolean;
  /** Only for imported books. */
  onRemove?: () => void;
}

/** A book in the library. Only "Apri" and "Rimuovi" act; the card itself is not a link. */
export function BookCard({ subject, title, meta, href, uploaded, cloud, licensed, onRemove }: BookCardProps) {
  return (
    <article className={`sb-book sb-tone-${subjectTone(subject)}`}>
      <div className="sb-book-cover">
        <div className="sb-book-badges">
          <span className="sb-tag sb-tag-subject">{subject}</span>
          {cloud && <span className="sb-tag">cloud</span>}
          {uploaded && (
            <span className="sb-tag sb-tag-uploaded">
              <Upload size={12} strokeWidth={1.75} aria-hidden />
              importato
            </span>
          )}
          {licensed && (
            <span className="sb-tag sb-tag-licensed">
              <Lock size={12} strokeWidth={1.75} aria-hidden />
              richiede accesso
            </span>
          )}
        </div>
        <Mark size={44} className="sb-book-mark" />
      </div>
      <div className="sb-book-body">
        <h3>{title}</h3>
        {meta && <p className="sb-book-meta">{meta}</p>}
        <div className="sb-book-foot">
          <Link to={href} className="sb-btn sb-btn-secondary sb-btn-sm" aria-label={`Apri ${title}`}>
            Apri
          </Link>
          {onRemove && (
            <button type="button" className="sb-btn sb-btn-ghost sb-btn-sm" onClick={onRemove}>
              <Trash2 size={14} strokeWidth={1.75} aria-hidden />
              Rimuovi da questo dispositivo
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

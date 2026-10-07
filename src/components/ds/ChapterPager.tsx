import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export interface PagerTarget {
  number: number;
  title: string;
  href: string;
}

interface ChapterPagerProps {
  prev?: PagerTarget | null;
  next?: PagerTarget | null;
}

/** Previous / next chapter links at the end of a chapter. */
export function ChapterPager({ prev, next }: ChapterPagerProps) {
  if (!prev && !next) return null;
  return (
    <nav className="sb-pager no-print" aria-label="Altri capitoli">
      {prev && (
        <Link to={prev.href} className="prev" rel="prev">
          <small><ArrowLeft size={14} strokeWidth={1.75} aria-hidden /> Capitolo precedente</small>
          <span>{prev.number}. {prev.title}</span>
        </Link>
      )}
      {next && (
        <Link to={next.href} className="next" rel="next">
          <small>Capitolo successivo <ArrowRight size={14} strokeWidth={1.75} aria-hidden /></small>
          <span>{next.number}. {next.title}</span>
        </Link>
      )}
    </nav>
  );
}

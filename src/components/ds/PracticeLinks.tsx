import { Link } from 'react-router-dom';
import { GraduationCap, PencilLine } from 'lucide-react';

export interface PracticeLink {
  kind: 'esercizi' | 'esami';
  label: string;
  count: number;
  /** The count in words for assistive tech, e.g. "21 esercizi". */
  countLabel: string;
  href: string;
}

/** "Esercitati" at the end of a chapter: its exercises and, after the last chapter, the exam questions. */
export function PracticeLinks({ links }: { links: PracticeLink[] }) {
  if (links.length === 0) return null;
  return (
    <nav className="sb-practice no-print" aria-label="Esercitati">
      <h2 className="sb-panel-label">Esercitati</h2>
      <div className="sb-practice-links">
        {links.map((link) => {
          const Icon = link.kind === 'esercizi' ? PencilLine : GraduationCap;
          return (
            <Link key={link.kind} to={link.href}>
              <Icon size={20} strokeWidth={1.75} aria-hidden />
              <span className="sb-practice-label">{link.label}</span>
              <span className="sb-badge" aria-hidden>{link.count}</span>
              <span className="sb-sr">, {link.countLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

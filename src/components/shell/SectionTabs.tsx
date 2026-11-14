import { Link } from 'react-router-dom';
import { BookOpen, ChartLine, GraduationCap, PencilLine, Sigma, Terminal, type LucideIcon } from 'lucide-react';
import type { SectionKey } from '../../types/smartbook';

const SECTION_ICONS: Partial<Record<SectionKey, LucideIcon>> = {
  smartbook: BookOpen,
  formulario: Sigma,
  esercizi: PencilLine,
  esami: GraduationCap,
  ide: Terminal,
  grafici: ChartLine,
};

/** One-word names for the phone bar, where six full labels do not fit in 360px. */
const SHORT_LABELS: Record<SectionKey, string> = {
  smartbook: 'Capitoli',
  formulario: 'Formule',
  esercizi: 'Esercizi',
  esami: 'Esami',
  ide: 'Lab',
  grafici: 'Grafici',
  risposte: 'Risposte',
};

export interface SectionItem {
  key: SectionKey;
  label: string;
  href: string;
}

interface SectionTabsProps {
  items: SectionItem[];
  value: SectionKey;
  /** Icons only; the label stays available to assistive tech and as a tooltip. */
  compact?: boolean;
  /** The fixed bar at the bottom of the screen on phones and tablets. */
  bottom?: boolean;
}

/** Book sections as a pressed segmented track: the current one is raised out of it. */
export function SectionTabs({ items, value, compact = false, bottom = false }: SectionTabsProps) {
  return (
    <nav aria-label="Sezioni del libro" className={`sb-segmented${compact ? ' sb-segmented-compact' : ''}${bottom ? ' sb-segmented-bottom no-print' : ''}`}>
      {items.map(({ key, label, href }) => {
        const Icon = SECTION_ICONS[key];
        const shown = bottom ? SHORT_LABELS[key] : label;
        // The accessible name keeps the visible label in it, so speech input can call a tab by what it shows.
        const name = label.toLowerCase().startsWith(shown.toLowerCase()) ? label : `${shown}: ${label}`;
        return (
          <Link
            key={key}
            to={href}
            aria-current={key === value ? 'page' : undefined}
            aria-label={name !== shown ? name : undefined}
            title={compact ? label : undefined}
          >
            {Icon && <Icon size={bottom ? 20 : 16} strokeWidth={1.75} aria-hidden />}
            <span className={compact ? 'sb-sr' : undefined}>{shown}</span>
          </Link>
        );
      })}
    </nav>
  );
}

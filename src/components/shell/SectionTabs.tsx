import { Link } from 'react-router-dom';
import { Segmented } from 'antd';
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

export interface SectionItem {
  key: SectionKey;
  label: string;
  href: string;
}

interface SectionTabsProps {
  items: SectionItem[];
  value: SectionKey;
  onChange: (key: SectionKey) => void;
  /** Icons only; the label stays available to assistive tech. */
  compact?: boolean;
  vertical?: boolean;
}

/** Book sections as a pill switcher (antd Segmented), inside a labelled nav landmark. */
export function SectionTabs({ items, value, onChange, compact = false, vertical = false }: SectionTabsProps) {
  if (vertical) {
    return (
      <nav aria-label="Sezioni del libro" className="sb-section-list">
        <ul>
          {items.map(({ key, label, href }) => {
            const Icon = SECTION_ICONS[key];
            return (
              <li key={key}>
                <Link to={href} aria-current={key === value ? 'page' : undefined} onClick={() => onChange(key)}>
                  {Icon && <Icon size={16} strokeWidth={1.75} aria-hidden />}
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label="Sezioni del libro" className="sb-section-tabs">
      <Segmented<SectionKey>
        shape="round"
        value={value}
        onChange={onChange}
        options={items.map(({ key, label }) => {
          const Icon = SECTION_ICONS[key];
          return {
            value: key,
            title: label,
            icon: Icon ? <Icon size={16} strokeWidth={1.75} aria-hidden /> : undefined,
            label: compact ? <span className="sb-sr">{label}</span> : label,
          };
        })}
      />
    </nav>
  );
}

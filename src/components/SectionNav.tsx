import { Link } from 'react-router-dom';
import type { SmartbookConfig, SectionKey } from '../types/smartbook';

const SECTION_ROUTES: Record<SectionKey, string> = {
  smartbook: '',
  formulario: 'formulario',
  esercizi: 'esercizi',
  esami: 'esami',
  ide: 'laboratorio',
  grafici: 'grafici',
  risposte: 'risposte',
};

/** ponytail: no route yet — hide from nav even if enabled in smartbook.json */
const UNROUTED_SECTIONS: SectionKey[] = ['risposte'];

interface SectionNavProps {
  bookId: string;
  config: SmartbookConfig;
  active: SectionKey;
}

export function SectionNav({ bookId, config, active }: SectionNavProps) {
  const enabled = (Object.entries(config.sections) as [SectionKey, { enabled: boolean; label: string }][])
    .filter(([key, s]) => s.enabled && !UNROUTED_SECTIONS.includes(key));

  return (
    <nav className="section-nav" aria-label="Sezioni del libro">
      {enabled.map(([key, section]) => {
        const route = SECTION_ROUTES[key];
        const path = route ? `/libro/${bookId}/${route}` : `/libro/${bookId}`;
        const isActive = key === active;

        return (
          <Link
            key={key}
            to={path}
            className={`section-nav-item ${isActive ? 'active' : ''}`}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}

export { SECTION_ROUTES };

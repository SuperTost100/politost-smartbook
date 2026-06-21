import type { Paragraph } from '../types/smartbook';

interface ParagraphNavProps {
  paragraphs: Paragraph[];
  activeId?: string;
  onJump: (id: string) => void;
}

export function ParagraphNav({ paragraphs, activeId, onJump }: ParagraphNavProps) {
  return (
    <nav className="paragraph-nav" aria-label="Navigazione paragrafi">
      <span className="paragraph-nav-label">Paragrafi</span>
      <div className="paragraph-nav-items">
        {paragraphs.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className={`paragraph-nav-btn ${p.id === activeId ? 'active' : ''}`}
            onClick={() => onJump(p.id)}
            title={p.title}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </nav>
  );
}

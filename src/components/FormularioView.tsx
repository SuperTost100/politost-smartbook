import type { Chapter } from '../types/smartbook';
import { SectionHeader } from './ds/SectionHeader';
import { FormulaCard } from './ds/FormulaCard';

interface FormularioViewProps {
  bookId: string;
  chapters: Chapter[];
}

/** A `#formula-…` link lands through the book shell's useScrollToHash, like a paragraph link. */
export function FormularioView({ bookId, chapters }: FormularioViewProps) {
  const total = chapters.reduce((n, ch) => n + ch.formulas.length, 0);

  return (
    <div className="formulario-view sb-page">
      <SectionHeader
        title="Formulario"
        meta={<span>{total} {total === 1 ? 'formula' : 'formule'} · scegli una riga per aprirla nel capitolo</span>}
      />
      <div className="sb-stack">
        {chapters.map((ch) => (
          <FormulaCard
            key={ch.meta.id}
            chapter={ch.meta.number}
            title={ch.meta.title}
            formulas={ch.formulas}
            hrefFor={(f) => `/libro/${bookId}/capitolo/${ch.meta.id}#formula-${f.id}`}
          />
        ))}
      </div>
    </div>
  );
}

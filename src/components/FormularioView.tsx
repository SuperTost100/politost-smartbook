import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { Chapter } from '../types/smartbook';
import { SectionHeader } from './ds/SectionHeader';
import { FormulaCard } from './ds/FormulaCard';
import { usePrintMode } from '../hooks/usePrintMode';

interface FormularioViewProps {
  bookId: string;
  chapters: Chapter[];
}

export function FormularioView({ bookId, chapters }: FormularioViewProps) {
  const location = useLocation();
  const print = usePrintMode();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      document.getElementById(`formula-${id}`)?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.hash]);

  const total = chapters.reduce((n, ch) => n + ch.formulas.length, 0);

  return (
    <div className="formulario-view sb-page">
      <SectionHeader
        title="Formulario"
        meta={<span>{total} {total === 1 ? 'formula' : 'formule'} · scegli una riga per aprirla nel capitolo</span>}
        onPrint={() => print({ bookId, section: 'formulario' })}
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

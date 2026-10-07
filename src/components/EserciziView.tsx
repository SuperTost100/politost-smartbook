import type { Exercise } from '../types/smartbook';
import { ContentFlow } from './ContentFlow';
import { SectionHeader } from './ds/SectionHeader';
import { ExerciseCard } from './ds/ExerciseCard';
import { RevealBlock } from './ds/RevealBlock';
import { preprocessContent } from '../lib/parser';
import { usePrintMode } from '../hooks/usePrintMode';
import type { PrintSection } from '../print/routes';

interface EserciziViewProps {
  bookId: string;
  exercises: Exercise[];
  title: string;
  printSection: PrintSection;
  printable?: boolean;
  resolveAsset?: (src: string) => string | undefined;
}

export function EserciziView({
  bookId,
  exercises,
  title,
  printSection,
  printable = true,
  resolveAsset,
}: EserciziViewProps) {
  const print = usePrintMode();
  return (
    <div className="esercizi-view sb-page sb-page-reading">
      <SectionHeader
        title={title}
        meta={<span>{exercises.length} {exercises.length === 1 ? 'esercizio' : 'esercizi'}</span>}
        onPrint={printable ? () => print({ bookId, section: printSection }) : undefined}
      />

      {exercises.length === 0 ? (
        <p className="empty-note">Nessun esercizio disponibile.</p>
      ) : (
        <div className="sb-stack">
          {exercises.map((ex) => (
            <ExerciseCard
              key={ex.id}
              id={ex.id}
              chapter={ex.chapter}
              difficulty={ex.difficulty}
              hint={
                ex.hint ? (
                  <RevealBlock variant="hint">
                    <ContentFlow content={preprocessContent(ex.hint)} resolveAsset={resolveAsset} />
                  </RevealBlock>
                ) : undefined
              }
              solution={
                ex.solution ? (
                  <RevealBlock variant="solution">
                    <ContentFlow content={preprocessContent(ex.solution)} resolveAsset={resolveAsset} />
                  </RevealBlock>
                ) : undefined
              }
            >
              <ContentFlow content={preprocessContent(ex.question)} resolveAsset={resolveAsset} />
            </ExerciseCard>
          ))}
        </div>
      )}
    </div>
  );
}

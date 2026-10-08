import type { ChapterMeta, Exercise, FormulaRef } from '../types/smartbook';
import { ContentFlow } from './ContentFlow';
import { SectionHeader } from './ds/SectionHeader';
import { ExerciseCard } from './ds/ExerciseCard';
import { RevealBlock } from './ds/RevealBlock';
import { preprocessContent } from '../lib/parser';
import { usePrintMode } from '../hooks/usePrintMode';
import { useRefClick } from '../hooks/useRefClick';
import type { PrintSection } from '../print/routes';

interface EserciziViewProps {
  bookId: string;
  exercises: Exercise[];
  title: string;
  printSection: PrintSection;
  printable?: boolean;
  /** For links to a chapter (`ref:chapter/2#p1`). */
  chapters?: ChapterMeta[];
  /** Numbered formulas of the whole book, so (2.1) in a hint resolves. */
  formulaIndex?: Map<string, FormulaRef>;
  resolveAsset?: (src: string) => string | undefined;
}

export function EserciziView({
  bookId,
  exercises,
  title,
  printSection,
  printable = true,
  chapters = [],
  formulaIndex,
  resolveAsset,
}: EserciziViewProps) {
  const print = usePrintMode();
  const onRefClick = useRefClick(bookId, chapters);
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
                    <ContentFlow content={preprocessContent(ex.hint)} formulaIndex={formulaIndex} resolveAsset={resolveAsset} onRefClick={onRefClick} />
                  </RevealBlock>
                ) : undefined
              }
              solution={
                ex.solution ? (
                  <RevealBlock variant="solution">
                    <ContentFlow content={preprocessContent(ex.solution)} formulaIndex={formulaIndex} resolveAsset={resolveAsset} onRefClick={onRefClick} />
                  </RevealBlock>
                ) : undefined
              }
            >
              <ContentFlow content={preprocessContent(ex.question)} formulaIndex={formulaIndex} resolveAsset={resolveAsset} onRefClick={onRefClick} />
            </ExerciseCard>
          ))}
        </div>
      )}
    </div>
  );
}

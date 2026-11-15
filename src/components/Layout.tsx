import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Exercise, FormulaRef, SectionKey, SmartbookConfig } from '../types/smartbook';
import { ReaderProgressProvider } from '../context/ReaderProgressContext';
import { ReaderShell, type ReaderIndex } from './shell/ReaderShell';
import { ChapterToc } from './shell/ChapterToc';
import { IndexToc } from './shell/IndexToc';
import type { SectionItem } from './shell/SectionTabs';
import { UserWatermark } from './UserWatermark';
import { Footer } from './Footer';
import { MOBILE_LAYOUT_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { usePrintMode } from '../hooks/usePrintMode';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useChapterView } from '../hooks/useChapterView';
import { FORMULA_INDEX_MIN_CHAPTERS, findEntry, scopeSearch } from '../lib/exerciseNav';
import { MOBILE_HIDDEN_SECTIONS, UNROUTED_SECTIONS, sectionPath } from '../lib/sectionRoutes';
import type { PrintSection } from '../print/routes';

interface LayoutProps {
  bookId: string;
  config: SmartbookConfig;
  activeSection: SectionKey;
  showChapterIndex?: boolean;
  activeChapterId?: string;
  /** The Esercizi section: its chapter index replaces the chapters one. */
  exercises?: Exercise[];
  /** The Formulario section, from bookFormulas: the same, for the formulas. */
  formulas?: FormulaRef[];
  children?: ReactNode;
}

const NO_EXERCISES: Exercise[] = [];
const NO_FORMULAS: FormulaRef[] = [];

const PRINT_SECTIONS: Partial<Record<SectionKey, PrintSection>> = {
  formulario: 'formulario',
  esercizi: 'esercizi',
  esami: 'esami',
};

export function Layout(props: LayoutProps) {
  return (
    <ReaderProgressProvider>
      <LayoutInner {...props} />
    </ReaderProgressProvider>
  );
}

function LayoutInner({
  bookId,
  config,
  activeSection,
  showChapterIndex = false,
  activeChapterId,
  exercises = NO_EXERCISES,
  formulas = NO_FORMULAS,
  children,
}: LayoutProps) {
  const print = usePrintMode();
  const isMobile = useMediaQuery(MOBILE_LAYOUT_QUERY);

  const sections = useMemo<SectionItem[]>(
    () =>
      (Object.entries(config.sections) as [SectionKey, { enabled: boolean; label: string }][])
        .filter(
          ([key, s]) =>
            s.enabled
            && !UNROUTED_SECTIONS.includes(key)
            && !(isMobile && MOBILE_HIDDEN_SECTIONS.includes(key)),
        )
        .map(([key, s]) => ({ key, label: s.label, href: sectionPath(bookId, key) })),
    [bookId, config.sections, isMobile],
  );

  const exerciseView = useChapterView(exercises, config.chapters, { indexed: activeSection === 'esercizi', all: 'tutti' });
  const formulaView = useChapterView(formulas, config.chapters, {
    indexed: activeSection === 'formulario',
    all: 'tutte',
    minChapters: FORMULA_INDEX_MIN_CHAPTERS,
  });
  const { index: exerciseIndex, scope: exerciseScope, difficulty } = exerciseView;
  const { index: formulaIndex, scope: formulaScope } = formulaView;

  const index = useMemo<ReaderIndex | undefined>(() => {
    if (showChapterIndex && config.chapters.length > 0) {
      const chapters = config.chapters.map((ch) => ({
        id: ch.id,
        number: ch.number,
        title: ch.title,
        path: `/libro/${bookId}/capitolo/${ch.id}`,
      }));
      return {
        label: 'Indice capitoli',
        render: (onNavigate, railVisible) => (
          <ChapterToc chapters={chapters} activeChapterId={activeChapterId} onNavigate={onNavigate} showParagraphs={!railVisible} />
        ),
      };
    }
    if (exerciseIndex) {
      const basePath = sectionPath(bookId, 'esercizi');
      return {
        label: 'Indice esercizi',
        render: (onNavigate) => (
          <IndexToc
            index={exerciseIndex}
            label="Esercizi per capitolo"
            allLabel="Tutti"
            all="tutti"
            noun={['esercizio', 'esercizi']}
            scope={exerciseScope}
            // The chosen difficulty stays on when the chapter changes.
            href={(to) => `${basePath}${scopeSearch(to, difficulty)}`}
            onNavigate={onNavigate}
          />
        ),
      };
    }
    if (formulaIndex) {
      const basePath = sectionPath(bookId, 'formulario');
      return {
        label: 'Indice formule',
        render: (onNavigate) => (
          <IndexToc
            index={formulaIndex}
            label="Formule per capitolo"
            allLabel="Tutte"
            all="tutte"
            noun={['formula', 'formule']}
            scope={formulaScope}
            href={(to) => `${basePath}${scopeSearch(to, null)}`}
            onNavigate={onNavigate}
          />
        ),
      };
    }
    return undefined;
  }, [bookId, config.chapters, showChapterIndex, activeChapterId, exerciseIndex, exerciseScope, difficulty, formulaIndex, formulaScope]);

  const activeChapter = config.chapters.find((ch) => ch.id === activeChapterId);
  const sectionLabel = config.sections[activeSection].label;
  const scope = activeSection === 'formulario' ? formulaScope : exerciseScope;
  const indexEntry = findEntry(activeSection === 'formulario' ? formulaIndex : exerciseIndex, scope);
  const pageTitle = activeChapter
    ? `${activeChapter.number}. ${activeChapter.title}`
    : activeChapterId
      ? 'Capitolo non trovato'
      : indexEntry
        ? `${indexEntry.number != null ? `${indexEntry.number}. ` : ''}${indexEntry.title} · ${sectionLabel}`
        : sectionLabel;
  useDocumentTitle(`${pageTitle} · ${config.title}`);
  const printSection = PRINT_SECTIONS[activeSection];
  const onPrint =
    activeSection === 'smartbook' && activeChapter?.printable
      ? () => print({ bookId, section: 'capitolo', chapterId: activeChapter.id })
      : printSection
        ? () =>
            print({
              bookId,
              section: printSection,
              scope: scope ?? undefined,
              difficulty: activeSection === 'formulario' ? undefined : (difficulty ?? undefined),
            })
        : undefined;

  return (
    <>
    <ReaderShell
      bookTitle={config.title}
      sections={sections}
      activeSection={activeSection}
      index={index}
      onPrint={onPrint}
      footer={<Footer showCatalogLink wide compact={isMobile} />}
    >
      {children}
    </ReaderShell>
    <UserWatermark bookId={bookId} licensed={config.access === 'licensed'} />
    </>
  );
}

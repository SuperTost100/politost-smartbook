import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Exercise, SectionKey, SmartbookConfig } from '../types/smartbook';
import { ReaderProgressProvider } from '../context/ReaderProgressContext';
import { ReaderShell, type ReaderIndex } from './shell/ReaderShell';
import { ChapterToc } from './shell/ChapterToc';
import { ExerciseToc } from './shell/ExerciseToc';
import type { SectionItem } from './shell/SectionTabs';
import { UserWatermark } from './UserWatermark';
import { Footer } from './Footer';
import { MOBILE_LAYOUT_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { usePrintMode } from '../hooks/usePrintMode';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useExerciseView } from '../hooks/useExerciseView';
import { findEntry } from '../lib/exerciseNav';
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
  children?: ReactNode;
}

const NO_EXERCISES: Exercise[] = [];

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

  const { index: exerciseIndex, scope, difficulty } = useExerciseView(exercises, config.chapters, activeSection === 'esercizi');

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
        render: (onNavigate) => <ChapterToc chapters={chapters} activeChapterId={activeChapterId} onNavigate={onNavigate} />,
      };
    }
    if (exerciseIndex) {
      return {
        label: 'Indice esercizi',
        render: (onNavigate) => (
          <ExerciseToc
            index={exerciseIndex}
            basePath={sectionPath(bookId, 'esercizi')}
            scope={scope}
            difficulty={difficulty}
            onNavigate={onNavigate}
          />
        ),
      };
    }
    return undefined;
  }, [bookId, config.chapters, showChapterIndex, activeChapterId, exerciseIndex, scope, difficulty]);

  const activeChapter = config.chapters.find((ch) => ch.id === activeChapterId);
  const sectionLabel = config.sections[activeSection].label;
  const exerciseEntry = findEntry(exerciseIndex, scope);
  const pageTitle = activeChapter
    ? `${activeChapter.number}. ${activeChapter.title}`
    : exerciseEntry
      ? `${exerciseEntry.number != null ? `${exerciseEntry.number}. ` : ''}${exerciseEntry.title} · ${sectionLabel}`
      : sectionLabel;
  useDocumentTitle(`${pageTitle} · ${config.title}`);
  const printSection = PRINT_SECTIONS[activeSection];
  const onPrint =
    activeSection === 'smartbook' && activeChapter?.printable
      ? () => print({ bookId, section: 'capitolo', chapterId: activeChapter.id })
      : printSection
        ? () => print({ bookId, section: printSection, scope: scope ?? undefined, difficulty: difficulty ?? undefined })
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

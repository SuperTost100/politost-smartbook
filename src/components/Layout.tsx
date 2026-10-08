import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { SectionKey, SmartbookConfig } from '../types/smartbook';
import { ReaderProgressProvider } from '../context/ReaderProgressContext';
import { ReaderShell } from './shell/ReaderShell';
import type { SectionItem } from './shell/SectionTabs';
import { UserWatermark } from './UserWatermark';
import { Footer } from './Footer';
import { MOBILE_LAYOUT_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { usePrintMode } from '../hooks/usePrintMode';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { MOBILE_HIDDEN_SECTIONS, UNROUTED_SECTIONS, sectionPath } from '../lib/sectionRoutes';
import type { PrintSection } from '../print/routes';

interface LayoutProps {
  bookId: string;
  config: SmartbookConfig;
  activeSection: SectionKey;
  showChapterIndex?: boolean;
  activeChapterId?: string;
  children?: ReactNode;
}

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
  children,
}: LayoutProps) {
  const navigate = useNavigate();
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

  const chapters = useMemo(
    () =>
      showChapterIndex
        ? config.chapters.map((ch) => ({
            id: ch.id,
            number: ch.number,
            title: ch.title,
            path: `/libro/${bookId}/capitolo/${ch.id}`,
          }))
        : undefined,
    [bookId, config.chapters, showChapterIndex],
  );

  const activeChapter = config.chapters.find((ch) => ch.id === activeChapterId);
  useDocumentTitle(
    `${activeChapter ? `${activeChapter.number}. ${activeChapter.title}` : config.sections[activeSection].label} · ${config.title}`,
  );
  const printSection = PRINT_SECTIONS[activeSection];
  const onPrint =
    activeSection === 'smartbook' && activeChapter?.printable
      ? () => print({ bookId, section: 'capitolo', chapterId: activeChapter.id })
      : printSection
        ? () => print({ bookId, section: printSection })
        : undefined;

  return (
    <>
    <ReaderShell
      subject={config.subject}
      bookTitle={config.title}
      sections={sections}
      activeSection={activeSection}
      onSection={(key) => navigate(sectionPath(bookId, key))}
      chapters={chapters}
      activeChapterId={activeChapterId}
      onPrint={onPrint}
      footer={<Footer showCatalogLink wide compact={isMobile} />}
    >
      {children}
    </ReaderShell>
    <UserWatermark bookId={bookId} licensed={config.access === 'licensed'} />
    </>
  );
}

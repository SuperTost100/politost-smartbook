import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Drawer, Tooltip } from 'antd';
import { Menu, Printer } from 'lucide-react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { usePrintShortcut } from '../../hooks/usePrintShortcut';
import { ThemeToggle } from '../ThemeToggle';
import { Mark } from './Lockup';
import { SectionTabs, type SectionItem } from './SectionTabs';
import { ChapterToc, type TocChapter } from './ChapterToc';
import { ParagraphRail } from './ParagraphRail';
import { useReaderParagraphs } from '../../context/ReaderProgressContext';
import type { SectionKey } from '../../types/smartbook';

interface ReaderShellProps {
  bookTitle: string;
  sections: SectionItem[];
  activeSection: SectionKey;
  /** Chapter index; an inset panel on the left (a drawer on small screens), only when provided. */
  chapters?: TocChapter[];
  activeChapterId?: string;
  onPrint?: () => void;
  footer?: ReactNode;
  children: ReactNode;
}

const DESKTOP = '(min-width: 1024px)';
const RAIL = '(min-width: 1280px)';
const COMPACT_TABS = '(max-width: 1239px)';

/**
 * Reader shell: a sticky header on the desk (book, section switcher, tools), the chapter index in an
 * inset panel, the reading column and the paragraph outline. Below 1024px the index moves into a
 * drawer and the section switcher becomes a bar at the bottom of the screen.
 */
export function ReaderShell(props: ReaderShellProps) {
  const isDesktop = useMediaQuery(DESKTOP);
  const showRailWidth = useMediaQuery(RAIL);
  const compactTabs = useMediaQuery(COMPACT_TABS);
  const paragraphs = useReaderParagraphs();
  const [drawerOpen, setDrawerOpen] = useState(false);
  usePrintShortcut(props.onPrint);

  const hasToc = !!props.chapters?.length;
  const showRail = showRailWidth && props.activeSection === 'smartbook' && paragraphs.length > 0;

  const toc = hasToc ? (
    <ChapterToc
      chapters={props.chapters!}
      activeChapterId={props.activeChapterId}
      onNavigate={() => setDrawerOpen(false)}
    />
  ) : null;

  const bodyClass = ['sb-reader-body', isDesktop && hasToc && 'has-toc', showRail && 'has-rail'].filter(Boolean).join(' ');

  return (
    <div className="sb-reader">
      <header className="sb-rtop no-print">
        <div className="sb-rtop-start">
          {!isDesktop && hasToc && (
            <button
              type="button"
              className="sb-icon-btn"
              aria-label="Apri indice capitoli"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
            >
              <Menu size={20} strokeWidth={1.75} aria-hidden />
            </button>
          )}
          <Link to="/" className="sb-header-brand" aria-label="Smartbook, torna alla libreria">
            <Mark size={24} />
          </Link>
          <p className="sb-header-title">{props.bookTitle}</p>
        </div>
        <SectionTabs items={props.sections} value={props.activeSection} compact={isDesktop && compactTabs} />
        <div className="sb-rtop-tools">
          {props.onPrint && (
            <Tooltip title="Versione stampabile">
              <button type="button" className="sb-icon-btn" aria-label="Versione stampabile" onClick={props.onPrint}>
                <Printer size={20} strokeWidth={1.75} aria-hidden />
              </button>
            </Tooltip>
          )}
          <ThemeToggle />
        </div>
      </header>

      <div className={bodyClass}>
        {isDesktop && toc}
        <main id="main-content" className="app-main">
          {props.children}
        </main>
        {showRail && <ParagraphRail />}
      </div>
      {props.footer}

      {!isDesktop && hasToc && (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="left"
          size={320}
          title={props.bookTitle}
          closable
          className="sb-drawer"
          aria-label="Indice capitoli"
        >
          {toc}
        </Drawer>
      )}
    </div>
  );
}

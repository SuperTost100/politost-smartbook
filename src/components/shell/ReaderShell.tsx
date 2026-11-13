import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Drawer, Tooltip } from 'antd';
import { Menu, Printer } from 'lucide-react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { usePrintShortcut } from '../../hooks/usePrintShortcut';
import { ThemeToggle } from '../ThemeToggle';
import { Mark } from './Lockup';
import { SectionTabs, type SectionItem } from './SectionTabs';
import { IndexDrawerContext, type IndexDrawer } from './indexDrawer';
import { ParagraphRail } from './ParagraphRail';
import { useReaderParagraphs } from '../../context/ReaderProgressContext';
import type { SectionKey } from '../../types/smartbook';

interface ReaderShellProps {
  bookTitle: string;
  sections: SectionItem[];
  activeSection: SectionKey;
  /** The index of chapters or of exercises: an inset panel on the left, a drawer on small screens. */
  index?: ReaderIndex;
  onPrint?: () => void;
  footer?: ReactNode;
  children: ReactNode;
}

export interface ReaderIndex {
  /** Names the drawer and its menu button, e.g. "Indice capitoli". */
  label: string;
  /** `onNavigate` closes the drawer after a choice. */
  render: (onNavigate: () => void) => ReactNode;
}

const DESKTOP = '(min-width: 1024px)';
const RAIL = '(min-width: 1360px)';
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

  const hasToc = !!props.index;
  const showRail = showRailWidth && props.activeSection === 'smartbook' && paragraphs.length > 0;
  const inDrawer = !isDesktop && hasToc;

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const drawer = useMemo<IndexDrawer>(
    () => ({ open: inDrawer ? openDrawer : undefined, expanded: drawerOpen }),
    [inDrawer, openDrawer, drawerOpen],
  );
  const toc = props.index?.render(closeDrawer) ?? null;

  const bodyClass = ['sb-reader-body', isDesktop && hasToc && 'has-toc', showRail && 'has-rail'].filter(Boolean).join(' ');

  return (
    <div className="sb-reader">
      <header className="sb-rtop no-print">
        <div className="sb-rtop-start">
          {inDrawer && (
            <button
              type="button"
              className="sb-icon-btn"
              aria-label={`Apri ${props.index!.label.toLowerCase()}`}
              aria-expanded={drawerOpen}
              onClick={openDrawer}
            >
              <Menu size={20} strokeWidth={1.75} aria-hidden />
            </button>
          )}
          <Link to="/" className="sb-header-brand" aria-label="Smartbook, torna alla libreria">
            <Mark size={24} />
          </Link>
          <p className="sb-header-title">{props.bookTitle}</p>
        </div>
        {isDesktop && <SectionTabs items={props.sections} value={props.activeSection} compact={compactTabs} />}
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
      {/* Right after the header, so keyboard users reach it before the page; outside it, see .sb-segmented-bottom. */}
      {!isDesktop && <SectionTabs items={props.sections} value={props.activeSection} bottom />}

      <div className={bodyClass}>
        {isDesktop && toc}
        <main id="main-content" className="app-main">
          <IndexDrawerContext.Provider value={drawer}>{props.children}</IndexDrawerContext.Provider>
        </main>
        {showRail && <ParagraphRail />}
      </div>
      {props.footer}

      {inDrawer && (
        <Drawer
          open={drawerOpen}
          onClose={closeDrawer}
          afterOpenChange={(open) => {
            // Start on the current entry, so a long index does not open at its top.
            if (open) document.querySelector<HTMLElement>('.sb-drawer [aria-current="page"]')?.focus();
          }}
          placement="left"
          size={320}
          title={props.bookTitle}
          closable
          className="sb-drawer"
          aria-label={props.index!.label}
        >
          {toc}
        </Drawer>
      )}
    </div>
  );
}

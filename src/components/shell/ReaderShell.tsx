import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button, Drawer, Tooltip } from 'antd';
import { ProConfigProvider, ProLayout } from '@ant-design/pro-components';
import { PanelLeft, Printer } from 'lucide-react';
import { ptsbLayout, ptsbProLayoutToken } from '../../../design-system/theme/ptsb-theme';
import { useTheme } from '../../context/ThemeContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { ThemeToggle } from '../ThemeToggle';
import { Lockup } from './Lockup';
import { SectionTabs, type SectionItem } from './SectionTabs';
import { ChapterToc, type TocChapter } from './ChapterToc';
import { ParagraphRail } from './ParagraphRail';
import { useReaderProgress } from '../../context/ReaderProgressContext';
import type { SectionKey } from '../../types/smartbook';

interface ReaderShellProps {
  subject: string;
  bookTitle: string;
  sections: SectionItem[];
  activeSection: SectionKey;
  onSection: (key: SectionKey) => void;
  /** Chapter index; shown in the sider (drawer on small screens) only when provided. */
  chapters?: TocChapter[];
  activeChapterId?: string;
  onPrint?: () => void;
  footer?: ReactNode;
  children: ReactNode;
}

const DESKTOP = '(min-width: 1024px)';
const RAIL = '(min-width: 1280px)';
const COMPACT_TABS = '(max-width: 1179px)';

/** Reader shell on ProLayout `mix`: 64px header, chapter TOC sider, reading column, paragraph rail. */
export function ReaderShell(props: ReaderShellProps) {
  const { theme } = useTheme();
  const isDesktop = useMediaQuery(DESKTOP);
  const showRailWidth = useMediaQuery(RAIL);
  const compactTabs = useMediaQuery(COMPACT_TABS);
  const { paragraphs } = useReaderProgress();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const hasToc = !!props.chapters?.length;
  const siderVisible = isDesktop && hasToc;
  const showRail = showRailWidth && props.activeSection === 'smartbook' && paragraphs.length > 0;
  const menuLabel = hasToc ? 'Apri indice capitoli' : 'Apri sezioni del libro';

  const toc = hasToc ? (
    <ChapterToc
      subject={props.subject}
      bookTitle={props.bookTitle}
      chapters={props.chapters!}
      activeChapterId={props.activeChapterId}
      onNavigate={() => setDrawerOpen(false)}
    />
  ) : null;

  return (
    <ProConfigProvider dark={theme === 'dark'} hashed={false}>
      <ProLayout
        layout="mix"
        fixedHeader
        fixSiderbar
        siderWidth={ptsbLayout.siderWidth}
        breakpoint={false}
        disableMobile
        collapsed={false}
        navTheme={theme === 'dark' ? 'realDark' : 'light'}
        token={ptsbProLayoutToken(theme)}
        title={false}
        pure={false}
        menuHeaderRender={false}
        menuRender={siderVisible ? undefined : false}
        menuContentRender={() => toc}
        collapsedButtonRender={false}
        headerTitleRender={() => (
          <div className="sb-header-start">
            {!isDesktop && (
              <Button
                shape="circle"
                type="text"
                aria-label={menuLabel}
                aria-expanded={drawerOpen}
                icon={<PanelLeft size={20} strokeWidth={1.75} />}
                onClick={() => setDrawerOpen(true)}
              />
            )}
            <Link to="/" className="sb-header-brand" aria-label="Smartbook, catalogo">
              <Lockup />
            </Link>
            {!isDesktop && <p className="sb-header-title">{props.bookTitle}</p>}
          </div>
        )}
        headerContentRender={() =>
          isDesktop ? (
            <div className="sb-header-center">
              <SectionTabs
                items={props.sections}
                value={props.activeSection}
                onChange={props.onSection}
                compact={compactTabs}
              />
            </div>
          ) : null
        }
        actionsRender={() => [
          props.onPrint ? (
            <Tooltip key="print" title="Versione stampabile">
              <Button
                shape="circle"
                type="text"
                aria-label="Versione stampabile"
                icon={<Printer size={20} strokeWidth={1.75} />}
                onClick={props.onPrint}
              />
            </Tooltip>
          ) : null,
          <ThemeToggle key="theme" />,
        ]}
        footerRender={false}
      >
        <div className={`sb-reader-body${showRail ? ' has-rail' : ''}`}>
          <main id="main-content" className="app-main">
            {props.children}
          </main>
          {showRail && <ParagraphRail />}
        </div>
        {props.footer}
      </ProLayout>

      {!isDesktop && (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="left"
          size={320}
          title={null}
          closable
          className="sb-drawer"
          aria-label={menuLabel}
        >
          <div className="sb-drawer-sections">
            <SectionTabs
              items={props.sections}
              value={props.activeSection}
              onChange={() => setDrawerOpen(false)}
              vertical
            />
          </div>
          {toc}
        </Drawer>
      )}
    </ProConfigProvider>
  );
}

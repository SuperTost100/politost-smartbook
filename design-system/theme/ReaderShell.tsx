// PoliTost Smartbook — reader shell on Ant Design Pro (ProComponents v3) + antd v6.
// ProLayout "mix": 64px header (lockup · section tabs · print/theme), chapter TOC sider, reading column, paragraph rail.
import * as React from 'react';
import { ConfigProvider, App as AntApp, Segmented, Button, Tag, Anchor, Progress, Grid } from 'antd';
import { ProConfigProvider, ProLayout } from '@ant-design/pro-components';
import itIT from 'antd/locale/it_IT';
import enUS from 'antd/locale/en_US';
import { BookOpen, Sigma, PencilLine, GraduationCap, Terminal, ChartLine, Printer, Moon, Sun } from 'lucide-react';
import { ptsbTheme, ptsbProLayoutToken, ptsbLayout, type PtsbMode } from './ptsb-theme';
import lockupLight from '../logo/ptsb-lockup-light.svg';
import lockupDark from '../logo/ptsb-lockup-dark.svg';

export type SectionKey = 'smartbook' | 'formulario' | 'esercizi' | 'esami' | 'ide' | 'grafici';
export interface ShellChapter { id: string; number: number; title: string; path: string; paragraphs: { id: string; number: string; title: string }[] }

const SECTION_ICONS: Record<SectionKey, React.ReactNode> = {
  smartbook: <BookOpen size={16} strokeWidth={1.75} />,
  formulario: <Sigma size={16} strokeWidth={1.75} />,
  esercizi: <PencilLine size={16} strokeWidth={1.75} />,
  esami: <GraduationCap size={16} strokeWidth={1.75} />,
  ide: <Terminal size={16} strokeWidth={1.75} />,
  grafici: <ChartLine size={16} strokeWidth={1.75} />,
};

export interface ReaderShellProps {
  mode: PtsbMode;
  lang: 'it' | 'en';
  subject: string;
  bookTitle: string;
  sections: { key: SectionKey; label: string }[];
  activeSection: SectionKey;
  onSection: (key: SectionKey) => void;
  chapters: ShellChapter[];
  activeChapterId?: string;
  activeParagraphId?: string;
  /** 0–100, share of the current chapter read */
  progress?: number;
  onNavigate: (path: string) => void;
  onToggleTheme: () => void;
  onPrint?: () => void;
  children: React.ReactNode;
}

export function ReaderShell(props: ReaderShellProps) {
  const { mode, lang, activeChapterId } = props;
  const screens = Grid.useBreakpoint();
  React.useEffect(() => { document.documentElement.dataset.theme = mode; }, [mode]);
  const t = lang === 'it'
    ? { print: 'Versione stampabile', dark: 'Tema scuro', light: 'Tema chiaro', rail: 'In questo capitolo', sections: 'Sezioni del libro' }
    : { print: 'Printable version', dark: 'Dark theme', light: 'Light theme', rail: 'In this chapter', sections: 'Book sections' };
  const chapter = props.chapters.find((c) => c.id === activeChapterId);
  const showRail = !!screens.xl && props.activeSection === 'smartbook' && !!chapter;
  const iconsOnly = !screens.xxl;

  return (
    <ConfigProvider theme={ptsbTheme(mode)} locale={lang === 'it' ? itIT : enUS}>
      <ProConfigProvider dark={mode === 'dark'} hashed={false}>
        <AntApp>
          <ProLayout
            layout="mix"
            fixedHeader
            fixSiderbar
            siderWidth={ptsbLayout.siderWidth}
            breakpoint="lg"
            navTheme={mode === 'dark' ? 'realDark' : 'light'}
            token={ptsbProLayoutToken(mode)}
            title={false}
            logo={<img src={mode === 'dark' ? lockupDark : lockupLight} alt="Smartbook" height={28} />}
            menuHeaderRender={false}
            location={{ pathname: chapter?.path ?? '' }}
            route={{ path: '/', routes: props.chapters.map((c) => ({ path: c.path, name: `${c.number}  ${c.title}`, routes: c.id === activeChapterId ? c.paragraphs.map((p) => ({ path: `${c.path}#${p.id}`, name: p.title })) : undefined })) }}
            openKeys={chapter ? [chapter.path] : []}
            menuItemRender={(item, dom) => <a onClick={(e) => { e.preventDefault(); if (item.path) props.onNavigate(item.path); }} href={item.path}>{dom}</a>}
            menuExtraRender={() => (
              <div className="sb-toc-book">
                <Tag bordered={false} className="sb-tag sb-tag-subject">{props.subject}</Tag>
                <h2>{props.bookTitle}</h2>
              </div>
            )}
            headerContentRender={() => (
              <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <Segmented<SectionKey>
                  shape="round"
                  aria-label={t.sections}
                  value={props.activeSection}
                  onChange={props.onSection}
                  options={props.sections.map((s) => ({ value: s.key, icon: SECTION_ICONS[s.key], label: iconsOnly ? undefined : s.label, title: s.label }))}
                />
              </div>
            )}
            actionsRender={() => [
              props.onPrint ? <Button key="print" shape="circle" type="text" aria-label={t.print} title={t.print} icon={<Printer size={20} strokeWidth={1.75} />} onClick={props.onPrint} /> : null,
              <Button key="theme" shape="circle" type="text" aria-label={mode === 'dark' ? t.light : t.dark} icon={mode === 'dark' ? <Sun size={20} strokeWidth={1.75} /> : <Moon size={20} strokeWidth={1.75} />} onClick={props.onToggleTheme} />,
            ]}
            footerRender={false}
          >
            <div style={{ display: 'grid', gridTemplateColumns: showRail ? `minmax(0, 1fr) ${ptsbLayout.railWidth}px` : 'minmax(0, 1fr)', gap: 32 }}>
              <main style={{ minWidth: 0, width: '100%', maxWidth: props.activeSection === 'smartbook' ? ptsbLayout.readingWidth : ptsbLayout.wideWidth, margin: '0 auto', padding: '48px 0 64px' }}>
                {props.children}
              </main>
              {showRail && chapter ? (
                <aside className="sb-rail" style={{ position: 'sticky', top: ptsbLayout.headerHeight, alignSelf: 'start' }}>
                  <span className="sb-eyebrow">{t.rail}</span>
                  <Anchor
                    targetOffset={ptsbLayout.headerHeight + 24}
                    offsetTop={ptsbLayout.headerHeight}
                    getCurrentAnchor={() => (props.activeParagraphId ? `#${props.activeParagraphId}` : '')}
                    items={chapter.paragraphs.map((p) => ({ key: p.id, href: `#${p.id}`, title: <span><span className="sb-rail-num">{p.number}</span> {p.title}</span> }))}
                  />
                  {props.progress != null ? <Progress percent={props.progress} size="small" format={(p) => `${p} %`} /> : null}
                </aside>
              ) : null}
            </div>
          </ProLayout>
        </AntApp>
      </ProConfigProvider>
    </ConfigProvider>
  );
}

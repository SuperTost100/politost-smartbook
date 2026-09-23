import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { SmartbookConfig } from '../types/smartbook';
import { SectionNav } from './SectionNav';
import { ChapterIndex } from './ChapterIndex';
import { ThemeToggle } from './ThemeToggle';
import { UserWatermark } from './UserWatermark';
import { Footer } from './Footer';
import { useAppChromeHeight } from '../hooks/useAppChromeHeight';
import { MOBILE_LAYOUT_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { useCompactChrome } from '../hooks/useCompactChrome';

interface LayoutProps {
  bookId: string;
  config: SmartbookConfig;
  activeSection: keyof SmartbookConfig['sections'];
  showChapterIndex?: boolean;
  activeChapterId?: string;
  children?: ReactNode;
}

export function Layout({
  bookId,
  config,
  activeSection,
  showChapterIndex = false,
  activeChapterId,
  children,
}: LayoutProps) {
  const chromeRef = useAppChromeHeight();
  const isMobile = useMediaQuery(MOBILE_LAYOUT_QUERY);
  const isLandscapePhone = useMediaQuery('(orientation: landscape) and (max-height: 520px)');
  const compactChrome = useCompactChrome(isMobile && showChapterIndex);
  const [chapterMenuOpen, setChapterMenuOpen] = useState(false);
  const activeChapter = config.chapters.find((ch) => ch.id === activeChapterId);
  const chapterLabel = activeChapter
    ? `Cap. ${activeChapter.number} — ${activeChapter.title}`
    : 'Scegli capitolo';
  const mobileReading = isMobile && showChapterIndex;

  return (
    <div className="app-layout">
      <div
        className={`app-chrome${compactChrome ? ' app-chrome--compact' : ''}${isLandscapePhone ? ' app-chrome--landscape' : ''}${mobileReading ? ' app-chrome--reading' : ''}`}
        ref={chromeRef}
      >
        <header className="app-header">
          <div className="header-brand">
            <Link to="/" className="brand-link">
              <img src="/logo.svg" alt="Politost" className="brand-logo-img" width={32} height={32} />
              <div className="brand-text">
                <span className="brand-logo">Politost</span>
                <span className="brand-sub">Smartbook</span>
              </div>
            </Link>
          </div>
          <div className="header-info">
            <span className="subject-badge">{config.subject}</span>
            <h1 className="book-title" title={config.title}>{config.title}</h1>
          </div>
          <ThemeToggle />
        </header>

        {mobileReading ? (
          <div className="chrome-subnav">
            <SectionNav bookId={bookId} config={config} active={activeSection} />
            <div className="chapter-select-wrap">
              <button
                type="button"
                className="chapter-select"
                aria-haspopup="listbox"
                aria-expanded={chapterMenuOpen}
                aria-controls="chapter-index-drawer"
                aria-label={`${chapterLabel}. Apri indice capitoli`}
                onClick={() => setChapterMenuOpen((open) => !open)}
              >
                <span className="chapter-select-text">{chapterLabel}</span>
                <span className="chapter-select-chevron" aria-hidden />
              </button>
              <ChapterIndex
                bookId={bookId}
                chapters={config.chapters}
                activeChapterId={activeChapterId}
                variant="inline"
                open={chapterMenuOpen}
                onClose={() => setChapterMenuOpen(false)}
              />
            </div>
          </div>
        ) : (
          <SectionNav bookId={bookId} config={config} active={activeSection} />
        )}
      </div>

      <UserWatermark bookId={bookId} licensed={config.access === 'licensed'} />

      <div className="app-body">
        {showChapterIndex && !isMobile && (
          <ChapterIndex
            bookId={bookId}
            chapters={config.chapters}
            activeChapterId={activeChapterId}
            variant="sidebar"
          />
        )}
        <main className="app-main">
          {children}
        </main>
      </div>
      <Footer showCatalogLink compact={isMobile} />
    </div>
  );
}

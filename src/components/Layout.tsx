import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { SmartbookConfig } from '../types/smartbook';
import { SectionNav } from './SectionNav';
import { ChapterIndex } from './ChapterIndex';
import { ThemeToggle } from './ThemeToggle';
import { UserWatermark } from './UserWatermark';
import { Footer } from './Footer';
import { useReaderFeatures } from '../context/ReaderConfigContext';
import { useAppChromeHeight } from '../hooks/useAppChromeHeight';

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
  const { watermark } = useReaderFeatures();

  return (
    <div className="app-layout">
      <div className="app-chrome" ref={chromeRef}>
        <header className="app-header">
          <div className="header-brand">
            <Link to="/" className="brand-link">
              <img src="/logo.svg" alt="Politost" className="brand-logo-img" width={40} height={40} />
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

        <SectionNav bookId={bookId} config={config} active={activeSection} />
      </div>

      {watermark && (
        <UserWatermark bookId={bookId} licensed={config.access === 'licensed'} />
      )}

      <div className="app-body">
        {showChapterIndex && (
          <ChapterIndex
            bookId={bookId}
            chapters={config.chapters}
            activeChapterId={activeChapterId}
          />
        )}
        <main className="app-main">
          {children}
        </main>
      </div>
      <Footer showCatalogLink />
    </div>
  );
}

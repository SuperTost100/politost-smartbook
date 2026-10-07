import type { ReactNode } from 'react';
import { SiteHeader } from './SiteHeader';
import { Footer } from './Footer';
import { Mark } from './shell/Lockup';

interface AuthLayoutProps {
  title?: string;
  tagline?: ReactNode;
  children: ReactNode;
}

/** Page frame for account pages: site header, one centred card, footer. */
export function AuthLayout({ title, tagline, children }: AuthLayoutProps) {
  return (
    <div className="site-page auth-page">
      <SiteHeader />
      <main id="main-content" className="auth-shell">
        <div className="auth-card">
          {title && (
            <div className="auth-hero">
              <Mark size={44} />
              <h1>{title}</h1>
              {tagline && <p>{tagline}</p>}
            </div>
          )}
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}

import type { ReactNode } from 'react';
import { SiteHeader } from './SiteHeader';
import { Footer } from './Footer';

interface NoticeProps {
  title: string;
  text: string;
  /** The way out: one primary button, plus a second one when it helps. */
  children: ReactNode;
}

function NoticeBody({ title, text, children }: NoticeProps) {
  return (
    <>
      <h1>{title}</h1>
      <p>{text}</p>
      <div className="page-error-actions">{children}</div>
    </>
  );
}

/** A page that says what went wrong and offers a way on: not found, or an error. Same header and footer as the site pages. */
export function NoticePage({ role, ...notice }: NoticeProps & { role?: 'alert' }) {
  return (
    <div className="site-page">
      <SiteHeader />
      <main id="main-content" className="page-not-found" role={role}>
        <NoticeBody {...notice} />
      </main>
      <Footer />
    </div>
  );
}

/** The same notice inside the reader, which already has its own header, footer and main landmark. */
export function NoticeBlock(notice: NoticeProps) {
  return (
    <div className="page-not-found">
      <NoticeBody {...notice} />
    </div>
  );
}

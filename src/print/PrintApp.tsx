import type { ReactNode } from 'react';
import markMonoUrl from '../../design-system/logo/ptsb-mark-mono.svg';

interface PrintAppProps {
  bookTitle: string;
  documentTitle: string;
  children: ReactNode;
}

/** Document shell inside the print iframe — brand opener + paginated body. */
export function PrintApp({ bookTitle, documentTitle, children }: PrintAppProps) {
  return (
    <div className="print-root">
      <div className="print-flow">
        <header className="print-brand-block">
          <div className="print-brand-wordmark" aria-hidden>
            <img className="print-brand-mark" src={markMonoUrl} alt="" width={22} height={22} />
            <span className="print-brand-name">Smartbook</span>
          </div>
          <hr className="print-brand-rule" />
          <p className="print-brand-book">{bookTitle}</p>
          <h1 className="print-brand-title">{documentTitle}</h1>
        </header>
        {children}
      </div>
    </div>
  );
}

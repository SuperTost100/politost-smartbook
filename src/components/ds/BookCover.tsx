import type { ReactNode } from 'react';
import { subjectLook, type CoverArt } from '../../lib/subjectLook';

/** Line drawings for the covers, in `currentColor` so they follow the cover ink. */
const ART: Record<CoverArt, ReactNode> = {
  fisica: (
    <>
      <path d="M8,104 Q58,-20 112,104" fill="none" stroke="currentColor" strokeWidth="2.2" strokeDasharray="1 6" strokeLinecap="round" />
      <circle cx="60" cy="42" r="6" fill="currentColor" />
      <path d="M60,42 L92,42 M86,37 L92,42 L86,47" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M60,42 L60,72 M55,66 L60,72 L65,66" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity=".6" />
      <path d="M4,104 L116,104" stroke="currentColor" strokeWidth="2.2" />
    </>
  ),
  analisi: (
    <>
      <path d="M30,96 L30,70 C44,40 58,30 72,38 C84,45 90,30 96,22 L96,96 Z" fill="currentColor" opacity=".22" />
      <path d="M8,84 C22,98 26,60 40,52 C56,42 62,40 72,38 C84,35 92,24 112,12" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M6,96 L114,96" stroke="currentColor" strokeWidth="2.2" />
      <path d="M30,96 L30,58 M96,96 L96,20" stroke="currentColor" strokeWidth="1.6" strokeDasharray="3 4" />
    </>
  ),
  chimica: (
    <>
      <path d="M60,22 L93,41 L93,79 L60,98 L27,79 L27,41 Z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M60,32 L84,46 M84,74 L60,88 M36,74 L36,46" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M60,22 L60,6 M93,79 L108,88 M27,79 L12,88" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" opacity=".65" />
      <circle cx="60" cy="6" r="4" fill="currentColor" />
      <circle cx="108" cy="88" r="4" fill="currentColor" />
      <circle cx="12" cy="88" r="4" fill="currentColor" />
    </>
  ),
  geometria: (
    <>
      <path d="M10,30 L110,30 M10,60 L110,60 M10,90 L110,90 M30,10 L30,110 M60,10 L60,110 M90,10 L90,110" stroke="currentColor" strokeWidth="1.2" opacity=".35" />
      <path d="M30,90 L90,60 M84,58 L90,60 L87,66" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30,90 L60,30 M55,34 L60,30 L61,37" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M60,30 L120,0 M90,60 L120,0" stroke="currentColor" strokeWidth="1.6" strokeDasharray="3 4" />
    </>
  ),
  generic: (
    <>
      <path d="M14,40 C34,37 50,40 60,50 C70,40 86,37 106,40" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" opacity=".6" />
      <path d="M14,62 C34,59 50,62 60,72 C70,62 86,59 106,62" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M53,76 L67,76 L67,100 L60,94 L53,100 Z" fill="currentColor" />
    </>
  ),
};

interface BookCoverProps {
  subject: string;
  title: string;
  author?: string;
  /** Shows the ribbon: this is the book being read. */
  reading?: boolean;
  className?: string;
}

/** A matte cover with page edges, the subject, a line drawing and the title. Decorative: the
 * title is always repeated in text next to it. */
export function BookCover({ subject, title, author, reading, className }: BookCoverProps) {
  const { cover, art } = subjectLook(subject);
  return (
    <div className={['sb-cover', `sb-cover-${cover}`, className].filter(Boolean).join(' ')} aria-hidden>
      {reading && <span className="sb-cover-ribbon" />}
      <span className="sb-cover-subject">{subject}</span>
      <svg className="sb-cover-art" viewBox="0 0 120 120" focusable="false">{ART[art]}</svg>
      <span className="sb-cover-title">{title}</span>
      {author && <span className="sb-cover-author">{author}</span>}
    </div>
  );
}

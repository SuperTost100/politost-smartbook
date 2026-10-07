import type { ReactNode } from 'react';
import { Link2 } from 'lucide-react';

interface ParagraphHeadingProps {
  /** chapter.paragraph, e.g. "2.2" */
  number: string;
  /** Paragraph id, target of the TOC, the rail and the hover anchor. */
  id: string;
  children: ReactNode;
}

/** Paragraph heading (h2) with its number and a hover anchor. */
export function ParagraphHeading({ number, id, children }: ParagraphHeadingProps) {
  return (
    <h2 className="sb-phead">
      <span className="sb-phead-num">{number}</span>
      <span>{children}</span>
      <a className="sb-phead-anchor" href={`#${id}`} aria-label={`Link al paragrafo ${number}`}>
        <Link2 size={16} strokeWidth={1.75} aria-hidden />
      </a>
    </h2>
  );
}

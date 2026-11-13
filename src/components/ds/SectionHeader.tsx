import type { ReactNode, Ref } from 'react';

interface SectionHeaderProps {
  title: string;
  /** Small uppercase line above the title (e.g. "Capitolo 2"). */
  eyebrow?: string;
  /** Above the eyebrow, e.g. the chapter picker of the exercises on a phone. */
  lead?: ReactNode;
  /** On the title's line, right-aligned; it wraps under a long title or on a narrow screen. */
  aside?: ReactNode;
  /** Reading facts shown under the title. */
  meta?: ReactNode;
  /** Page actions next to the facts. */
  actions?: ReactNode;
  /** Lets the page move focus to the title after it changes what it shows. */
  titleRef?: Ref<HTMLHeadingElement>;
}

/** Title block of a page inside the reader: eyebrow, h1, facts and actions. */
export function SectionHeader({ title, eyebrow, lead, aside, meta, actions, titleRef }: SectionHeaderProps) {
  const heading = (
    <h1 ref={titleRef} tabIndex={titleRef ? -1 : undefined}>
      {title}
    </h1>
  );
  return (
    <header className="sb-chhead">
      {lead}
      {eyebrow && <span className="sb-eyebrow">{eyebrow}</span>}
      {aside ? (
        <div className="sb-chhead-titleline">
          {heading}
          {aside}
        </div>
      ) : (
        heading
      )}
      {(meta || actions) && (
        <div className="sb-chhead-meta">
          {meta}
          {actions && <div className="sb-chhead-actions no-print">{actions}</div>}
        </div>
      )}
    </header>
  );
}

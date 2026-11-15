import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { AllScope, ChapterIndex, IndexScope } from '../../lib/exerciseNav';

interface IndexTocProps {
  index: ChapterIndex;
  /** Names the nav and its heading, e.g. "Esercizi per capitolo". */
  label: string;
  /** The first entry, for the whole section: "Tutti" or "Tutte". */
  allLabel: string;
  all: AllScope;
  /** The count in words for assistive tech: singular and plural, e.g. ['formula', 'formule']. */
  noun: [string, string];
  scope: IndexScope | null;
  /** Where an entry leads; the exercises keep the chosen difficulty in it. */
  href: (scope: IndexScope) => string;
  onNavigate?: () => void;
}

function Count({ n, noun }: { n: number; noun: [string, string] }) {
  return (
    <span className="sb-toc-count">
      {n}
      <span className="sb-sr"> {n === 1 ? noun[0] : noun[1]}</span>
    </span>
  );
}

/** A section by chapter in the left panel: the whole section first, then each chapter with its count. */
export function IndexToc({ index, label, allLabel, all, noun, scope, href, onNavigate }: IndexTocProps) {
  const ref = useRef<HTMLElement>(null);

  // A long index scrolls inside its panel: keep the current chapter in view.
  useEffect(() => {
    const panel = ref.current;
    const current = panel?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!panel || !current || panel.scrollHeight <= panel.clientHeight) return;
    const { top, bottom } = current.getBoundingClientRect();
    const box = panel.getBoundingClientRect();
    if (top < box.top || bottom > box.bottom) panel.scrollTop += top - box.top - panel.clientHeight / 2;
  }, [scope]);

  return (
    <nav ref={ref} className="sb-toc" aria-label={label}>
      <h2 className="sb-panel-label">{label}</h2>
      <ol>
        <li className="sb-toc-all">
          <Link to={href(all)} className="sb-toc-ch" aria-current={scope === all ? 'page' : undefined} onClick={onNavigate}>
            <span className="sb-toc-title">{allLabel}</span>
            <Count n={index.total} noun={noun} />
          </Link>
        </li>
        {index.entries.map((entry) => {
          const content = (
            <>
              {entry.number != null && <span className="sb-toc-num">{entry.number}</span>}
              <span className="sb-toc-title">{entry.title}</span>
              <Count n={entry.count} noun={noun} />
            </>
          );
          return (
            <li key={entry.scope}>
              {entry.count > 0 ? (
                <Link
                  to={href(entry.scope)}
                  className="sb-toc-ch"
                  aria-current={scope === entry.scope ? 'page' : undefined}
                  onClick={onNavigate}
                >
                  {content}
                </Link>
              ) : (
                <span className="sb-toc-ch" aria-disabled="true">
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

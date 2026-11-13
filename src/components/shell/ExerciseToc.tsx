import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { exerciseSearch, type Difficulty, type ExerciseIndex, type ExerciseScope } from '../../lib/exerciseNav';

interface ExerciseTocProps {
  index: ExerciseIndex;
  basePath: string;
  scope: ExerciseScope | null;
  /** Kept in every link, so the chosen difficulty stays on when the chapter changes. */
  difficulty: Difficulty | null;
  onNavigate?: () => void;
}

function Count({ n }: { n: number }) {
  return (
    <span className="sb-toc-count">
      {n}
      <span className="sb-sr"> {n === 1 ? 'esercizio' : 'esercizi'}</span>
    </span>
  );
}

/** The exercises by chapter in the left panel: "Tutti", then each chapter with its count. */
export function ExerciseToc({ index, basePath, scope, difficulty, onNavigate }: ExerciseTocProps) {
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

  const href = (to: ExerciseScope) => `${basePath}${exerciseSearch(to, difficulty)}`;

  return (
    <nav ref={ref} className="sb-toc" aria-label="Esercizi per capitolo">
      <h2 className="sb-panel-label">Esercizi per capitolo</h2>
      <ol>
        <li className="sb-toc-all">
          <Link to={href('tutti')} className="sb-toc-ch" aria-current={scope === 'tutti' ? 'page' : undefined} onClick={onNavigate}>
            <span className="sb-toc-title">Tutti</span>
            <Count n={index.total} />
          </Link>
        </li>
        {index.entries.map((entry) => {
          const content = (
            <>
              {entry.number != null && <span className="sb-toc-num">{entry.number}</span>}
              <span className="sb-toc-title">{entry.title}</span>
              <Count n={entry.count} />
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

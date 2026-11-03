import { useReaderProgress } from '../../context/ReaderProgressContext';
import { Meter } from '../ds/Meter';

/** Right-hand outline of the chapter's paragraphs, with the current one pressed in and a reading meter. */
export function ParagraphRail() {
  const { paragraphs, activeParagraphId, progress, jumpTo } = useReaderProgress();

  return (
    <aside className="sb-rail" aria-label="Paragrafi del capitolo">
      <h2 className="sb-panel-label">In questo capitolo</h2>
      <ol>
        {paragraphs.map((p) => (
          <li key={p.id}>
            <a
              href={`#${p.id}`}
              aria-current={p.id === activeParagraphId ? 'location' : undefined}
              onClick={(e) => {
                e.preventDefault();
                jumpTo(p.id);
              }}
            >
              <span className="sb-rail-num">{p.number}</span>
              <span>{p.title}</span>
            </a>
          </li>
        ))}
      </ol>
      <div className="sb-rail-progress">
        <Meter value={progress} label="Avanzamento nel capitolo" />
        <span>{progress} %</span>
      </div>
    </aside>
  );
}

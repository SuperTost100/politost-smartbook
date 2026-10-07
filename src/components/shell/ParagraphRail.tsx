import { Anchor, Progress } from 'antd';
import { useReaderProgress } from '../../context/ReaderProgressContext';

/** Right-hand list of the chapter's paragraphs, with the current one marked and a reading meter. */
export function ParagraphRail() {
  const { paragraphs, activeParagraphId, progress, jumpTo } = useReaderProgress();

  return (
    <aside className="sb-rail" aria-label="Paragrafi del capitolo">
      <span className="sb-eyebrow">In questo capitolo</span>
      <Anchor
        targetOffset={88}
        getCurrentAnchor={() => (activeParagraphId ? `#${activeParagraphId}` : '')}
        onClick={(e, link) => {
          e.preventDefault();
          jumpTo(link.href.slice(1));
        }}
        items={paragraphs.map((p) => ({
          key: p.id,
          href: `#${p.id}`,
          title: (
            <span className="sb-rail-item">
              <span className="sb-rail-num">{p.number}</span>
              <span>{p.title}</span>
            </span>
          ),
        }))}
      />
      <Progress percent={progress} size="small" format={(p) => `${p} %`} aria-label="Avanzamento nel capitolo" />
    </aside>
  );
}

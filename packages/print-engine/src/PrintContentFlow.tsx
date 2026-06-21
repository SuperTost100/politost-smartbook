import { Fragment, useMemo, type ReactNode } from 'react';
import type { FormulaRef } from '@politost/content-core';
import {
  parseContentBlocks,
  renderNumberedFormulaHtml,
  type InlineSegment,
} from '@politost/content-core';

interface PrintContentFlowProps {
  content: string;
  formulaIndex?: Map<string, FormulaRef>;
  resolveAsset?: (src: string) => string | undefined;
  chunkPrefix?: string;
}

function PrintChunk({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div className="print-chunk" data-chunk-id={id}>
      {children}
    </div>
  );
}

function PrintFigure({
  src,
  alt,
  caption,
  resolveAsset,
}: {
  src: string;
  alt: string;
  caption?: string;
  resolveAsset?: (src: string) => string | undefined;
}) {
  const url = resolveAsset?.(src);

  if (!url) {
    return (
      <figure className="smartbook-figure smartbook-figure-missing">
        <div className="smartbook-figure-placeholder" role="img" aria-label={alt}>
          Immagine non trovata: {src}
        </div>
        {caption && <figcaption>{caption}</figcaption>}
      </figure>
    );
  }

  return (
    <figure className="smartbook-figure">
      <img src={url} alt={alt} loading="eager" decoding="sync" />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function InlineFlow({
  segments,
  formulaIndex,
}: {
  segments: InlineSegment[];
  formulaIndex?: Map<string, FormulaRef>;
}) {
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return (
            <span
              key={i}
              className="content-flow-inline"
              dangerouslySetInnerHTML={{ __html: seg.html }}
            />
          );
        }

        if (seg.type === 'hover' && formulaIndex) {
          const exists = formulaIndex.has(seg.formulaId);
          const ref = (
            <span className={exists ? 'formula-ref' : 'formula-missing'}>
              ({seg.formulaId})
            </span>
          );
          return (
            <Fragment key={i}>
              {seg.bold ? <strong>{ref}</strong> : ref}
            </Fragment>
          );
        }

        if (seg.type === 'link') {
          const link = (
            <span className="smartbook-ref" data-ref={seg.ref}>
              {seg.label}
            </span>
          );
          return seg.bold ? <strong key={i}>{link}</strong> : <span key={i}>{link}</span>;
        }

        return null;
      })}
    </>
  );
}

/** Print-only content renderer — mirrors viewer ContentFlow variant="print". */
export function PrintContentFlow({
  content,
  formulaIndex,
  resolveAsset,
  chunkPrefix,
}: PrintContentFlowProps) {
  const blocks = useMemo(() => parseContentBlocks(content), [content]);

  const renderBlock = (block: (typeof blocks)[number], i: number) => {
    const chunkId = chunkPrefix ? `${chunkPrefix}-${i}` : String(i);
    const wrap = (node: ReactNode) => <PrintChunk id={chunkId}>{node}</PrintChunk>;

    if (block.type === 'h3') {
      return wrap(
        <h3 className="content-subheading">
          <InlineFlow segments={block.segments} formulaIndex={formulaIndex} />
        </h3>,
      );
    }

    if (block.type === 'p') {
      return wrap(
        <p className="content-paragraph">
          <InlineFlow segments={block.segments} formulaIndex={formulaIndex} />
        </p>,
      );
    }

    if (block.type === 'ul') {
      return wrap(
        <ul className="content-list">
          {block.items.map((item, j) => (
            <li key={j}>
              <InlineFlow segments={item} formulaIndex={formulaIndex} />
            </li>
          ))}
        </ul>,
      );
    }

    if (block.type === 'formula' && formulaIndex) {
      const f = formulaIndex.get(block.formulaId);
      if (f) {
        return wrap(
          <div
            className="numbered-formula"
            data-formula-id={f.id}
            dangerouslySetInnerHTML={{ __html: renderNumberedFormulaHtml(f, 'print') }}
          />,
        );
      }
    }

    if (block.type === 'image') {
      return wrap(
        <PrintFigure
          src={block.src}
          alt={block.alt}
          caption={block.caption}
          resolveAsset={resolveAsset}
        />,
      );
    }

    return null;
  };

  return (
    <div className="content-flow content-flow--print">
      {blocks.map((block, i) => (
        <Fragment key={chunkPrefix ? `${chunkPrefix}-${i}` : i}>
          {renderBlock(block, i)}
        </Fragment>
      ))}
    </div>
  );
}

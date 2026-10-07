import { Fragment, useMemo, type ReactNode } from 'react';
import type { FormulaRef } from '../types/smartbook';
import { parseContentBlocks, type InlineSegment } from '../lib/renderContent';
import { renderNumberedFormulaHtml, type FormulaRenderVariant } from '../lib/formulaRender';
import { FormulaRef as FormulaRefChip } from './ds/FormulaRef';
import { Formula } from './ds/Formula';
import { Figure } from './ds/Figure';
import { SmartbookFigure } from './SmartbookFigure';

export type ContentFlowVariant = FormulaRenderVariant;

interface ContentFlowProps {
  content: string;
  formulaIndex?: Map<string, FormulaRef>;
  resolveAsset?: (src: string) => string | undefined;
  onRefClick?: (e: React.MouseEvent) => void;
  variant?: ContentFlowVariant;
  /** Prefix for print-chunk ids — helps Paged.js break at block boundaries */
  chunkPrefix?: string;
}

function PrintChunk({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div className="print-chunk" data-chunk-id={id}>
      {children}
    </div>
  );
}

function InlineFlow({
  segments,
  formulaIndex,
  variant,
}: {
  segments: InlineSegment[];
  formulaIndex?: Map<string, FormulaRef>;
  variant: ContentFlowVariant;
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
          if (variant === 'print') {
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
          return <FormulaRefChip key={i} formulaId={seg.formulaId} formulas={formulaIndex} />;
        }

        if (seg.type === 'link') {
          if (variant === 'print') {
            const link = (
              <span className="smartbook-ref" data-ref={seg.ref}>
                {seg.label}
              </span>
            );
            return seg.bold ? <strong key={i}>{link}</strong> : <span key={i}>{link}</span>;
          }
          const link = (
            <button type="button" className="smartbook-ref sb-link" data-ref={seg.ref}>
              {seg.label}
            </button>
          );
          return seg.bold ? <strong key={i}>{link}</strong> : <span key={i}>{link}</span>;
        }

        return null;
      })}
    </>
  );
}

/** Renders smartbook text with inline refs, links and block formulas */
export function ContentFlow({
  content,
  formulaIndex,
  resolveAsset,
  onRefClick,
  variant = 'screen',
  chunkPrefix,
}: ContentFlowProps) {
  const blocks = useMemo(() => parseContentBlocks(content), [content]);
  const isPrint = variant === 'print';

  const renderBlock = (block: (typeof blocks)[number], i: number) => {
    const chunkId = chunkPrefix ? `${chunkPrefix}-${i}` : String(i);
    const wrap = (node: ReactNode) =>
      isPrint ? <PrintChunk id={chunkId}>{node}</PrintChunk> : node;

    if (block.type === 'h3') {
      return wrap(
        <h3 className="content-subheading">
          <InlineFlow segments={block.segments} formulaIndex={formulaIndex} variant={variant} />
        </h3>,
      );
    }

    if (block.type === 'p') {
      return wrap(
        <p className="content-paragraph">
          <InlineFlow segments={block.segments} formulaIndex={formulaIndex} variant={variant} />
        </p>,
      );
    }

    if (block.type === 'ul') {
      return wrap(
        <ul className="content-list">
          {block.items.map((item, j) => (
            <li key={j}>
              <InlineFlow segments={item} formulaIndex={formulaIndex} variant={variant} />
            </li>
          ))}
        </ul>,
      );
    }

    if (block.type === 'formula') {
      const f = formulaIndex?.get(block.formulaId);
      if (f) {
        if (!isPrint) return <Formula formula={f} />;
        return wrap(
          <div
            className="numbered-formula"
            data-formula-id={f.id}
            dangerouslySetInnerHTML={{ __html: renderNumberedFormulaHtml(f, variant) }}
          />,
        );
      }
      return wrap(
        <p className="formula-missing" data-formula-id={block.formulaId}>
          Formula ({block.formulaId}) non disponibile
        </p>,
      );
    }

    if (block.type === 'image') {
      if (!isPrint) {
        return <Figure src={block.src} alt={block.alt} caption={block.caption} resolveAsset={resolveAsset} />;
      }
      return wrap(
        <SmartbookFigure
          src={block.src}
          alt={block.alt}
          caption={block.caption}
          resolveAsset={resolveAsset}
          decoding={isPrint ? 'sync' : 'async'}
        />,
      );
    }

    return null;
  };

  if (isPrint) {
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

  return (
    <div className="content-flow sb-prose" onClick={onRefClick}>
      {blocks.map((block, i) => (
        <Fragment key={i}>{renderBlock(block, i)}</Fragment>
      ))}
    </div>
  );
}

import { Fragment, useMemo } from 'react';
import type { FormulaRef } from '../types/smartbook';
import { parseContentBlocks, type ContentBlock, type InlineSegment } from '../lib/renderContent';
import { renderNumberedFormulaHtml, type FormulaRenderVariant } from '../lib/formulaRender';
import { refLabel } from '../lib/chapterNav';
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
}

interface RenderContext {
  formulaIndex?: Map<string, FormulaRef>;
  resolveAsset?: (src: string) => string | undefined;
  variant: ContentFlowVariant;
}

function InlineFlow({ segments, ctx }: { segments: InlineSegment[]; ctx: RenderContext }) {
  const isPrint = ctx.variant === 'print';
  return (
    <>
      {segments.map((seg, i) => {
        switch (seg.type) {
          case 'text':
            return (
              <span key={i} className="content-flow-inline" dangerouslySetInnerHTML={{ __html: seg.html }} />
            );
          case 'strong':
            return <strong key={i}><InlineFlow segments={seg.children} ctx={ctx} /></strong>;
          case 'em':
            return <em key={i}><InlineFlow segments={seg.children} ctx={ctx} /></em>;
          case 'anchor':
            return seg.href && !isPrint ? (
              <a key={i} href={seg.href} target="_blank" rel="noopener noreferrer">
                <InlineFlow segments={seg.children} ctx={ctx} />
              </a>
            ) : (
              <InlineFlow key={i} segments={seg.children} ctx={ctx} />
            );
          case 'hover': {
            if (!ctx.formulaIndex) return <Fragment key={i}>({seg.formulaId})</Fragment>;
            if (isPrint) {
              const exists = ctx.formulaIndex.has(seg.formulaId);
              return (
                <span key={i} className={exists ? 'formula-ref' : 'formula-missing'}>
                  ({seg.formulaId})
                </span>
              );
            }
            return <FormulaRefChip key={i} formulaId={seg.formulaId} formulas={ctx.formulaIndex} />;
          }
          case 'link':
            return isPrint ? (
              <span key={i} className="smartbook-ref" data-ref={seg.ref}>
                <InlineFlow segments={seg.children} ctx={ctx} />
                <span className="smartbook-ref-target"> {refLabel(seg.ref)}</span>
              </span>
            ) : (
              <button key={i} type="button" className="smartbook-ref sb-link" data-ref={seg.ref}>
                <InlineFlow segments={seg.children} ctx={ctx} />
              </button>
            );
        }
      })}
    </>
  );
}

function Blocks({ blocks, ctx }: { blocks: ContentBlock[]; ctx: RenderContext }) {
  return blocks.map((block, i) => <Fragment key={i}>{renderBlock(block, ctx)}</Fragment>);
}

function renderBlock(block: ContentBlock, ctx: RenderContext) {
  const isPrint = ctx.variant === 'print';

  switch (block.type) {
    case 'heading': {
      const Tag = block.level === 4 ? 'h4' : 'h3';
      return (
        <Tag className="content-subheading">
          <InlineFlow segments={block.segments} ctx={ctx} />
        </Tag>
      );
    }
    case 'p':
      return block.tight ? (
        <InlineFlow segments={block.segments} ctx={ctx} />
      ) : (
        <p className="content-paragraph">
          <InlineFlow segments={block.segments} ctx={ctx} />
        </p>
      );
    case 'math':
      return <div className="content-math" dangerouslySetInnerHTML={{ __html: block.html }} />;
    case 'list': {
      const items = block.items.map((item, j) => (
        <li key={j}>
          <Blocks blocks={item} ctx={ctx} />
        </li>
      ));
      return block.ordered ? (
        <ol className="content-list" start={block.start === 1 ? undefined : block.start}>{items}</ol>
      ) : (
        <ul className="content-list">{items}</ul>
      );
    }
    case 'quote':
      return (
        <blockquote className="content-quote">
          <Blocks blocks={block.blocks} ctx={ctx} />
        </blockquote>
      );
    case 'code':
      return (
        <pre className="content-code">
          <code>{block.text}</code>
        </pre>
      );
    case 'hr':
      return <hr className="content-rule" />;
    case 'formula': {
      const f = ctx.formulaIndex?.get(block.formulaId);
      if (!f) {
        return (
          <p className="formula-missing" data-formula-id={block.formulaId}>
            Formula ({block.formulaId}) non disponibile
          </p>
        );
      }
      if (!isPrint) return <Formula formula={f} />;
      return (
        <div
          className="numbered-formula"
          data-formula-id={f.id}
          dangerouslySetInnerHTML={{ __html: renderNumberedFormulaHtml(f, ctx.variant) }}
        />
      );
    }
    case 'image':
      if (!isPrint) {
        return <Figure src={block.src} alt={block.alt} caption={block.caption} resolveAsset={ctx.resolveAsset} />;
      }
      return (
        <SmartbookFigure
          src={block.src}
          alt={block.alt}
          caption={block.caption}
          resolveAsset={ctx.resolveAsset}
          decoding="sync"
        />
      );
  }
}

/** Renders smartbook text with inline refs, links and block formulas */
export function ContentFlow({
  content,
  formulaIndex,
  resolveAsset,
  onRefClick,
  variant = 'screen',
}: ContentFlowProps) {
  const blocks = useMemo(() => parseContentBlocks(content), [content]);
  const ctx: RenderContext = { formulaIndex, resolveAsset, variant };

  return (
    <div
      className={`content-flow${variant === 'print' ? ' content-flow--print' : ' sb-prose'}`}
      onClick={variant === 'print' ? undefined : onRefClick}
    >
      <Blocks blocks={blocks} ctx={ctx} />
    </div>
  );
}

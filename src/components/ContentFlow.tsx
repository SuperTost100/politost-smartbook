import { Fragment, memo, useId, useMemo, useRef } from 'react';
import { ChevronDown, Landmark, ListChecks, MessageSquareText, Pencil, Tag, TriangleAlert } from 'lucide-react';
import type { FormulaRef } from '../types/smartbook';
import type { BoxBlock, BoxName, ContentBlock, InlineSegment } from '../lib/renderContent';
import { boxElementId, boxIsShort, boxTitleKey, boxTone, boxWord, labelRepeatsTitle } from '../lib/boxes';
import { cachedContentBlocks } from '../lib/contentBlocksCache';
import { renderNumberedFormulaHtml, type FormulaRenderVariant } from '../lib/formulaRender';
import { refLabel } from '../lib/chapterNav';
import { glueMathPunctuation } from '../lib/mathGlue';
import { useScrollableMath } from '../hooks/useScrollableMath';
import { withoutMathml } from '../print/printMath';
import { FormulaRef as FormulaRefChip } from './ds/FormulaRef';
import { Formula } from './ds/Formula';
import { Figure } from './ds/Figure';
import { SmartbookFigure } from './SmartbookFigure';

export type ContentFlowVariant = FormulaRenderVariant;

/**
 * How definitions, theorems and the other boxes look. `tinted` is chapter text: definitions and
 * theorems in a tinted box, the other kinds with a line beside them. `flat` draws every kind with
 * the line, for text inside a card (exercises, hints, solutions), where the format allows no boxes
 * but a file can still have them.
 */
export type BoxStyle = 'tinted' | 'flat';

interface ContentFlowProps {
  content: string;
  formulaIndex?: Map<string, FormulaRef>;
  resolveAsset?: (src: string) => string | undefined;
  onRefClick?: (e: React.MouseEvent) => void;
  variant?: ContentFlowVariant;
  boxStyle?: BoxStyle;
}

interface RenderContext {
  formulaIndex?: Map<string, FormulaRef>;
  resolveAsset?: (src: string) => string | undefined;
  variant: ContentFlowVariant;
  boxStyle: BoxStyle;
  /** Inside a box with a title: the title as boxTitleKey gives it, so a formula label repeating it is hidden. */
  boxTitle?: string;
}

function InlineFlow({ segments, ctx }: { segments: InlineSegment[]; ctx: RenderContext }) {
  const isPrint = ctx.variant === 'print';
  return (
    <>
      {segments.map((seg, i) => {
        switch (seg.type) {
          case 'text':
            return (
              <span
                key={i}
                className="content-flow-inline"
                dangerouslySetInnerHTML={{ __html: glueMathPunctuation(isPrint ? withoutMathml(seg.html) : seg.html) }}
              />
            );
          case 'strong':
            return <strong key={i}><InlineFlow segments={seg.children} ctx={ctx} /></strong>;
          case 'em':
            return <em key={i}><InlineFlow segments={seg.children} ctx={ctx} /></em>;
          case 'anchor':
            // In print only web addresses stay links: a PDF has nowhere to open a relative one.
            return seg.href && (!isPrint || /^https?:\/\//i.test(seg.href)) ? (
              <a key={i} href={seg.href} target="_blank" rel="noopener noreferrer">
                <InlineFlow segments={seg.children} ctx={ctx} />
              </a>
            ) : (
              <InlineFlow key={i} segments={seg.children} ctx={ctx} />
            );
          case 'hover': {
            if (!ctx.formulaIndex) return <Fragment key={i}>({seg.formulaId})</Fragment>;
            if (isPrint) {
              // linkPrintRefs adds the href once it knows which chapters the document prints.
              return ctx.formulaIndex.has(seg.formulaId) ? (
                <a key={i} className="formula-ref" data-print-ref={`formula/${seg.formulaId}`}>
                  ({seg.formulaId})
                </a>
              ) : (
                <span key={i} className="formula-missing">
                  ({seg.formulaId})
                </span>
              );
            }
            return <FormulaRefChip key={i} formulaId={seg.formulaId} formulas={ctx.formulaIndex} />;
          }
          case 'link':
            return isPrint ? (
              <a key={i} className="smartbook-ref" data-print-ref={seg.ref}>
                <InlineFlow segments={seg.children} ctx={ctx} />
                <span className="smartbook-ref-target"> {refLabel(seg.ref)}</span>
              </a>
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

/** Each numbered formula's print HTML, kept while the book is loaded, so a part renders again without KaTeX. */
const numberedHtml = new WeakMap<FormulaRef, string>();
/** The same without the label, for a formula inside a box whose title is that label. */
const numberedHtmlUnlabelled = new WeakMap<FormulaRef, string>();

function printedFormulaHtml(f: FormulaRef, variant: ContentFlowVariant, label = true): string {
  const cache = label ? numberedHtml : numberedHtmlUnlabelled;
  let html = cache.get(f);
  if (html === undefined) {
    cache.set(f, (html = withoutMathml(renderNumberedFormulaHtml(label ? f : { ...f, label: '' }, variant))));
  }
  return html;
}

const BOX_ICONS: Record<BoxName, typeof Tag> = {
  definition: Tag,
  theorem: Landmark,
  proof: ListChecks,
  example: Pencil,
  mistake: TriangleAlert,
  remark: MessageSquareText,
};

/** "Teorema 1.2 · di Weierstrass": icon, word and number in the interface sans, then the name in italic serif. */
function BoxLabel({ block, title, labelId, ctx }: {
  block: Pick<BoxBlock, 'box' | 'kind' | 'id'>;
  title?: InlineSegment[];
  labelId?: string;
  ctx: RenderContext;
}) {
  const Icon = BOX_ICONS[block.box];
  // The spaces between the spans are text, so the accessible name reads "Teorema 1.2 di Weierstrass".
  return (
    <div className="sb-box-head" id={labelId}>
      <span className="sb-box-label">
        <Icon className="sb-box-icon" size={15} strokeWidth={1.75} aria-hidden />
        {boxWord(block)}
        {block.id && <> <span className="sb-box-num">{block.id}</span></>}
      </span>
      {title && title.length > 0 && (
        <>
          {' '}<span className="sb-box-sep" aria-hidden="true">·</span>{' '}
          <span className="sb-box-name"><InlineFlow segments={title} ctx={ctx} /></span>
        </>
      )}
    </div>
  );
}

/**
 * A proof under its theorem. On screen it is a <details>, open at first: the browser keeps it open
 * or closed, so it needs no state, and find in page opens a closed one at a match. Print has no
 * control and every proof open.
 */
function BoxProofView({ proof, ctx }: { proof: NonNullable<BoxBlock['proof']>; ctx: RenderContext }) {
  const isPrint = ctx.variant === 'print';
  const short = isPrint && boxIsShort(proof.blocks);
  const body = (
    <div className="sb-box-proof-body">
      <Blocks blocks={proof.blocks} ctx={ctx} />
    </div>
  );
  if (isPrint) {
    return (
      <div className={`sb-box-proof${short ? ' is-short' : ''}`}>
        <BoxLabel block={{ box: 'proof' }} title={proof.title} ctx={ctx} />
        {body}
      </div>
    );
  }
  return (
    <details className="sb-box-proof" open>
      <summary className="sb-box-proof-toggle">
        <ListChecks className="sb-box-icon" size={15} strokeWidth={1.75} aria-hidden />
        <span className="sb-box-word">Dimostrazione</span>
        {proof.title && proof.title.length > 0 && (
          <>
            {' '}<span className="sb-box-proof-qual"><InlineFlow segments={proof.title} ctx={ctx} /></span>
          </>
        )}
        {/* The state is announced with the summary; this only shows it. */}
        <span className="sb-box-proof-act" aria-hidden="true">
          <span className="sb-box-proof-act-open">Nascondi</span>
          <span className="sb-box-proof-act-closed">Mostra</span>
        </span>
        <ChevronDown className="sb-box-chev" size={16} strokeWidth={1.75} aria-hidden />
      </summary>
      {body}
    </details>
  );
}

/**
 * A definition, theorem, proof, example, typical mistake or remark. A group named by its label, so a
 * screen reader announces "Teorema 1.2 di Weierstrass" on entering it. The label is not a heading:
 * a paragraph can hold six definitions, which would crowd the headings list and skip levels where a
 * box sits right under the paragraph title.
 */
function BoxView({ block, ctx }: { block: BoxBlock; ctx: RenderContext }) {
  const labelId = useId();
  const titleKey = boxTitleKey(block.title);
  const inner = useMemo(() => ({ ...ctx, boxTitle: titleKey }), [ctx, titleKey]);
  const tone = boxTone(block);
  const tinted = ctx.boxStyle === 'tinted' && (tone === 'definition' || tone === 'theorem');
  const short = ctx.variant === 'print' && boxIsShort(block.blocks);
  const className = [
    'sb-box',
    tinted ? 'sb-box--tinted' : 'sb-box--line',
    ctx.boxStyle === 'flat' && 'sb-box--flat',
    block.proof && 'has-proof',
  ].filter(Boolean).join(' ');
  return (
    <div
      className={className}
      data-box={block.box}
      data-tone={tone}
      // Ids only in chapter text: the same number can come back in a card, which the format forbids anyway.
      id={ctx.boxStyle === 'tinted' ? boxElementId(block) : undefined}
      role="group"
      aria-labelledby={labelId}
    >
      <div className={`sb-box-main${short ? ' is-short' : ''}`}>
        <BoxLabel block={block} title={block.title} labelId={labelId} ctx={inner} />
        <div className="sb-box-body">
          <Blocks blocks={block.blocks} ctx={inner} />
        </div>
      </div>
      {block.proof && <BoxProofView proof={block.proof} ctx={ctx} />}
    </div>
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
      return <div className="content-math" dangerouslySetInnerHTML={{ __html: isPrint ? withoutMathml(block.html) : block.html }} />;
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
      const showLabel = !labelRepeatsTitle(f.label, ctx.boxTitle);
      if (!isPrint) return <Formula formula={f} showLabel={showLabel} />;
      return (
        <div
          className="numbered-formula"
          data-formula-id={f.id}
          data-formula-chapter={f.chapter}
          dangerouslySetInnerHTML={{ __html: printedFormulaHtml(f, ctx.variant, showLabel) }}
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
    case 'box':
      return <BoxView block={block} ctx={ctx} />;
  }
}

/**
 * Renders smartbook text with inline refs, links and block formulas. Memoized, because a chapter
 * re-renders whenever the active paragraph changes and its paragraphs' props stay the same.
 */
export const ContentFlow = memo(function ContentFlow({
  content,
  formulaIndex,
  resolveAsset,
  onRefClick,
  variant = 'screen',
  boxStyle = 'flat',
}: ContentFlowProps) {
  const blocks = useMemo(() => cachedContentBlocks(content), [content]);
  // One object per set of props, so the boxes' own contexts (BoxView) stay the same between renders.
  const ctx = useMemo<RenderContext>(
    () => ({ formulaIndex, resolveAsset, variant, boxStyle }),
    [formulaIndex, resolveAsset, variant, boxStyle],
  );
  const rootRef = useRef<HTMLDivElement>(null);
  useScrollableMath(rootRef, variant !== 'print');

  return (
    <div
      ref={rootRef}
      className={`content-flow${variant === 'print' ? ' content-flow--print' : ' sb-prose'}`}
      onClick={variant === 'print' ? undefined : onRefClick}
    >
      <Blocks blocks={blocks} ctx={ctx} />
    </div>
  );
});

import { memo } from 'react';
import type { Chapter, FormulaRef } from '../../types/smartbook';
import { renderFormulaHtml } from '../../lib/formulaRender';
import { useMathTrusted } from '../../context/MathTrustContext';
import { printIds } from '../../lib/printLinks';
import { printFormulaHtml, usePrintMathml, type PrintMathml } from '../formulaMode';

interface PrintFormularioProps {
  chapters: Chapter[];
  /** False when the document prints one chapter and its title names it already. */
  headings?: boolean;
}

/**
 * Each formula's HTML, kept while the book is loaded, so the formula sheet renders again without
 * KaTeX. One map per `mathTrusted`, so trusted HTML is never served where it was not asked for, and
 * one per mode (KaTeX or fast print's MathML).
 */
const cardHtml = {
  katex: { trusted: new WeakMap<FormulaRef, string>(), sanitized: new WeakMap<FormulaRef, string>() },
  mathml: { trusted: new WeakMap<FormulaRef, string>(), sanitized: new WeakMap<FormulaRef, string>() },
};

function formulaHtml(f: FormulaRef, mathTrusted: boolean, mathml: PrintMathml | null): string {
  const byTrust = mathml ? cardHtml.mathml : cardHtml.katex;
  const cache = mathTrusted ? byTrust.trusted : byTrust.sanitized;
  let html = cache.get(f);
  if (html === undefined) cache.set(f, (html = printFormulaHtml(renderFormulaHtml(f.latex, { mathTrusted }), mathml)));
  return html;
}

/**
 * One chapter of the formula sheet. Each chapter renders on its own, so React can let the page
 * answer input between two chapters.
 */
const FormularioChapter = memo(function FormularioChapter({ chapter, heading }: { chapter: Chapter; heading: boolean }) {
  const mathTrusted = useMathTrusted();
  const mathml = usePrintMathml();
  return (
    <section className="formulario-chapter" data-print-chapter={chapter.meta.id}>
      {heading && (
        <h3>
          Capitolo {chapter.meta.number}. {chapter.meta.title}
        </h3>
      )}
      {chapter.formulas.length === 0 ? (
        <p className="empty-note">Nessuna formula in questo capitolo.</p>
      ) : (
        <div className="formula-grid">
          {chapter.formulas.map((f) => (
            <div key={f.id} className="formulario-card" id={printIds.formulaCard(f.id)}>
              <div className="formulario-card-header">
                <span className="formula-num">({f.id})</span>
                <span className="formula-label">{f.label}</span>
              </div>
              <div className="formulario-card-body" dangerouslySetInnerHTML={{ __html: formulaHtml(f, mathTrusted, mathml) }} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
});

/** Cards print two to a row; fitWideFormulas lets a wide formula's card span the row. */
export function PrintFormulario({ chapters, headings = true }: PrintFormularioProps) {
  return (
    <div>
      {chapters.map((ch) => (
        <FormularioChapter key={ch.meta.id} chapter={ch} heading={headings} />
      ))}
    </div>
  );
}

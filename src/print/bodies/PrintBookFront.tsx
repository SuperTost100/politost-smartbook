import type { SmartbookConfig } from '../../types/smartbook';
import { PrintBrand } from '../PrintDocument';
import type { BookPlan } from '../parts';
import { hrefTo, printIds } from '../../lib/printLinks';

/** The cover of the whole book: subject, title, authors and version, then what the document contains. */
export function PrintCover({ config, contents }: { config: SmartbookConfig; contents: string }) {
  const authors = config.authors?.filter(Boolean) ?? [];
  return (
    <section className="print-cover">
      <PrintBrand />
      <div className="print-cover-main">
        {config.subject && <p className="print-cover-subject">{config.subject}</p>}
        <h1 className="print-cover-title">{config.title}</h1>
        {authors.length > 0 && <p className="print-cover-authors">{authors.join(', ')}</p>}
        {config.version && <p className="print-cover-meta">Versione {config.version}</p>}
      </div>
      <p className="print-cover-contents">{contents}</p>
    </section>
  );
}

/**
 * What the document contains, in order, each entry a link to its part. No page numbers: the browser
 * paginates after the app has rendered.
 */
export function PrintIndex({ plan, otherTitle }: { plan: BookPlan; otherTitle: string }) {
  return (
    <section>
      <h2 className="print-h2">Indice</h2>
      <ol className="print-index">
        {plan.chapters.map((c) => {
          const count = plan.exercises?.get(c.meta.number)?.length ?? 0;
          return (
            <li key={c.meta.id}>
              <a className="print-index-row" href={hrefTo(printIds.chapter(c.meta.number))}>
                <span className="print-index-n">{c.meta.number}</span>
                <span>{c.meta.title}</span>
              </a>
              {count > 0 && (
                <a className="print-index-sub" href={hrefTo(printIds.chapterExercises(c.meta.number))}>
                  Esercizi del capitolo {c.meta.number} · {count}
                </a>
              )}
            </li>
          );
        })}
        {plan.other.length > 0 && <IndexAppendix title={otherTitle} target={printIds.otherExercises} />}
        {plan.formulario && <IndexAppendix title="Formulario" target={printIds.formulario} />}
        {plan.exams && <IndexAppendix title="Prove d'esame" target={printIds.exams} />}
      </ol>
    </section>
  );
}

function IndexAppendix({ title, target }: { title: string; target: string }) {
  return (
    <li>
      <a className="print-index-row print-index-appendix" href={hrefTo(target)}>
        <span className="print-index-n" />
        <span>{title}</span>
      </a>
    </li>
  );
}

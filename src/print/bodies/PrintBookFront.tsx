import type { SmartbookConfig } from '../../types/smartbook';
import { PrintBrand } from '../PrintDocument';
import type { BookPlan } from '../parts';

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

/** What the document contains, in order. No page numbers: the browser paginates after the app has rendered. */
export function PrintIndex({ plan, otherTitle }: { plan: BookPlan; otherTitle: string }) {
  return (
    <section>
      <h2 className="print-h2">Indice</h2>
      <ol className="print-index">
        {plan.chapters.map((c) => {
          const count = plan.exercises?.get(c.meta.number)?.length ?? 0;
          return (
            <li key={c.meta.id}>
              <div className="print-index-row">
                <span className="print-index-n">{c.meta.number}</span>
                <span>{c.meta.title}</span>
              </div>
              {count > 0 && <div className="print-index-sub">Esercizi del capitolo {c.meta.number} · {count}</div>}
            </li>
          );
        })}
        {plan.other.length > 0 && <IndexAppendix title={otherTitle} />}
        {plan.formulario && <IndexAppendix title="Formulario" />}
        {plan.exams && <IndexAppendix title="Prove d'esame" />}
      </ol>
    </section>
  );
}

function IndexAppendix({ title }: { title: string }) {
  return (
    <li>
      <div className="print-index-row print-index-appendix">
        <span className="print-index-n" />
        <span>{title}</span>
      </div>
    </li>
  );
}

import { useEffect, useId, type ReactNode } from 'react';
import { Drawer } from 'antd';
import { plural } from '../lib/exerciseNav';
import { EXERCISE_LIMITS, type ExerciseLimit, type PrintOptions } from '../lib/printOptions';

export type PrintPanelKind = 'capitolo' | 'libro' | 'esercizi' | 'esami';

export interface PrintPanelCounts {
  /** Exercises of the chosen chapters, all of them. */
  exercises: number;
  /** Exercises the limit leaves. */
  exercisesPrinted: number;
  formulas: number;
  exams: number;
}

export interface PrintOptionsFormProps {
  kind: PrintPanelKind;
  options: PrintOptions;
  onChange: (next: PrintOptions) => void;
  /** Switches between "Questo capitolo" and "Tutto il libro"; unset for books printed one chapter at a time. */
  onScopeChange?: (scope: 'capitolo' | 'libro') => void;
  /** The scope just chosen, while its preview opens: the other options wait for it. */
  pendingScope?: 'capitolo' | 'libro';
  /** The printable chapters, for the whole book's checklist. */
  chapters: { number: number; title: string }[];
  /** The chapter the preview was opened from, for "Questo capitolo". */
  currentChapter?: { number: number; title: string };
  counts: PrintPanelCounts;
}

export interface PrintSummaryText {
  main: string;
  sub: string;
  empty?: boolean;
}

const LIMIT_LABEL: Record<string, string> = { tutti: 'Tutti' };

function Toggle({
  label,
  note,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  note?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <button
      type="button"
      role="switch"
      className="print-toggle"
      aria-checked={checked}
      aria-labelledby={`${id}-label`}
      aria-describedby={note ? `${id}-note` : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="print-toggle-text">
        <span id={`${id}-label`}>{label}</span>
        {note && <small id={`${id}-note`}>{note}</small>}
      </span>
      <span className="print-switch" aria-hidden />
    </button>
  );
}

function Choice<T extends string | number>({
  label,
  value,
  items,
  onChange,
  className,
}: {
  label: string;
  value: T;
  items: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={`sb-tabs${className ? ` ${className}` : ''}`} role="group" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          className="sb-tab"
          aria-pressed={item.value === value}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function PrintOptionsForm({ kind, options, onChange, onScopeChange, pendingScope, chapters, currentChapter, counts }: PrintOptionsFormProps) {
  const set = (patch: Partial<PrintOptions>) => onChange({ ...options, ...patch });
  const isBook = kind === 'libro';
  const hasScope = (kind === 'capitolo' || isBook) && onScopeChange;
  const exerciseList = kind === 'esercizi' || kind === 'esami';
  const allChapters = options.chapters.length === chapters.length;
  const limitId = useId();

  const toggleChapter = (n: number, on: boolean) => {
    const next = on ? [...options.chapters, n] : options.chapters.filter((c) => c !== n);
    set({ chapters: chapters.map((c) => c.number).filter((c) => next.includes(c)) });
  };

  const exercisesNote =
    counts.exercises === 0
      ? 'Nessun esercizio nei capitoli scelti'
      : options.exercises != null && counts.exercisesPrinted < counts.exercises
        ? `${counts.exercisesPrinted} di ${plural(counts.exercises, 'esercizio', 'esercizi')}`
        : plural(counts.exercises, 'esercizio', 'esercizi');
  const solutionsOff = !exerciseList && options.exercises == null && !(isBook && options.exams);

  return (
    <div className="print-options" aria-busy={pendingScope != null}>
      {hasScope && (
        <fieldset>
          <legend>Cosa stampare</legend>
          <Choice
            label="Cosa stampare"
            value={pendingScope ?? kind}
            items={[
              { value: 'capitolo', label: 'Questo capitolo' },
              { value: 'libro', label: 'Tutto il libro' },
            ]}
            onChange={(scope) => {
              if (scope !== (pendingScope ?? kind)) onScopeChange(scope as 'capitolo' | 'libro');
            }}
          />
          <p className="print-options-note">
            {isBook
              ? 'Copertina, indice e ogni capitolo su una pagina nuova.'
              : currentChapter && `Capitolo ${currentChapter.number} · ${currentChapter.title}`}
          </p>
        </fieldset>
      )}

      <fieldset className="print-options-rest" disabled={pendingScope != null}>
      {isBook && (
        <fieldset>
          <div className="print-options-legend-row">
            <legend className="print-options-legend">
              Capitoli · {options.chapters.length} di {chapters.length}
            </legend>
            <button
              type="button"
              className="print-options-link"
              onClick={() => set({ chapters: allChapters ? [] : chapters.map((c) => c.number) })}
            >
              {allChapters ? 'Deseleziona tutti' : 'Seleziona tutti'}
            </button>
          </div>
          <ul className="print-chapter-list">
            {chapters.map((c) => (
              <li key={c.number}>
                <label>
                  <input
                    type="checkbox"
                    className="print-checkbox"
                    checked={options.chapters.includes(c.number)}
                    onChange={(e) => toggleChapter(c.number, e.target.checked)}
                  />
                  <span className="print-chapter-n">{c.number}</span>
                  <span className="print-chapter-t">{c.title}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      {!exerciseList && (
        <fieldset>
          <legend>Contenuto</legend>
          <div className="print-toggles">
            <Toggle
              label={isBook ? 'Esercizi alla fine di ogni capitolo' : 'Esercizi alla fine del capitolo'}
              note={exercisesNote}
              checked={options.exercises != null}
              disabled={counts.exercises === 0 && options.exercises == null}
              onChange={(on) => set({ exercises: on ? 'tutti' : null })}
            />
            {options.exercises != null && (
              <div className="print-limit">
                <span className="print-options-legend" id={limitId}>
                  Quanti per capitolo
                </span>
                <LimitChoice labelledBy={limitId} value={options.exercises} onChange={(exercises) => set({ exercises })} />
                <p className="print-options-hint">
                  {options.exercises === 'tutti'
                    ? isBook
                      ? 'Tutti gli esercizi del libro.'
                      : 'Tutti gli esercizi del capitolo.'
                    : 'Scelti tra facili, medi e difficili, sempre gli stessi. Un capitolo con meno esercizi li stampa tutti.'}
                </p>
              </div>
            )}
            {isBook && (
              <>
                <Toggle
                  label="Formulario in fondo"
                  note={plural(counts.formulas, 'formula', 'formule')}
                  checked={options.formulario}
                  onChange={(formulario) => set({ formulario })}
                />
                <Toggle
                  label="Prove d'esame in fondo"
                  note={counts.exams === 0 ? "Nessuna prova d'esame nel libro" : plural(counts.exams, 'prova', 'prove')}
                  checked={options.exams}
                  disabled={counts.exams === 0 && !options.exams}
                  onChange={(exams) => set({ exams })}
                />
              </>
            )}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend>Soluzioni</legend>
        <div className="print-toggles">
          <Toggle
            label="Soluzioni"
            note={
              solutionsOff
                ? isBook
                  ? "Attiva gli esercizi o le prove d'esame per sceglierlo."
                  : 'Attiva gli esercizi per sceglierlo.'
                : kind === 'esami'
                  ? "In fondo alle prove d'esame"
                  : kind === 'esercizi'
                    ? 'In fondo agli esercizi'
                    : isBook
                      ? "In fondo agli esercizi di ogni capitolo e alle prove d'esame"
                      : 'In fondo agli esercizi del capitolo'
            }
            checked={options.solutions}
            disabled={solutionsOff}
            onChange={(solutions) => set({ solutions })}
          />
        </div>
      </fieldset>
      </fieldset>
    </div>
  );
}

function LimitChoice({
  labelledBy,
  value,
  onChange,
}: {
  labelledBy: string;
  value: ExerciseLimit;
  onChange: (value: ExerciseLimit) => void;
}) {
  return (
    <div className="sb-tabs print-limit-tabs" role="group" aria-labelledby={labelledBy}>
      {EXERCISE_LIMITS.map((limit) => (
        <button key={limit} type="button" className="sb-tab" aria-pressed={limit === value} onClick={() => onChange(limit)}>
          {LIMIT_LABEL[limit] ?? String(limit)}
        </button>
      ))}
    </div>
  );
}

export function PrintSummary({ summary }: { summary: PrintSummaryText }) {
  return (
    <p className={`print-summary${summary.empty ? ' is-empty' : ''}`} role="status">
      <span className="print-summary-label">Il documento contiene</span>
      <span className="print-summary-main">{summary.main}</span>
      {summary.sub && <span className="print-summary-sub">{summary.sub}</span>}
    </p>
  );
}

/** The options next to the sheet on wide screens. */
export function PrintOptionsAside({ summary, children }: { summary: PrintSummaryText; children: ReactNode }) {
  const titleId = useId();
  return (
    <aside className="print-panel no-print" aria-labelledby={titleId}>
      <h2 id={titleId}>Opzioni di stampa</h2>
      <PrintSummary summary={summary} />
      {children}
    </aside>
  );
}

/** The same options in a bottom sheet below 1024px, opened from "Opzioni" in the toolbar. */
export function PrintOptionsSheet({
  open,
  onClose,
  summary,
  children,
}: {
  open: boolean;
  onClose: () => void;
  summary: PrintSummaryText;
  children: ReactNode;
}) {
  // antd's trap lets Tab reach the page body between the last control and the first: wrap it instead.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const dialog = document.querySelector<HTMLElement>('.print-options-sheet[role="dialog"]');
      if (!dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href]')].filter(
        (el) => el.offsetParent !== null,
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const inside = dialog.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      afterOpenChange={(visible) => {
        // Start inside the dialog, so screen readers announce its title.
        const dialog = document.querySelector<HTMLElement>('.print-options-sheet[role="dialog"]');
        if (!visible || !dialog) return;
        dialog.tabIndex = -1;
        dialog.focus();
      }}
      placement="bottom"
      size="auto"
      title="Opzioni di stampa"
      closable={{ placement: 'end', 'aria-label': 'Chiudi' }}
      className="print-options-sheet no-print"
      rootClassName="no-print"
      footer={
        <div className="print-options-sheet-foot">
          <PrintSummary summary={summary} />
          <button type="button" className="sb-btn sb-btn-primary sb-btn-block" onClick={onClose}>
            Mostra anteprima
          </button>
        </div>
      }
    >
      {children}
    </Drawer>
  );
}

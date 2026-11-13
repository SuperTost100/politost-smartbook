import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { useCloudChapter } from '../hooks/useCloudChapter';
import { usePrintShortcut } from '../hooks/usePrintShortcut';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { isCloudBook, loadSmartbook } from '../lib/loader';
import { resolveBookAsset } from '../lib/cloudAssets';
import { withLoadedChapter } from '../lib/chapterNav';
import { buildFormulaIndex } from '../lib/parser';
import {
  buildExerciseIndex,
  CHAPTER_PARAM,
  DIFFICULTY_PARAM,
  entryScopeOf,
  exerciseDocumentTitle,
  exercisesInScope,
  filterByDifficulty,
  findEntry,
  parseDifficulty,
  parseScope,
  plural,
} from '../lib/exerciseNav';
import {
  defaultPrintOptions,
  groupExercises,
  parsePrintOptions,
  PRINT_PARAMS,
  printSummary,
  writePrintOptions,
  type PrintOptions,
} from '../lib/printOptions';
import { buildPrintUrl, getReturnUrl, type PrintSection } from './routes';
import { PrintDocument, type PrintPart } from './PrintDocument';
import { useProgressiveParts } from './useProgressiveParts';
import {
  bookParts,
  cachedPick,
  chapterParts,
  countPlanExercises,
  exerciseParts,
  formularioParts,
  planBook,
  type ExerciseGroup,
  type PrintContext,
} from './parts';
import {
  PrintOptionsAside,
  PrintOptionsForm,
  PrintOptionsSheet,
  type PrintOptionsFormProps,
  type PrintPanelCounts,
  type PrintPanelKind,
  type PrintSummaryText,
} from './PrintOptionsPanel';
import { BookNotFound } from '../components/BookNotFound';
import { Lockup } from '../components/shell/Lockup';
import { ChevronLeft, Printer, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useReaderFeatures } from '../context/ReaderConfigContext';
import { ThemeToggle } from '../components/ThemeToggle';
import './styles/shell.css';

interface PrintPageProps {
  kind: PrintSection;
}

/** The panel sits next to the sheet from this width; below it opens from "Opzioni". */
const PANEL_QUERY = '(min-width: 1024px)';

function shortId(id: string): string {
  return id.replace(/-/g, '').slice(0, 8);
}

function buildWatermarkLabel(email: string, userId: string): string {
  const session = new Date().toISOString().slice(0, 16).replace('T', ' ');
  return `${email} · ${shortId(userId)} · ${session}`;
}

/** Run `fn` after the browser has painted the current frame. */
function afterPaint(fn: () => void): void {
  requestAnimationFrame(() => setTimeout(fn, 0));
}

/** Wait for every <img> in the sheet, so the print dialog never snapshots a half-loaded figure. */
async function waitForImages(root: ParentNode, timeoutMs = 8000): Promise<void> {
  const pending = [...root.querySelectorAll('img')].filter((img) => !img.complete);
  if (pending.length === 0) return;
  const loads = pending.map(
    (img) => new Promise<void>((resolve) => {
      img.addEventListener('load', () => resolve(), { once: true });
      img.addEventListener('error', () => resolve(), { once: true });
    }),
  );
  await Promise.race([Promise.all(loads), new Promise((r) => setTimeout(r, timeoutMs))]);
}

interface PrintToolbarProps {
  bookTitle: string;
  sectionLabel: string;
  documentTitle: string;
  returnUrl: string;
  onPrint?: () => void;
  /** False while the document is still being prepared: the print button waits. */
  ready?: boolean;
  /** Nothing to print yet (no chapter chosen): the button stays, disabled. */
  blocked?: boolean;
  printing?: boolean;
  onOptions?: () => void;
  optionsOpen?: boolean;
}

function PrintToolbar({
  bookTitle,
  sectionLabel,
  documentTitle,
  returnUrl,
  onPrint,
  ready = true,
  blocked = false,
  printing,
  onOptions,
  optionsOpen,
}: PrintToolbarProps) {
  const title = documentTitle ? `${bookTitle} · ${documentTitle}` : bookTitle;
  return (
    <header className="print-toolbar no-print" aria-label="Barra strumenti anteprima di stampa">
      <Link to="/" className="print-toolbar-brand" aria-label="Catalogo PoliTost Smartbook">
        <Lockup />
      </Link>

      <div className="print-toolbar-divider" aria-hidden />

      <div className="print-toolbar-context">
        <span className="print-toolbar-section-label">{sectionLabel}</span>
        <span className="print-toolbar-title" title={title}>
          {title}
        </span>
      </div>

      <div className="print-toolbar-actions">
        <ThemeToggle />
        <Link to={returnUrl} className="print-toolbar-btn print-toolbar-btn--back" aria-label="Torna al libro">
          <ChevronLeft size={16} strokeWidth={1.75} aria-hidden />
          <span className="print-toolbar-btn-label">Torna al libro</span>
        </Link>
        {onOptions && (
          <button
            type="button"
            className="print-toolbar-btn print-toolbar-btn--options"
            aria-haspopup="dialog"
            aria-expanded={optionsOpen}
            onClick={onOptions}
          >
            <SlidersHorizontal size={16} strokeWidth={1.75} aria-hidden />
            <span>Opzioni</span>
          </button>
        )}
        {onPrint && (
          ready || blocked ? (
            <button
              type="button"
              className="print-toolbar-btn print-toolbar-btn--print"
              onClick={onPrint}
              disabled={printing || blocked}
              aria-busy={printing}
              aria-label="Stampa o salva PDF"
            >
              <Printer size={16} strokeWidth={1.75} aria-hidden />
              <span>
                Stampa<span className="print-toolbar-btn-extra"> o salva PDF</span>
              </span>
            </button>
          ) : (
            <button type="button" className="print-toolbar-btn print-toolbar-btn--print" disabled aria-busy>
              <span className="print-toolbar-spinner" aria-hidden />
              <span className="print-toolbar-preparing">Preparazione…</span>
            </button>
          )
        )}
      </div>
    </header>
  );
}

function PrintMessage({ tone = 'neutral', children }: { tone?: 'neutral' | 'error'; children: React.ReactNode }) {
  return (
    <div className={`print-message print-message--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

/** Everything the preview shows for one set of options. */
interface PrintView {
  documentTitle: string;
  sectionLabel: string;
  printable: boolean;
  /** The whole book has a cover part instead of the opener. */
  opener: boolean;
  parts: PrintPart[];
  /** Shown in place of the sheet, with the panel still there (no chapter chosen). */
  message?: string;
  summary: PrintSummaryText;
  counts: PrintPanelCounts;
  /** Null: no options panel (the formula sheet). */
  panel: PrintPanelKind | null;
}

const NO_COUNTS: PrintPanelCounts = { exercises: 0, exercisesPrinted: 0, formulas: 0, exams: 0 };

export function PrintPage({ kind }: PrintPageProps) {
  const { bookId, chapterId } = useParams<{ bookId: string; chapterId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { watermark: watermarkEnabled } = useReaderFeatures();
  const [printing, setPrinting] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const wide = useMediaQuery(PANEL_QUERY);

  const data = useMemo(() => (bookId ? loadSmartbook(bookId) : null), [bookId]);
  const cloud = Boolean(bookId && isCloudBook(bookId));
  const {
    chapter: cloudChapter,
    assets: cloudAssets,
    error: cloudError,
    loading: cloudLoading,
  } = useCloudChapter(cloud && kind === 'capitolo', bookId, chapterId, data?.config.chapters);

  const returnUrl = getReturnUrl(searchParams.toString(), bookId ? `/libro/${bookId}` : '/');

  const resolveAsset = useCallback(
    (src: string) => resolveBookAsset(src, { ...(data?.assets ?? {}), ...cloudAssets }, cloud ? bookId : undefined),
    [data?.assets, cloudAssets, cloud, bookId],
  );

  const watermarkLabel = useMemo(
    () => (watermarkEnabled && user ? buildWatermarkLabel(user.email, user.id) : undefined),
    [watermarkEnabled, user],
  );

  const chapter = kind === 'capitolo' ? (cloud ? cloudChapter : data?.chapters.find((c) => c.meta.id === chapterId)) : undefined;

  const printableChapters = useMemo(() => data?.config.chapters.filter((c) => c.printable) ?? [], [data]);
  const printableNumbers = useMemo(() => printableChapters.map((c) => c.number), [printableChapters]);
  const grouped = useMemo(
    () => (data ? groupExercises(data.esercizi, data.config.chapters.map((c) => c.number)) : null),
    [data],
  );
  const formulaIndex = useMemo(() => {
    if (!data) return new Map();
    return buildFormulaIndex(cloud && chapter ? withLoadedChapter(data.chapters, chapter) : data.chapters);
  }, [data, cloud, chapter]);
  const ctx = useMemo<PrintContext>(() => ({ formulaIndex, resolveAsset }), [formulaIndex, resolveAsset]);

  // The sheet follows the URL. A choice shows in the panel at once (`chosen`) and reaches the URL
  // after the next paint, in a transition, so the switch never waits for the sheet to re-render.
  const docOptions = useMemo(() => parsePrintOptions(searchParams, printableNumbers), [searchParams, printableNumbers]);
  const [chosen, setChosen] = useState<PrintOptions | null>(null);
  const options = chosen ?? docOptions;

  const scopeParam = searchParams.get(CHAPTER_PARAM);
  const difficultyParam = searchParams.get(DIFFICULTY_PARAM);

  const describe = useCallback(
    (opts: PrintOptions): PrintView | null => {
      if (!bookId || !data || !grouped) return null;
      switch (kind) {
        case 'capitolo': {
          if (!chapter) return null;
          const n = chapter.meta.number;
          const own = grouped.byChapter.get(n) ?? [];
          const exercises = opts.exercises != null ? cachedPick(own, opts.exercises) : null;
          return {
            documentTitle: `Capitolo ${n}. ${chapter.meta.title}`,
            sectionLabel: data.config.sections.smartbook.label,
            printable: chapter.meta.printable,
            opener: true,
            parts: chapterParts(chapter, exercises, opts.solutions, ctx),
            summary: printSummary({
              chapters: `Capitolo ${n}`,
              exercises: exercises?.length ?? null,
              formulario: false,
              exams: null,
              solutions: opts.solutions,
            }),
            counts: {
              ...NO_COUNTS,
              exercises: own.length,
              exercisesPrinted: exercises?.length ?? own.length,
            },
            panel: 'capitolo',
          };
        }
        case 'libro': {
          const chapters = data.chapters.filter((c) => c.meta.printable);
          const plan = planBook(chapters, grouped, data.esami, opts);
          const all = planBook(chapters, grouped, data.esami, { ...opts, exercises: 'tutti' });
          const counts: PrintPanelCounts = {
            exercises: countPlanExercises(all) ?? 0,
            exercisesPrinted: countPlanExercises(planBook(chapters, grouped, data.esami, { ...opts, exercises: opts.exercises ?? 'tutti' })) ?? 0,
            formulas: plan.chapters.reduce((total, c) => total + c.formulas.length, 0),
            exams: data.esami.length,
          };
          const base = {
            documentTitle: 'Tutto il libro',
            sectionLabel: 'Libro completo',
            printable: true,
            opener: false,
            counts,
            panel: 'libro' as const,
          };
          if (plan.chapters.length === 0) {
            return {
              ...base,
              parts: [],
              message: 'Nessun capitolo scelto. Scegli almeno un capitolo nelle opzioni per vedere l’anteprima.',
              summary: { main: 'Nessun capitolo scelto', sub: 'Scegli almeno un capitolo da stampare.', empty: true },
            };
          }
          const summary = printSummary({
            chapters: plural(plan.chapters.length, 'capitolo', 'capitoli'),
            exercises: countPlanExercises(plan),
            formulario: plan.formulario,
            exams: plan.exams?.length ?? null,
            solutions: opts.solutions,
          });
          const contents = `${summary.main}${summary.sub ? `. ${summary.sub}` : ''}.`;
          return { ...base, parts: bookParts(data.config, plan, opts.solutions, contents, ctx), summary };
        }
        case 'formulario': {
          const label = data.config.sections.formulario.label;
          return {
            documentTitle: label,
            sectionLabel: label,
            printable: true,
            opener: true,
            parts: formularioParts(data.chapters),
            summary: { main: '', sub: '' },
            counts: NO_COUNTS,
            panel: null,
          };
        }
        case 'esercizi':
        case 'esami': {
          const label = data.config.sections[kind].label;
          // The same chapter and difficulty as the page the student printed from.
          const all = kind === 'esercizi' ? data.esercizi : data.esami;
          const index = kind === 'esercizi' ? buildExerciseIndex(all, data.config.chapters) : null;
          const scope = parseScope(scopeParam, index);
          const difficulty = parseDifficulty(difficultyParam);
          const list = filterByDifficulty(exercisesInScope(all, index, scope), difficulty);
          const groups: ExerciseGroup[] =
            index && (scope == null || scope === 'tutti')
              ? index.entries.map((entry) => ({
                  key: `gruppo-${entry.scope}`,
                  title: entry.number != null ? `Capitolo ${entry.number}. ${entry.title}` : entry.title,
                  label: entry.number != null ? `gli esercizi del capitolo ${entry.number}` : 'gli esercizi senza capitolo',
                  exercises: list.filter((ex) => entryScopeOf(ex, index) === entry.scope),
                }))
              : [{ key: kind, label: kind === 'esercizi' ? 'gli esercizi' : "le prove d'esame", exercises: list }];
          return {
            documentTitle: exerciseDocumentTitle(label, findEntry(index, scope), difficulty),
            sectionLabel: label,
            printable: true,
            opener: true,
            parts: exerciseParts(groups, kind, opts.solutions, ctx),
            summary: printSummary({
              exercises: kind === 'esercizi' ? list.length : null,
              formulario: false,
              exams: kind === 'esami' ? list.length : null,
              solutions: opts.solutions,
            }),
            counts: NO_COUNTS,
            panel: kind,
          };
        }
      }
    },
    [bookId, data, grouped, kind, chapter, ctx, scopeParam, difficultyParam],
  );

  const view = useMemo(() => describe(options), [describe, options]);
  const doc = useMemo(() => describe(docOptions), [describe, docOptions]);

  // The browser names the saved PDF after document.title.
  useEffect(() => {
    if (!data || !view) return;
    const previous = document.title;
    document.title = `${data.config.title} · ${view.documentTitle}`;
    return () => {
      document.title = previous;
    };
  }, [data, view]);

  // The document is ready to print once every part is mounted and its images and fonts have loaded.
  const parts = doc?.parts ?? [];
  const { mounted, pending } = useProgressiveParts(parts.map((p) => p.key));
  const stale = docOptions !== options;
  const complete = Boolean(doc) && pending === undefined && !stale;
  const signature = `${kind}|${parts.map((p) => p.key).join(',')}|${JSON.stringify(docOptions)}`;
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  useEffect(() => {
    if (!complete) return;
    let cancelled = false;
    void (async () => {
      const sheet = document.querySelector('.print-sheet');
      if (sheet) await waitForImages(sheet);
      await document.fonts?.ready;
      if (!cancelled) setLoadedFor(signature);
    })();
    return () => {
      cancelled = true;
    };
  }, [complete, signature]);
  const ready = complete && loadedFor === signature;
  const pendingPart = parts.find((p) => p.key === pending);
  const progress = ready
    ? null
    : stale
      ? 'Aggiorno l’anteprima…'
      : pendingPart
        ? `Preparo ${pendingPart.label}…`
        : 'Carico immagini e caratteri…';

  const setOptions = useCallback(
    (next: PrintOptions) => {
      setChosen(next);
      afterPaint(() =>
        startTransition(() => {
          setChosen((current) => (current === next ? null : current));
          setSearchParams((prev) => writePrintOptions(prev, next, printableNumbers), { replace: true });
        }),
      );
    },
    [setSearchParams, printableNumbers],
  );

  // The other route renders in a transition; until then the tabs show the choice and the rest waits.
  const [scopeRequest, setScopeRequest] = useState<{ from: PrintSection; to: 'capitolo' | 'libro' } | null>(null);
  const pendingScope = scopeRequest?.from === kind ? scopeRequest.to : undefined;

  // "Questo capitolo" and "Tutto il libro" keep the exercises and solutions settings and the way back.
  const switchScope = useCallback(
    (scope: 'capitolo' | 'libro') => {
      if (!bookId) return;
      const carried = writePrintOptions(
        new URLSearchParams(),
        { ...defaultPrintOptions(printableNumbers), exercises: options.exercises, solutions: options.solutions },
        printableNumbers,
      );
      let target: string;
      if (scope === 'libro') {
        target = buildPrintUrl(bookId, 'libro', { chapterId });
      } else {
        const from = printableChapters.find((c) => c.id === searchParams.get(PRINT_PARAMS.from));
        const first = printableChapters.find((c) => options.chapters.includes(c.number)) ?? printableChapters[0];
        const to = from ?? first;
        if (!to) return;
        target = buildPrintUrl(bookId, 'capitolo', { chapterId: to.id });
      }
      const [path, search = ''] = target.split('?');
      const params = new URLSearchParams(search);
      for (const [key, value] of carried) params.set(key, value);
      const ret = searchParams.get('return');
      if (ret) params.set('return', ret);
      const query = params.toString();
      setScopeRequest({ from: kind, to: scope });
      afterPaint(() => startTransition(() => navigate(query ? `${path}?${query}` : path, { replace: true })));
    },
    [bookId, chapterId, kind, navigate, options, printableChapters, printableNumbers, searchParams],
  );

  const handlePrint = useCallback(async () => {
    setPrinting(true);
    try {
      const sheet = document.querySelector('.print-sheet');
      if (sheet) await waitForImages(sheet);
      await document.fonts?.ready;
      window.print();
    } finally {
      setPrinting(false);
    }
  }, []);

  const canPrint = Boolean(view?.printable) && !view?.message && !(cloud && (cloudLoading || cloudError));
  usePrintShortcut(canPrint && ready ? () => void handlePrint() : undefined);

  if (!bookId || !data) return <BookNotFound />;

  const bookTitle = data.config.title;
  const fallbackLabel = data.config.sections.smartbook.label;

  const shell = (content: React.ReactNode, toolbar?: Partial<PrintToolbarProps>, panel?: PrintOptionsFormProps) => (
    <div className="print-page-shell">
      <PrintToolbar
        bookTitle={bookTitle}
        sectionLabel={toolbar?.sectionLabel ?? fallbackLabel}
        documentTitle={toolbar?.documentTitle ?? ''}
        returnUrl={returnUrl}
        onPrint={toolbar?.onPrint}
        ready={toolbar?.ready}
        blocked={toolbar?.blocked}
        printing={printing}
        onOptions={panel && !wide ? () => setOptionsOpen(true) : undefined}
        optionsOpen={optionsOpen}
      />
      {panel && view ? (
        <div className="print-layout">
          {wide && (
            <PrintOptionsAside summary={view.summary}>
              <PrintOptionsForm {...panel} />
            </PrintOptionsAside>
          )}
          <main id="main-content" className="print-canvas">
            {content}
          </main>
          {!wide && (
            <PrintOptionsSheet open={optionsOpen} onClose={() => setOptionsOpen(false)} summary={view.summary}>
              <PrintOptionsForm {...panel} />
            </PrintOptionsSheet>
          )}
        </div>
      ) : (
        <main id="main-content" className="print-canvas">
          {content}
        </main>
      )}
    </div>
  );

  if (kind === 'capitolo' && !data.chapters.some((c) => c.meta.id === chapterId)) {
    return shell(<PrintMessage>Capitolo non trovato.</PrintMessage>, { documentTitle: 'Capitolo non trovato' });
  }
  if (kind === 'libro' && cloud) {
    return shell(
      <PrintMessage>Questo libro si stampa un capitolo alla volta. Apri un capitolo e premi l’icona della stampante.</PrintMessage>,
      { documentTitle: 'Tutto il libro', sectionLabel: 'Libro completo' },
    );
  }
  if (kind === 'libro' && printableChapters.length === 0) {
    return shell(<PrintMessage>Nessun capitolo di questo libro è disponibile in versione stampabile.</PrintMessage>, {
      documentTitle: 'Tutto il libro',
      sectionLabel: 'Libro completo',
    });
  }
  if (cloud && cloudLoading) {
    return shell(<PrintMessage>Caricamento del capitolo…</PrintMessage>, { documentTitle: 'Caricamento…' });
  }
  if (cloud && cloudError) {
    return shell(<PrintMessage tone="error">{cloudError}</PrintMessage>, { documentTitle: 'Errore' });
  }
  if (!view || !doc) {
    return shell(<PrintMessage>Contenuto non disponibile per la stampa.</PrintMessage>, { documentTitle: 'Non disponibile' });
  }
  if (!view.printable) {
    return shell(
      <PrintMessage>Questo capitolo non è disponibile in versione stampabile.</PrintMessage>,
      { documentTitle: view.documentTitle, sectionLabel: view.sectionLabel },
    );
  }

  const currentChapter = chapter ?? printableChapters.find((c) => c.id === searchParams.get(PRINT_PARAMS.from));
  const panel: PrintOptionsFormProps | undefined = view.panel
    ? {
        kind: view.panel,
        options,
        onChange: setOptions,
        onScopeChange: cloud ? undefined : switchScope,
        pendingScope,
        chapters: printableChapters,
        currentChapter: currentChapter && ('meta' in currentChapter ? currentChapter.meta : currentChapter),
        counts: view.counts,
      }
    : undefined;

  return shell(
    view.message ? (
      <PrintMessage>{view.message}</PrintMessage>
    ) : (
      <PrintDocument
        bookTitle={bookTitle}
        documentTitle={doc.documentTitle}
        watermarkLabel={watermarkLabel}
        opener={doc.opener}
        parts={doc.parts}
        mounted={mounted}
        progress={progress}
      />
    ),
    {
      documentTitle: view.documentTitle,
      sectionLabel: view.sectionLabel,
      onPrint: () => void handlePrint(),
      ready,
      blocked: !canPrint,
    },
    panel,
  );
}

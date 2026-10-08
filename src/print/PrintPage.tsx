import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCloudChapter } from '../hooks/useCloudChapter';
import { usePrintShortcut } from '../hooks/usePrintShortcut';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { isCloudBook, loadSmartbook } from '../lib/loader';
import { resolveBookAsset } from '../lib/cloudAssets';
import { withLoadedChapter } from '../lib/chapterNav';
import { buildFormulaIndex } from '../lib/parser';
import { getReturnUrl } from './routes';
import { PrintDocument } from './PrintDocument';
import { PrintChapter } from './bodies/PrintChapter';
import { PrintFormulario } from './bodies/PrintFormulario';
import { PrintExercises } from './bodies/PrintExercises';
import { BookNotFound } from '../components/BookNotFound';
import { Lockup } from '../components/shell/Lockup';
import { ChevronLeft, Printer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useReaderFeatures } from '../context/ReaderConfigContext';
import { ThemeToggle } from '../components/ThemeToggle';
import './styles/shell.css';

export type PrintKind = 'capitolo' | 'formulario' | 'esercizi' | 'esami';

interface PrintPageProps {
  kind: PrintKind;
}

function shortId(id: string): string {
  return id.replace(/-/g, '').slice(0, 8);
}

function buildWatermarkLabel(email: string, userId: string): string {
  const session = new Date().toISOString().slice(0, 16).replace('T', ' ');
  return `${email} · ${shortId(userId)} · ${session}`;
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
  printing?: boolean;
}

function PrintToolbar({ bookTitle, sectionLabel, documentTitle, returnUrl, onPrint, printing }: PrintToolbarProps) {
  return (
    <header className="print-toolbar no-print" aria-label="Barra strumenti anteprima di stampa">
      <Link to="/" className="print-toolbar-brand" aria-label="Catalogo Politost Smartbook">
        <Lockup />
      </Link>

      <div className="print-toolbar-divider" aria-hidden />

      <div className="print-toolbar-context">
        <span className="print-toolbar-section-label">{sectionLabel}</span>
        <span className="print-toolbar-title" title={`${bookTitle} — ${documentTitle}`}>
          {bookTitle} — {documentTitle}
        </span>
      </div>

      <div className="print-toolbar-actions">
        <ThemeToggle />
        <Link to={returnUrl} className="print-toolbar-btn print-toolbar-btn--back" aria-label="Torna al libro">
          <ChevronLeft size={16} strokeWidth={1.75} aria-hidden />
          <span className="print-toolbar-btn-label">Torna al libro</span>
        </Link>
        {onPrint && (
          <button
            type="button"
            className="print-toolbar-btn print-toolbar-btn--print"
            onClick={onPrint}
            disabled={printing}
            aria-busy={printing}
            aria-label="Stampa o salva PDF"
          >
            <Printer size={16} strokeWidth={1.75} aria-hidden />
            <span>
              Stampa<span className="print-toolbar-btn-extra"> o salva PDF</span>
            </span>
          </button>
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

export function PrintPage({ kind }: PrintPageProps) {
  const { bookId, chapterId } = useParams<{ bookId: string; chapterId?: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { watermark: watermarkEnabled } = useReaderFeatures();
  const [printing, setPrinting] = useState(false);

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

  const printMeta = useMemo(() => {
    if (!bookId || !data) return null;
    switch (kind) {
      case 'capitolo': {
        const chapter = cloud ? cloudChapter : data.chapters.find((c) => c.meta.id === chapterId);
        if (!chapter) return null;
        return {
          documentTitle: `Cap. ${chapter.meta.number} — ${chapter.meta.title}`,
          sectionLabel: data.config.sections.smartbook.label,
          printable: chapter.meta.printable,
          body: (
            <PrintChapter
              chapter={chapter}
              allChapters={cloud ? withLoadedChapter(data.chapters, chapter) : data.chapters}
              resolveAsset={resolveAsset}
            />
          ),
        };
      }
      case 'formulario':
        return {
          documentTitle: data.config.sections.formulario.label,
          sectionLabel: data.config.sections.formulario.label,
          printable: true,
          body: <PrintFormulario chapters={data.chapters} />,
        };
      case 'esercizi':
      case 'esami': {
        const label = data.config.sections[kind].label;
        return {
          documentTitle: label,
          sectionLabel: label,
          printable: true,
          body: (
            <PrintExercises
              exercises={kind === 'esercizi' ? data.esercizi : data.esami}
              formulaIndex={buildFormulaIndex(data.chapters)}
              resolveAsset={resolveAsset}
            />
          ),
        };
      }
    }
  }, [bookId, kind, chapterId, data, cloud, cloudChapter, resolveAsset]);

  // The browser names the saved PDF after document.title.
  useEffect(() => {
    if (!data || !printMeta) return;
    const previous = document.title;
    document.title = `${data.config.title} — ${printMeta.documentTitle}`;
    return () => {
      document.title = previous;
    };
  }, [data, printMeta]);

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

  const canPrint = Boolean(printMeta?.printable) && !(cloud && (cloudLoading || cloudError));
  usePrintShortcut(canPrint ? () => void handlePrint() : undefined);

  if (!bookId || !data) return <BookNotFound />;

  const bookTitle = data.config.title;
  const fallbackLabel = data.config.sections.smartbook.label;

  const shell = (content: React.ReactNode, toolbar?: Partial<PrintToolbarProps>) => (
    <div className="print-page-shell">
      <PrintToolbar
        bookTitle={bookTitle}
        sectionLabel={toolbar?.sectionLabel ?? fallbackLabel}
        documentTitle={toolbar?.documentTitle ?? ''}
        returnUrl={returnUrl}
        onPrint={toolbar?.onPrint}
        printing={printing}
      />
      <main id="main-content" className="print-canvas">
        {content}
      </main>
    </div>
  );

  if (kind === 'capitolo' && !data.chapters.some((c) => c.meta.id === chapterId)) {
    return shell(<PrintMessage>Capitolo non trovato.</PrintMessage>, { documentTitle: 'Capitolo non trovato' });
  }
  if (cloud && cloudLoading) {
    return shell(<PrintMessage>Caricamento del capitolo…</PrintMessage>, { documentTitle: 'Caricamento…' });
  }
  if (cloud && cloudError) {
    return shell(<PrintMessage tone="error">{cloudError}</PrintMessage>, { documentTitle: 'Errore' });
  }
  if (!printMeta) {
    return shell(<PrintMessage>Contenuto non disponibile per la stampa.</PrintMessage>, { documentTitle: 'Non disponibile' });
  }
  if (!printMeta.printable) {
    return shell(
      <PrintMessage>Questo capitolo non è disponibile in versione stampabile.</PrintMessage>,
      { documentTitle: printMeta.documentTitle, sectionLabel: printMeta.sectionLabel },
    );
  }

  return shell(
    <PrintDocument bookTitle={bookTitle} documentTitle={printMeta.documentTitle} watermarkLabel={watermarkLabel}>
      {printMeta.body}
    </PrintDocument>,
    { documentTitle: printMeta.documentTitle, sectionLabel: printMeta.sectionLabel, onPrint: () => void handlePrint() },
  );
}

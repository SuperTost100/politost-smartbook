import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { isCloudBook, loadSmartbook } from '../lib/loader';
import { chapterFromCloudMarkdown, cloudChapterAssets, loadCloudChapterMarkdown } from '../lib/cloudLoader';
import { resolveBookAsset } from '../lib/cloudAssets';
import { withLoadedChapter } from '../lib/chapterNav';
import type { Chapter } from '../types/smartbook';
import { getReturnUrl } from './routes';
import { PrintApp } from './PrintApp';
import { PrintFrame } from './PrintFrame';
import { PrintChapter } from './bodies/PrintChapter';
import { PrintFormulario } from './bodies/PrintFormulario';
import { PrintExercises } from './bodies/PrintExercises';
import { cleanupLeakedPagedStyles, triggerBrowserPrint } from './pagedRunner';
import { LicenseGate } from '../components/LicenseGate';
import { BookNotFound } from '../components/BookNotFound';
import { useAuth } from '../context/AuthContext';
import { useReaderFeatures } from '../context/ReaderConfigContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { Lockup } from '../components/shell/Lockup';
import { Ban, ChevronLeft, CircleAlert, Printer } from 'lucide-react';
import './styles/shell.css';

export type PrintKind = 'capitolo' | 'formulario' | 'esercizi' | 'esami';

interface PrintPageProps {
  kind: PrintKind;
}

/* ── Utilities ───────────────────────────────────────────────────── */

function shortId(id: string): string {
  return id.replace(/-/g, '').slice(0, 8);
}

function buildWatermarkLabel(email: string, userId: string): string {
  const session = new Date().toISOString().slice(0, 16).replace('T', ' ');
  return `${email} · ${shortId(userId)} · ${session}`;
}

/* ── Loading screen ─────────────────────────────────────────────── */

function PrintLoadingScreen() {
  return (
    <div className="print-loading-screen" aria-live="polite" role="status">
      <div className="print-loading-icon" aria-hidden>
        <div className="print-loading-page">
          <div className="print-loading-lines">
            <div className="print-loading-line" />
            <div className="print-loading-line" />
            <div className="print-loading-line" />
            <div className="print-loading-line" />
            <div className="print-loading-line" />
          </div>
        </div>
      </div>
      <p className="print-loading-label">Impaginazione in corso…</p>
    </div>
  );
}

/* ── Error card ──────────────────────────────────────────────────── */

function PrintErrorCard({ message }: { message: string }) {
  return (
    <div className="print-error-card" role="alert">
      <CircleAlert className="print-error-icon" size={18} strokeWidth={1.75} aria-hidden />
      <span>{message}</span>
    </div>
  );
}

/* ── Toolbar ─────────────────────────────────────────────────────── */

interface PrintToolbarProps {
  bookTitle: string;
  sectionLabel: string;
  documentTitle: string;
  returnUrl: string;
  paginating: boolean;
  onPrint: () => void;
}

function PrintToolbar({
  bookTitle,
  sectionLabel,
  documentTitle,
  returnUrl,
  paginating,
  onPrint,
}: PrintToolbarProps) {
  return (
    <>
      <header className="print-toolbar no-print" aria-label="Barra strumenti anteprima di stampa">
        {/* Brand */}
        <Link to="/" className="print-toolbar-brand" tabIndex={-1} aria-hidden>
          <Lockup />
        </Link>

        <div className="print-toolbar-divider" aria-hidden />

        {/* Context */}
        <div className="print-toolbar-context">
          <span className="print-toolbar-section-label">{sectionLabel}</span>
          <span className="print-toolbar-title" title={`${bookTitle} — ${documentTitle}`}>
            {bookTitle} — {documentTitle}
          </span>
        </div>

        {/* Actions */}
        <div className="print-toolbar-actions">
          <ThemeToggle />

          <Link
            to={returnUrl}
            className="print-toolbar-btn print-toolbar-btn--back"
            aria-label="Torna al libro"
          >
            <ChevronLeft size={16} strokeWidth={1.75} aria-hidden />
            Torna al libro
          </Link>

          <button
            type="button"
            className="print-toolbar-btn print-toolbar-btn--print"
            onClick={onPrint}
            disabled={paginating}
            aria-busy={paginating}
            aria-describedby={paginating ? 'print-status' : undefined}
          >
            {paginating ? (
              <>
                <span className="print-btn-spinner" aria-hidden />
                Impaginazione…
              </>
            ) : (
              <>
                <Printer size={16} strokeWidth={1.75} aria-hidden />
                Stampa
              </>
            )}
          </button>
        </div>
      </header>

    </>
  );
}

/* ── Not-printable state ─────────────────────────────────────────── */

function PrintUnavailableShell({
  bookTitle,
  sectionLabel,
  returnUrl,
}: {
  bookTitle: string;
  sectionLabel: string;
  returnUrl: string;
}) {
  return (
    <div className="print-page-shell">
      <PrintToolbar
        bookTitle={bookTitle}
        sectionLabel={sectionLabel}
        documentTitle="Non disponibile"
        returnUrl={returnUrl}
        paginating={false}
        onPrint={() => undefined}
      />
      <div className="print-canvas">
        <div className="print-unavailable-body">
          <Ban className="print-unavailable-icon" size={48} strokeWidth={1.5} aria-hidden />
          <p>Questo capitolo non è disponibile in versione stampabile.</p>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────── */

export function PrintPage({ kind }: PrintPageProps) {
  const { bookId, chapterId } = useParams<{ bookId: string; chapterId?: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { watermark: watermarkEnabled } = useReaderFeatures();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [paginating, setPaginating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const data = useMemo(
    () => (bookId ? loadSmartbook(bookId) : null),
    [bookId],
  );
  const cloud = Boolean(bookId && isCloudBook(bookId));
  const [cloudChapter, setCloudChapter] = useState<Chapter | null>(null);
  const [cloudAssets, setCloudAssets] = useState<Record<string, string>>({});
  const [cloudLoading, setCloudLoading] = useState(cloud && kind === 'capitolo');
  const [cloudError, setCloudError] = useState<string | null>(null);

  useEffect(() => {
    if (!cloud || kind !== 'capitolo' || !bookId || !chapterId || !data) return;
    const meta = data.config.chapters.find((c) => c.id === chapterId);
    if (!meta) return;
    let cancelled = false;
    setCloudLoading(true);
    setCloudError(null);
    loadCloudChapterMarkdown(bookId, chapterId)
      .then((raw) => {
        if (cancelled) return;
        setCloudChapter(chapterFromCloudMarkdown(raw, meta));
        setCloudAssets(cloudChapterAssets(bookId));
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setCloudError(err instanceof Error ? err.message : 'Impossibile caricare il capitolo');
        }
      })
      .finally(() => {
        if (!cancelled) setCloudLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cloud, kind, bookId, chapterId, data]);

  const returnUrl = getReturnUrl(
    searchParams.toString(),
    bookId ? `/libro/${bookId}` : '/',
  );

  const resolveAsset = useCallback(
    (src: string) => resolveBookAsset(
      src,
      { ...(data?.assets ?? {}), ...cloudAssets },
      cloud ? bookId : undefined,
    ),
    [data?.assets, cloudAssets, cloud, bookId],
  );

  const paginationKey = `${bookId ?? ''}:${kind}:${chapterId ?? ''}`;

  const watermarkLabel = useMemo(() => {
    if (!watermarkEnabled || !user) return '';
    return buildWatermarkLabel(user.email, user.id);
  }, [watermarkEnabled, user, paginationKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve section metadata + body for the current print kind
  const printMeta = useMemo(() => {
    if (!bookId || !data) return null;

    let body: React.ReactNode = null;
    let documentTitle = '';
    let sectionTitle = '';

    switch (kind) {
      case 'capitolo': {
        const chapter = cloud
          ? cloudChapter
          : data.chapters.find((c) => c.meta.id === chapterId);
        if (!chapter) return null;
        documentTitle = `Cap. ${chapter.meta.number} — ${chapter.meta.title}`;
        sectionTitle = data.config.sections.smartbook.label;
        body = (
          <PrintChapter
            chapter={chapter}
            allChapters={cloud ? withLoadedChapter(data.chapters, chapter) : data.chapters}
            resolveAsset={resolveAsset}
          />
        );
        break;
      }
      case 'formulario':
        documentTitle = data.config.sections.formulario.label;
        sectionTitle = documentTitle;
        body = <PrintFormulario chapters={data.chapters} />;
        break;
      case 'esercizi':
        documentTitle = data.config.sections.esercizi.label;
        sectionTitle = documentTitle;
        body = <PrintExercises exercises={data.esercizi} resolveAsset={resolveAsset} />;
        break;
      case 'esami':
        documentTitle = data.config.sections.esami.label;
        sectionTitle = documentTitle;
        body = <PrintExercises exercises={data.esami} resolveAsset={resolveAsset} />;
        break;
    }

    return { body, documentTitle, sectionTitle };
  }, [bookId, kind, chapterId, data, resolveAsset]);

  const printContent = useMemo(() => {
    if (!bookId || !data || !printMeta) return null;
    return (
      <PrintApp
        bookTitle={data.config.title}
        documentTitle={printMeta.documentTitle}
      >
        {printMeta.body}
      </PrintApp>
    );
  }, [bookId, data, printMeta]);

  useEffect(() => {
    cleanupLeakedPagedStyles();
  }, []);

  // ── Guard: book not found ────────────────────────────────────────
  if (!bookId || !data) return <BookNotFound />;

  // ── Guard: non-printable chapter ────────────────────────────────
  if (kind === 'capitolo') {
    const chapter = data.chapters.find((c) => c.meta.id === chapterId);
    if (!chapter) {
      return <p className="empty-note">Capitolo non trovato.</p>;
    }
    if (cloud && cloudLoading) {
      return <PrintLoadingScreen />;
    }
    if (cloud && cloudError) {
      return <PrintErrorCard message={cloudError} />;
    }
    if (!chapter.meta.printable) {
      return (
        <PrintUnavailableShell
          bookTitle={data.config.title}
          sectionLabel={data.config.sections.smartbook.label}
          returnUrl={returnUrl}
        />
      );
    }
  }

  // ── Guard: content not resolved ──────────────────────────────────
  if (!printMeta || !printContent) {
    return (
      <main id="main-content">
        <p className="empty-note">Contenuto non disponibile per la stampa.</p>
      </main>
    );
  }

  const { documentTitle, sectionTitle } = printMeta;

  return (
    <LicenseGate bookId={bookId} access={data.config.access ?? 'public'}>
      <div className="print-page-shell">
        {/* ── Branded toolbar ──────────────────────────────────── */}
        <PrintToolbar
          bookTitle={data.config.title}
          sectionLabel={sectionTitle}
          documentTitle={documentTitle}
          returnUrl={returnUrl}
          paginating={paginating}
          onPrint={() => {
            const iframe = iframeRef.current;
            if (iframe) triggerBrowserPrint(iframe);
          }}
        />

        {/* ── Canvas: loading feedback + iframe ────────────────── */}
        <main id="main-content" aria-busy={paginating} className="print-canvas">
          <div className="print-frame-wrap">
            {/* Loading overlay */}
            {paginating && (
              <PrintLoadingScreen />
            )}

            {/* Error card */}
            {error && !paginating && (
              <PrintErrorCard message={error} />
            )}

            {/* Hidden status for AT */}
            {paginating && (
              <span id="print-status" className="no-print" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
                Impaginazione in corso
              </span>
            )}

            {/* The actual Paged.js iframe */}
            <PrintFrame
              iframeRef={iframeRef}
              paginationKey={paginationKey}
              content={printContent}
              handlerOptions={
                watermarkLabel ? { watermarkLabel, bookId } : undefined
              }
              onPaginatingChange={setPaginating}
              onError={setError}
            />
          </div>
        </main>
      </div>
    </LicenseGate>
  );
}

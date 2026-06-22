import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { loadSmartbook } from '../lib/loader';
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
      <svg
        className="print-error-icon"
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx={12} cy={12} r={10} />
        <line x1={12} y1={8} x2={12} y2={12} />
        <line x1={12} y1={16} x2={12.01} y2={16} />
      </svg>
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
          <img
            src="/logo.svg"
            alt=""
            className="print-toolbar-logo"
            width={32}
            height={32}
          />
          <div className="print-toolbar-wordmark">
            <span className="print-toolbar-name">Politost</span>
            <span className="print-toolbar-sub">Smartbook</span>
          </div>
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
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="15 18 9 12 15 6" />
            </svg>
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
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                Stampa
              </>
            )}
          </button>
        </div>
      </header>

      {/* Brand accent strip */}
      <div className="print-toolbar-accent no-print" aria-hidden />
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
          <svg className="print-unavailable-icon" width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx={12} cy={12} r={10} />
            <line x1={4.93} y1={4.93} x2={19.07} y2={19.07} />
          </svg>
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

  const returnUrl = getReturnUrl(
    searchParams.toString(),
    bookId ? `/libro/${bookId}` : '/',
  );

  const resolveAsset = useCallback(
    (src: string) => data?.assets[src],
    [data?.assets],
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
        const chapter = data.chapters.find((c) => c.meta.id === chapterId);
        if (!chapter) return null;
        documentTitle = `Cap. ${chapter.meta.number} — ${chapter.meta.title}`;
        sectionTitle = data.config.sections.smartbook.label;
        body = (
          <PrintChapter
            chapter={chapter}
            allChapters={data.chapters}
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

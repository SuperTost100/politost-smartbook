import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useReaderFeatures } from '../context/ReaderConfigContext';
import { getCatalog, initUploadedBooks, isBuiltinBook, registerUploadedBook, unregisterUploadedBook } from '../lib/loader';
import { whenCloudBooksReady } from '../lib/cloudLoader';
import { parsePtsbFile, isEncryptedPtsb } from '../lib/ptsb';
import { removeUploaded, saveUploaded } from '../lib/ptsbStore';
import { subjectAccentClass } from '../lib/subjectColor';
import { SiteHeader } from '../components/SiteHeader';
import { Footer } from '../components/Footer';
import { MOBILE_LAYOUT_QUERY, useMediaQuery } from '../hooks/useMediaQuery';

export function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const { auth: authEnabled } = useReaderFeatures();
  const isMobile = useMediaQuery(MOBILE_LAYOUT_QUERY);
  const [catalog, setCatalog] = useState(() => getCatalog());
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refreshCatalog = useCallback(() => {
    setCatalog(getCatalog());
  }, []);

  useEffect(() => {
    let cancelled = false;
    void whenCloudBooksReady().then(
      () => {
        if (!cancelled) refreshCatalog();
      },
      () => {
        if (!cancelled) refreshCatalog();
      },
    );
    return () => {
      cancelled = true;
    };
  }, [refreshCatalog]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    void initUploadedBooks(user?.id ?? null).then(() => {
      if (!cancelled) refreshCatalog();
    });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id, refreshCatalog]);

  async function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.ptsb')) {
      setUploadError('Seleziona un file .ptsb');
      return;
    }
    setUploading(true);
    setUploadError(null);
    setUploadStatus('Lettura file…');
    try {
      const buf = await file.arrayBuffer();
      if (isEncryptedPtsb(buf) && !user) {
        setUploadError(
          authEnabled
            ? 'Questo libro è protetto. Accedi con il tuo account per aprirlo.'
            : 'Questo libro è protetto e richiede la piattaforma Politost.',
        );
        return;
      }
      setUploadStatus('Validazione…');
      const bundle = await parsePtsbFile(file);
      if (isBuiltinBook(bundle.config.id)) {
        setUploadError(`Lo smartbook "${bundle.config.id}" è già incluso nella piattaforma.`);
        return;
      }
      if (bundle.config.access === 'licensed' && !user && authEnabled) {
        setUploadError('Accedi per caricare smartbook con licenza.');
        return;
      }
      bundle.userId = user?.id;
      setUploadStatus('Salvataggio…');
      await saveUploaded(bundle);
      registerUploadedBook(bundle);
      refreshCatalog();
      setUploadStatus(`"${bundle.config.title}" caricato su questo dispositivo.`);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Caricamento fallito');
      setUploadStatus(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove(id: string) {
    await removeUploaded(id);
    unregisterUploadedBook(id);
    refreshCatalog();
    setUploadStatus(null);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void processFile(file);
  }

  return (
    <div className="home-page">
        <SiteHeader />

        <main id="main-content">
        <div className="home-hero">
          <h1>I tuoi libri di testo, interattivi</h1>
          <p>
            Capitoli con formule, formulario, esercizi con soluzioni passo passo, grafici interattivi e laboratorio — tutto in un unico libro digitale.
          </p>
        </div>

        <section className="home-catalog">
          <h2>Smartbook disponibili</h2>
          <div className="book-grid">
            {catalog.map((book) => (
              <div key={book.id} className="book-card-wrap">
                {book.source === 'cloud' && (
                  <span className="book-card-badge-corner">Cloud</span>
                )}
                {book.source === 'uploaded' && (
                  <span className="book-card-badge-corner">Importato</span>
                )}
                <Link to={`/libro/${book.id}`} className="book-card">
                  <div className={`book-card-accent ${subjectAccentClass(book.subject)}`} aria-hidden />
                  <span className="book-card-subject">{book.subject}</span>
                  <h3>{book.title}</h3>
                  {book.access === 'licensed' && (
                    <div className="book-card-badges">
                      <span className="badge badge-licensed">Richiede accesso</span>
                    </div>
                  )}
                  <span className="book-card-cta">Apri →</span>
                </Link>
                {book.source === 'uploaded' && (
                  <button type="button" className="book-remove-btn" onClick={() => void handleRemove(book.id)}>
                    Rimuovi da questo dispositivo
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="home-import no-print">
          <details className="home-import-details">
            <summary className="home-import-summary">
              <span className="home-import-title">Hai un libro digitale?</span>
              <span className="home-import-subtitle">Se hai ricevuto un file dal tuo docente o dall&apos;editore, importalo qui.</span>
            </summary>
            <div className="home-import-body">
              <p className="home-import-hint">
                {isMobile ? (
                  <>
                    Scegli il file <code>.ptsb</code> ricevuto dal docente o dall&apos;editore.
                    Il libro resterà disponibile su questo dispositivo.
                  </>
                ) : (
                  <>
                    Seleziona o trascina il file che ti è stato fornito (formato <code>.ptsb</code>).
                    Il libro resterà disponibile su questo dispositivo.
                  </>
                )}
              </p>
              <div
                className={`upload-dropzone${dragOver ? ' drag-over' : ''}${isMobile ? ' upload-dropzone--mobile' : ''}`}
                onDragOver={isMobile ? undefined : (e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={isMobile ? undefined : () => setDragOver(false)}
                onDrop={isMobile ? undefined : onDrop}
                onClick={() => inputRef.current?.click()}
                role="button"
                aria-label="Carica un file smartbook in formato ptsb"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), inputRef.current?.click())}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".ptsb"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void processFile(f);
                    e.target.value = '';
                  }}
                />
                {uploading ? 'Caricamento in corso…' : isMobile ? 'Scegli file .ptsb' : 'Clicca o trascina il file qui'}
              </div>
              {uploadStatus && <p className="upload-success" aria-live="polite">{uploadStatus}</p>}
              {uploadError && <p className="upload-error" role="alert">{uploadError}</p>}
            </div>
          </details>
        </section>
        </main>

        <Footer />
    </div>
  );
}

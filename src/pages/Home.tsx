import { useCallback, useEffect, useState } from 'react';
import { App } from 'antd';
import { useAuth } from '../context/AuthContext';
import { useReaderFeatures } from '../context/ReaderConfigContext';
import { getCatalog, initUploadedBooks, isBuiltinBook, registerUploadedBook, unregisterUploadedBook } from '../lib/loader';
import { whenCloudBooksReady } from '../lib/cloudLoader';
import { parsePtsbFile, isEncryptedPtsb } from '../lib/ptsb';
import { removeUploaded, saveUploaded } from '../lib/ptsbStore';
import { SiteHeader } from '../components/SiteHeader';
import { Footer } from '../components/Footer';
import { BookCard } from '../components/ds/BookCard';
import { ImportDropzone } from '../components/ds/ImportDropzone';

export function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const { auth: authEnabled } = useReaderFeatures();
  const { modal } = App.useApp();
  const [catalog, setCatalog] = useState(() => getCatalog());
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

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
    setUploadWarnings([]);
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
      setUploadWarnings(bundle.warnings ?? []);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Caricamento fallito');
      setUploadStatus(null);
    } finally {
      setUploading(false);
    }
  }

  function confirmRemove(id: string, title: string) {
    modal.confirm({
      title: 'Rimuovere il libro?',
      content: `"${title}" sarà eliminato da questo dispositivo. Potrai importarlo di nuovo dal file .ptsb.`,
      okText: 'Rimuovi',
      cancelText: 'Annulla',
      okButtonProps: { danger: true },
      onOk: async () => {
        await removeUploaded(id);
        unregisterUploadedBook(id);
        refreshCatalog();
        setUploadStatus(null);
        setUploadWarnings([]);
      },
    });
  }

  const dropState = uploading ? 'busy' : uploadError ? 'error' : uploadStatus ? 'success' : 'idle';

  return (
    <div className="site-page home-page">
      <SiteHeader />

      <main id="main-content" className="home-main">
        <section className="home-hero">
          <h1>I tuoi libri di testo, interattivi</h1>
          <p>
            Capitoli con formule, formulario, esercizi con soluzioni passo passo, grafici interattivi e laboratorio, in un unico libro digitale.
          </p>
        </section>

        <section className="home-catalog">
          <h2>Smartbook disponibili</h2>
          <div className="book-grid">
            {catalog.map((book) => (
              <BookCard
                key={book.id}
                subject={book.subject}
                title={book.title}
                meta={[book.authors?.join(', '), book.version && `v${book.version}`].filter(Boolean).join(' · ') || undefined}
                href={`/libro/${book.id}`}
                cloud={book.source === 'cloud'}
                uploaded={book.source === 'uploaded'}
                licensed={book.access === 'licensed'}
                onRemove={book.source === 'uploaded' ? () => confirmRemove(book.id, book.title) : undefined}
              />
            ))}
          </div>
        </section>

        <section className="home-import no-print" aria-labelledby="home-import-title">
          <h2 id="home-import-title">Hai un libro digitale?</h2>
          <p>Se hai ricevuto un file dal tuo docente o dall&apos;editore, importalo qui: il libro resterà disponibile su questo dispositivo.</p>
          <ImportDropzone
            state={dropState}
            message={uploadError ?? uploadStatus}
            warnings={uploadWarnings}
            onFile={(file) => void processFile(file)}
          />
        </section>
      </main>

      <Footer />
    </div>
  );
}

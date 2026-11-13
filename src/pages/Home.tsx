import { useCallback, useEffect, useState } from 'react';
import { App } from 'antd';
import { useAuth } from '../context/AuthContext';
import { useReaderFeatures } from '../context/ReaderConfigContext';
import { getCatalog, initUploadedBooks, registerUploadedBook, unregisterUploadedBook, whenRemoteBooksReady } from '../lib/loader';
import { whenCloudBooksReady } from '../lib/cloudLoader';
import { removeUploaded, saveUploaded } from '../lib/ptsbStore';
import { forgetReadingPosition, getReadingPosition, lastReadingPosition, readingPositionPath } from '../lib/readingPosition';
import { SiteHeader } from '../components/SiteHeader';
import { Footer } from '../components/Footer';
import { BookCard } from '../components/ds/BookCard';
import { ResumePanel } from '../components/ds/ResumePanel';
import { ImportDropzone } from '../components/ds/ImportDropzone';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const { auth: authEnabled } = useReaderFeatures();
  const { modal } = App.useApp();
  useDocumentTitle('Libreria');
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
    void Promise.all([whenCloudBooksReady(), whenRemoteBooksReady()]).then(
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
      // Package parsing brings the validator and KaTeX, so it loads only when a file is imported.
      const [buf, { parsePtsbFile, isEncryptedPtsb }] = await Promise.all([file.arrayBuffer(), import('../lib/ptsb')]);
      if (isEncryptedPtsb(buf) && !user) {
        setUploadError(
          authEnabled
            ? 'Questo libro è protetto. Accedi con il tuo account per aprirlo.'
            : 'Questo libro è protetto e richiede la piattaforma PoliTost.',
        );
        return;
      }
      setUploadStatus('Validazione…');
      const bundle = await parsePtsbFile(file);
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
        forgetReadingPosition(id);
        refreshCatalog();
        setUploadStatus(null);
        setUploadWarnings([]);
      },
    });
  }

  const dropState = uploading ? 'busy' : uploadError ? 'error' : uploadStatus ? 'success' : 'idle';
  const last = lastReadingPosition(catalog.map((b) => b.id));
  const lastBook = last && catalog.find((b) => b.id === last.bookId);
  const countLabel = catalog.length === 1 ? '1 libro' : `${catalog.length} libri`;
  const intro = 'Capitoli con formule, formulario, esercizi con soluzioni passo passo, grafici interattivi e laboratorio, in un unico libro digitale.';

  return (
    <div className="site-page home-page">
      <SiteHeader />

      <main id="main-content" className="home-main">
        {last && lastBook ? (
          <ResumePanel
            bookId={lastBook.id}
            subject={lastBook.subject}
            bookTitle={lastBook.title}
            authors={lastBook.authors?.join(', ')}
            position={last.position}
          />
        ) : (
          <section className="home-hero">
            <h1>I tuoi libri di testo, interattivi</h1>
            <p>{intro}</p>
          </section>
        )}

        <section className="home-catalog" aria-labelledby="home-catalog-title">
          <div className="home-catalog-head">
            <h2 id="home-catalog-title">I tuoi libri</h2>
            <span className="home-catalog-count">{countLabel}</span>
          </div>
          {last && lastBook && <p className="home-catalog-note">{intro}</p>}
          <ul className="book-grid">
            {catalog.map((book) => {
              const position = getReadingPosition(book.id);
              return (
                <BookCard
                  key={book.id}
                  subject={book.subject}
                  title={book.title}
                  authors={book.authors?.join(', ')}
                  meta={[book.authors?.join(', '), book.version && `v${book.version}`].filter(Boolean).join(' · ') || undefined}
                  href={`/libro/${book.id}`}
                  source={book.source}
                  licensed={book.access === 'licensed'}
                  reading={book.id === lastBook?.id}
                  resume={position && {
                    href: readingPositionPath(book.id, position),
                    label: `Capitolo ${position.chapterNumber} · ${position.chapterTitle}`,
                    short: `Cap. ${position.chapterNumber}`,
                  }}
                  onRemove={book.source === 'uploaded' ? () => confirmRemove(book.id, book.title) : undefined}
                />
              );
            })}
          </ul>
        </section>

        <section className="home-import no-print" aria-labelledby="home-import-title">
          <div className="home-import-copy">
            <h2 id="home-import-title">Hai un libro digitale?</h2>
            <p>Se hai ricevuto un file dal docente o dall&apos;editore, importalo qui. Il libro resta su questo dispositivo e non viene inviato a nessun server.</p>
          </div>
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

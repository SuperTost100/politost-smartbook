import { lazy, Suspense, useEffect, useCallback, type ReactNode } from 'react';
import { Routes, Route, Navigate, useParams, Outlet, useLocation } from 'react-router-dom';
import { loadSmartbook } from '../lib/loader';
import { auditChapterOpen } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useReaderFeatures } from '../context/ReaderConfigContext';
import { Layout } from '../components/Layout';
import { SmartbookView } from '../components/SmartbookView';
import { FormularioView } from '../components/FormularioView';
import { EserciziView } from '../components/EserciziView';
import { LicenseGate } from '../components/LicenseGate';
import { BookNotFound } from '../components/BookNotFound';
import type { SectionKey } from '../types/smartbook';
import type { SmartbookData } from '../lib/loader';

const IdeView = lazy(() => import('../components/IdeView').then((m) => ({ default: m.IdeView })));
const GraficiView = lazy(() =>
  import('../components/GraficiView').then((m) => ({ default: m.GraficiView })),
);
const PrintPage = lazy(() => import('../print/PrintPage').then((m) => ({ default: m.PrintPage })));

function SectionLoading({ children }: { children?: ReactNode }) {
  return (
    <div className="section-loading" aria-busy="true">
      <div className="app-loading-spinner" aria-hidden />
      <p>{children ?? 'Caricamento sezione…'}</p>
    </div>
  );
}

function useScrollToHash() {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const id = hash.slice(1);
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  }, [hash]);
}

function useBookData(): SmartbookData {
  const { bookId } = useParams<{ bookId: string }>();
  const data = loadSmartbook(bookId ?? '');
  if (!data) throw new Error('Smartbook non trovato');
  return data;
}

function BookShell({
  activeSection,
  showChapterIndex = false,
}: {
  activeSection: SectionKey;
  showChapterIndex?: boolean;
}) {
  const { bookId, chapterId } = useParams<{ bookId: string; chapterId?: string }>();
  const data = useBookData();
  useScrollToHash();

  return (
    <Layout
      bookId={bookId!}
      config={data.config}
      activeSection={activeSection}
      showChapterIndex={showChapterIndex}
      activeChapterId={chapterId}
    >
      <Outlet />
    </Layout>
  );
}

function ChapterContent() {
  const { chapterId, bookId } = useParams<{ chapterId: string; bookId: string }>();
  const { chapters, config, assets } = useBookData();
  const { user } = useAuth();
  const { audit } = useReaderFeatures();
  const chapter = chapters.find((c) => c.meta.id === chapterId);
  const resolveAsset = useCallback((src: string) => assets[src], [assets]);

  useEffect(() => {
    if (audit && user && bookId && config.access === 'licensed' && chapterId) {
      void auditChapterOpen(bookId, chapterId).catch(() => undefined);
    }
  }, [audit, user, bookId, chapterId, config.access]);

  if (!chapter) return <p className="empty-note">Capitolo non trovato.</p>;

  return <SmartbookView bookId={bookId!} chapter={chapter} allChapters={chapters} resolveAsset={resolveAsset} />;
}

function FirstChapterRedirect() {
  const { bookId } = useParams<{ bookId: string }>();
  const { config } = useBookData();
  return <Navigate to={`/libro/${bookId}/capitolo/${config.chapters[0]?.id}`} replace />;
}

function BookRoutes() {
  const { bookId } = useParams<{ bookId: string }>();
  const data = loadSmartbook(bookId ?? '');

  if (!data) return <BookNotFound />;

  return (
    <LicenseGate bookId={bookId!} access={data.config.access ?? 'public'}>
      <Routes>
        <Route
          path="stampa/capitolo/:chapterId"
          element={
            <Suspense fallback={<SectionLoading>Caricamento anteprima di stampa…</SectionLoading>}>
              <PrintPage kind="capitolo" />
            </Suspense>
          }
        />
        <Route
          path="stampa/formulario"
          element={
            <Suspense fallback={<SectionLoading>Caricamento anteprima di stampa…</SectionLoading>}>
              <PrintPage kind="formulario" />
            </Suspense>
          }
        />
        <Route
          path="stampa/esercizi"
          element={
            <Suspense fallback={<SectionLoading>Caricamento anteprima di stampa…</SectionLoading>}>
              <PrintPage kind="esercizi" />
            </Suspense>
          }
        />
        <Route
          path="stampa/esami"
          element={
            <Suspense fallback={<SectionLoading>Caricamento anteprima di stampa…</SectionLoading>}>
              <PrintPage kind="esami" />
            </Suspense>
          }
        />

        <Route element={<BookShell activeSection="smartbook" showChapterIndex />}>
          <Route index element={<FirstChapterRedirect />} />
          <Route path="capitolo/:chapterId" element={<ChapterContent />} />
        </Route>

        <Route element={<BookShell activeSection="formulario" />}>
          <Route path="formulario" element={<FormularioRoute />} />
        </Route>

        <Route element={<BookShell activeSection="esercizi" />}>
          <Route path="esercizi" element={<EserciziRoute />} />
        </Route>

        <Route element={<BookShell activeSection="esami" />}>
          <Route path="esami" element={<EsamiRoute />} />
        </Route>

        <Route element={<BookShell activeSection="ide" />}>
          <Route path="laboratorio" element={<IdeRoute />} />
        </Route>

        <Route element={<BookShell activeSection="grafici" />}>
          <Route path="grafici" element={<GraficiRoute />} />
        </Route>
      </Routes>
    </LicenseGate>
  );
}

export function SmartbookRouter() {
  return (
    <Routes>
      <Route path=":bookId/*" element={<BookRoutes />} />
    </Routes>
  );
}

function FormularioRoute() {
  const { bookId } = useParams<{ bookId: string }>();
  const { chapters } = useBookData();
  return <FormularioView bookId={bookId!} chapters={chapters} />;
}

function EserciziRoute() {
  const { bookId } = useParams<{ bookId: string }>();
  const { esercizi, config, assets } = useBookData();
  const resolveAsset = useCallback((src: string) => assets[src], [assets]);
  return (
    <EserciziView
      bookId={bookId!}
      exercises={esercizi}
      title={config.sections.esercizi.label}
      printSection="esercizi"
      resolveAsset={resolveAsset}
    />
  );
}

function EsamiRoute() {
  const { bookId } = useParams<{ bookId: string }>();
  const { esami, config, assets } = useBookData();
  const resolveAsset = useCallback((src: string) => assets[src], [assets]);
  return (
    <EserciziView
      bookId={bookId!}
      exercises={esami}
      title={config.sections.esami.label}
      printSection="esami"
      resolveAsset={resolveAsset}
    />
  );
}

function IdeRoute() {
  const { ide } = useBookData();
  return (
    <Suspense fallback={<SectionLoading>Caricamento laboratorio…</SectionLoading>}>
      <IdeView snippets={ide} />
    </Suspense>
  );
}

function GraficiRoute() {
  const { grafici } = useBookData();
  return (
    <Suspense fallback={<SectionLoading>Caricamento grafici…</SectionLoading>}>
      <GraficiView grafici={grafici} />
    </Suspense>
  );
}

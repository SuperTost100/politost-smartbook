import { lazy, Suspense, useEffect, useCallback, useMemo, useState, type ReactNode } from 'react';
import { Routes, Route, Navigate, useParams, Outlet, useLocation } from 'react-router-dom';
import { ensureBookContent, loadSmartbook, isCloudBook } from '../lib/loader';
import { useCloudChapter } from '../hooks/useCloudChapter';
import { resolveBookAsset } from '../lib/cloudAssets';
import { firstChapterPath, withLoadedChapter } from '../lib/chapterNav';
import { buildFormulaIndex } from '../lib/parser';
import { auditChapterOpen } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useReaderFeatures } from '../context/ReaderConfigContext';
import { Layout } from '../components/Layout';
import { SmartbookView } from '../components/SmartbookView';
import { FormularioView } from '../components/FormularioView';
import { EserciziView } from '../components/EserciziView';
import { LicenseGate } from '../components/LicenseGate';
import { BookNotFound } from '../components/BookNotFound';
import { NotFoundPage } from './NotFoundPage';
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
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));
    // A cloud chapter renders after its download, so keep looking for the target for a few seconds.
    let tries = 30;
    let timer: ReturnType<typeof setTimeout>;
    const attempt = () => {
      const target = document.getElementById(id);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
      else if (tries-- > 0) timer = setTimeout(attempt, 100);
    };
    timer = setTimeout(attempt, 150);
    return () => clearTimeout(timer);
  }, [hash]);
}

function useBookData(): SmartbookData | null {
  const { bookId } = useParams<{ bookId: string }>();
  return loadSmartbook(bookId ?? '');
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
  if (!data) return <BookNotFound />;

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
  const data = useBookData();
  const { user } = useAuth();
  const { audit } = useReaderFeatures();
  const cloud = isCloudBook(bookId ?? '');
  const {
    chapter: cloudChapter,
    assets: cloudAssets,
    error: cloudError,
    loading: cloudLoading,
  } = useCloudChapter(cloud, bookId, chapterId, data?.config.chapters);
  const assets = data?.assets;
  const resolveAsset = useCallback(
    (src: string) => resolveBookAsset(src, { ...assets, ...cloudAssets }, cloud ? bookId : undefined),
    [assets, cloudAssets, cloud, bookId],
  );

  const staticChapter = data?.chapters.find((c) => c.meta.id === chapterId);
  const chapter = cloud ? cloudChapter : staticChapter;

  useEffect(() => {
    if (audit && user && bookId && data?.config.access === 'licensed' && chapterId && chapter) {
      void auditChapterOpen(bookId, chapterId).catch(() => undefined);
    }
  }, [audit, user, bookId, chapterId, data?.config.access, chapter]);

  if (!data) return <BookNotFound />;
  if (cloudLoading) return <p className="empty-note">Caricamento capitolo…</p>;
  if (cloudError) return <p className="empty-note" role="alert">{cloudError}</p>;
  if (!chapter) return <p className="empty-note">Capitolo non trovato.</p>;

  const allChapters = cloud ? withLoadedChapter(data.chapters, chapter) : data.chapters;
  return (
    <SmartbookView
      key={chapter.meta.id}
      bookId={bookId!}
      chapter={chapter}
      allChapters={allChapters}
      resolveAsset={resolveAsset}
    />
  );
}

function FirstChapterRedirect() {
  const { bookId } = useParams<{ bookId: string }>();
  const data = useBookData();
  if (!data || !bookId) return <BookNotFound />;
  const target = firstChapterPath(bookId, data.config.chapters);
  if (!target) return <p className="empty-note">Questo smartbook non ha capitoli.</p>;
  return <Navigate to={target} replace />;
}

function BookRoutes() {
  const { bookId } = useParams<{ bookId: string }>();
  const [readyFor, setReadyFor] = useState<string | null>(null);
  const contentReady = readyFor === (bookId ?? '');

  useEffect(() => {
    let cancelled = false;
    const id = bookId ?? '';
    void ensureBookContent(id)
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReadyFor(id);
      });
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  if (!contentReady) return <p className="empty-note">Caricamento libro…</p>;

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

        <Route path="*" element={<NotFoundPage />} />
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
  const data = useBookData();
  if (!data || !bookId) return <BookNotFound />;
  return <FormularioView bookId={bookId} chapters={data.chapters} />;
}

function EserciziRoute() {
  const { bookId } = useParams<{ bookId: string }>();
  const data = useBookData();
  const cloud = isCloudBook(bookId ?? '');
  const resolveAsset = useCallback(
    (src: string) => resolveBookAsset(src, data?.assets ?? {}, cloud ? bookId : undefined),
    [data?.assets, cloud, bookId],
  );
  const formulaIndex = useMemo(() => buildFormulaIndex(data?.chapters ?? []), [data?.chapters]);
  if (!data || !bookId) return <BookNotFound />;
  const { esercizi, config } = data;
  return (
    <EserciziView
      bookId={bookId!}
      exercises={esercizi}
      chapters={config.chapters}
      formulaIndex={formulaIndex}
      title={config.sections.esercizi.label}
      printSection="esercizi"
      resolveAsset={resolveAsset}
    />
  );
}

function EsamiRoute() {
  const { bookId } = useParams<{ bookId: string }>();
  const data = useBookData();
  const cloud = isCloudBook(bookId ?? '');
  const resolveAsset = useCallback(
    (src: string) => resolveBookAsset(src, data?.assets ?? {}, cloud ? bookId : undefined),
    [data?.assets, cloud, bookId],
  );
  const formulaIndex = useMemo(() => buildFormulaIndex(data?.chapters ?? []), [data?.chapters]);
  if (!data || !bookId) return <BookNotFound />;
  const { esami, config } = data;
  return (
    <EserciziView
      bookId={bookId!}
      exercises={esami}
      chapters={config.chapters}
      formulaIndex={formulaIndex}
      title={config.sections.esami.label}
      printSection="esami"
      resolveAsset={resolveAsset}
    />
  );
}

function IdeRoute() {
  const data = useBookData();
  if (!data) return <BookNotFound />;
  const { ide } = data;
  return (
    <Suspense fallback={<SectionLoading>Caricamento laboratorio…</SectionLoading>}>
      <IdeView snippets={ide} />
    </Suspense>
  );
}

function GraficiRoute() {
  const data = useBookData();
  if (!data) return <BookNotFound />;
  const { grafici } = data;
  return (
    <Suspense fallback={<SectionLoading>Caricamento grafici…</SectionLoading>}>
      <GraficiView grafici={grafici} />
    </Suspense>
  );
}

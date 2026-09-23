import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';
import { ReaderConfigProvider } from './context/ReaderConfigContext';
import { AuthProvider } from './context/AuthContext';
import { CookieConsentInit } from './lib/cookieConsent';
import { InstallBanner } from './components/InstallBanner';
import { initBuiltinBooks, initUploadedBooks } from './lib/loader';
import { initCloudBooks } from './lib/cloudLoader';
import { Home } from './pages/Home';
import { AuthPage } from './pages/AuthPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { AcceptTermsPage } from './pages/AcceptTermsPage';
import { RedeemPage } from './pages/RedeemPage';
import { getReaderConfig } from './config/readerConfig';
import { useReaderFeatures } from './context/ReaderConfigContext';

const SmartbookRouter = lazy(() =>
  import('./pages/SmartbookPage').then((m) => ({ default: m.SmartbookRouter })),
);
const LegalPage = lazy(() => import('./pages/LegalPage').then((m) => ({ default: m.LegalPage })));
const DocsPage = lazy(() => import('./pages/DocsPage').then((m) => ({ default: m.DocsPage })));

const queryClient = new QueryClient();

function AppRoutes() {
  const { auth: authEnabled } = useReaderFeatures();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        {authEnabled && (
          <>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/auth/accept-terms" element={<AcceptTermsPage />} />
            <Route path="/redeem" element={<RedeemPage />} />
          </>
        )}
        <Route
          path="/termini"
          element={
            <Suspense fallback={<div className="app-loading"><p>Caricamento…</p></div>}>
              <LegalPage doc="tos" />
            </Suspense>
          }
        />
        <Route
          path="/privacy"
          element={
            <Suspense fallback={<div className="app-loading"><p>Caricamento…</p></div>}>
              <LegalPage doc="privacy" />
            </Suspense>
          }
        />
        <Route
          path="/cookie"
          element={
            <Suspense fallback={<div className="app-loading"><p>Caricamento…</p></div>}>
              <LegalPage doc="cookie" />
            </Suspense>
          }
        />
        <Route
          path="/docs"
          element={
            <Suspense fallback={<div className="app-loading"><p>Caricamento…</p></div>}>
              <DocsPage />
            </Suspense>
          }
        />
        <Route
          path="/libro/*"
          element={
            <Suspense fallback={<div className="app-loading"><p>Caricamento libro…</p></div>}>
              <SmartbookRouter />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const cloudEnabled = getReaderConfig().features?.cloud;
    const jobs: Promise<unknown>[] = [
      initBuiltinBooks().catch(console.error),
      initUploadedBooks(null).catch(console.error),
    ];
    if (cloudEnabled) jobs.push(initCloudBooks().catch(console.error));
    void Promise.all(jobs).finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" aria-hidden />
        <p>Caricamento Politost Smartbook…</p>
      </div>
    );
  }

  return (
    <ReaderConfigProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <CookieConsentInit />
            <AppRoutes />
            <InstallBanner />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ReaderConfigProvider>
  );
}

import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';
import { ReaderConfigProvider } from './context/ReaderConfigContext';
import { AuthProvider } from './context/AuthContext';
import { CookieConsentInit } from './lib/cookieConsent';
import { initUploadedBooks } from './lib/loader';
import { useReaderFeatures } from './context/ReaderConfigContext';
import { Home } from './pages/Home';

const AuthPage = lazy(() => import('./pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const AuthCallbackPage = lazy(() =>
  import('./pages/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })),
);
const AcceptTermsPage = lazy(() =>
  import('./pages/AcceptTermsPage').then((m) => ({ default: m.AcceptTermsPage })),
);
const SmartbookRouter = lazy(() =>
  import('./pages/SmartbookPage').then((m) => ({ default: m.SmartbookRouter })),
);
const LegalPage = lazy(() => import('./pages/LegalPage').then((m) => ({ default: m.LegalPage })));
const DocsPage = lazy(() => import('./pages/DocsPage').then((m) => ({ default: m.DocsPage })));

const queryClient = new QueryClient();

function AppRoutes() {
  const { auth } = useReaderFeatures();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        {auth && (
          <>
            <Route
              path="/auth"
              element={
                <Suspense fallback={<div className="app-loading"><p>Caricamento…</p></div>}>
                  <AuthPage />
                </Suspense>
              }
            />
            <Route
              path="/auth/callback"
              element={
                <Suspense fallback={<div className="app-loading"><p>Caricamento…</p></div>}>
                  <AuthCallbackPage />
                </Suspense>
              }
            />
            <Route
              path="/auth/accept-terms"
              element={
                <Suspense fallback={<div className="app-loading"><p>Caricamento…</p></div>}>
                  <AcceptTermsPage />
                </Suspense>
              }
            />
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
    initUploadedBooks()
      .catch(console.error)
      .finally(() => setReady(true));
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
    <QueryClientProvider client={queryClient}>
      <ReaderConfigProvider>
        <ThemeProvider>
          <AuthProvider>
            <CookieConsentInit />
            <AppRoutes />
          </AuthProvider>
        </ThemeProvider>
      </ReaderConfigProvider>
    </QueryClientProvider>
  );
}

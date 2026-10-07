import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  fetchConsentStatus,
  fetchMe,
  googleLoginUrl,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  recordConsent,
  type AuthUser,
} from '../lib/api';
import { useReaderFeatures } from './ReaderConfigContext';
import { unregisterUploadedBook } from '../lib/loader';
import { removeUploadedForUser } from '../lib/ptsbStore';
import { consentIsCurrent } from '../lib/consentVersion';
import versions from '../legal/versions.json';
import { rememberOAuthNext } from '../lib/safeNext';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  hasConsent: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, tos: string, privacy: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: (nextPath?: string | null) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { auth: authEnabled } = useReaderFeatures();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hasConsent, setHasConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(authEnabled !== false);

  const refresh = useCallback(async () => {
    if (!authEnabled) {
      setUser(null);
      setHasConsent(false);
      setIsLoading(false);
      return;
    }
    try {
      const me = await fetchMe();
      setUser(me);
      const consent = await fetchConsentStatus();
      setHasConsent(consentIsCurrent(consent, versions));
    } catch {
      setUser(null);
      setHasConsent(false);
    } finally {
      setIsLoading(false);
    }
  }, [authEnabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    await apiLogin(email, password);
    await refresh();
  }, [refresh]);

  const register = useCallback(async (email: string, password: string, tos: string, privacy: string) => {
    await apiRegister({ email, password, tos_version: tos, privacy_version: privacy });
    await apiLogin(email, password);
    await recordConsent(tos, privacy);
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    const leavingId = user?.id;
    await apiLogout();
    if (leavingId) {
      try {
        const ids = await removeUploadedForUser(leavingId);
        for (const id of ids) unregisterUploadedBook(id);
      } catch (err) {
        console.error(err);
      }
    }
    setUser(null);
    setHasConsent(false);
  }, [user]);

  const loginWithGoogle = useCallback((nextPath?: string | null) => {
    rememberOAuthNext(nextPath);
    window.location.href = googleLoginUrl(nextPath);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, hasConsent, refresh, login, register, logout, loginWithGoogle }),
    [user, isLoading, hasConsent, refresh, login, register, logout, loginWithGoogle],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth richiede AuthProvider');
  return ctx;
}

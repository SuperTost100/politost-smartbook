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

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  hasConsent: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, tos: string, privacy: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const disabledAuthState: AuthState = {
  user: null,
  isLoading: false,
  hasConsent: false,
  refresh: async () => undefined,
  login: async () => undefined,
  register: async () => undefined,
  logout: async () => undefined,
  loginWithGoogle: () => undefined,
};

function EnabledAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hasConsent, setHasConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await fetchMe();
      setUser(me);
      const consent = await fetchConsentStatus();
      setHasConsent(consent.has_consent);
    } catch {
      setUser(null);
      setHasConsent(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    await apiLogout();
    setUser(null);
    setHasConsent(false);
  }, []);

  const loginWithGoogle = useCallback(() => {
    window.location.href = googleLoginUrl();
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, hasConsent, refresh, login, register, logout, loginWithGoogle }),
    [user, isLoading, hasConsent, refresh, login, register, logout, loginWithGoogle],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { auth } = useReaderFeatures();
  if (!auth) {
    return <AuthContext.Provider value={disabledAuthState}>{children}</AuthContext.Provider>;
  }
  return <EnabledAuthProvider>{children}</EnabledAuthProvider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth richiede AuthProvider');
  return ctx;
}

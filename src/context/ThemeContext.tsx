import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { hasFunctionalConsent } from '../lib/cookieConsent';

type Theme = 'light' | 'dark';

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function storedTheme(): Theme | null {
  const saved = localStorage.getItem('politost-theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return null;
}

function initialTheme(): Theme {
  const saved = storedTheme();
  const choice = localStorage.getItem('cc_cookie');
  if (!choice) return saved ?? systemTheme();
  if (hasFunctionalConsent()) return saved ?? systemTheme();
  if (saved) localStorage.removeItem('politost-theme');
  return systemTheme();
}

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('cc--darkmode', theme === 'dark');
    if (hasFunctionalConsent()) localStorage.setItem('politost-theme', theme);
  }, [theme]);

  useEffect(() => {
    const sync = () => {
      if (hasFunctionalConsent()) localStorage.setItem('politost-theme', theme);
      else localStorage.removeItem('politost-theme');
    };
    window.addEventListener('cc:onConsent', sync);
    window.addEventListener('cc:onChange', sync);
    return () => {
      window.removeEventListener('cc:onConsent', sync);
      window.removeEventListener('cc:onChange', sync);
    };
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

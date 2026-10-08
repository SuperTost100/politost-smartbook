import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const STORAGE_KEY = 'politost-theme';

/** The theme the reader picked with the toggle; without one, the system theme. */
function initialTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'dark' || saved === 'light' ? saved : systemTheme();
}

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Until the reader picks a theme, follow the system when it switches (e.g. at sunset).
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (!localStorage.getItem(STORAGE_KEY)) setTheme(mq.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // A preference the reader asked for: storing it needs no consent (no banner).
  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    localStorage.setItem(STORAGE_KEY, next);
    setTheme(next);
  };

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

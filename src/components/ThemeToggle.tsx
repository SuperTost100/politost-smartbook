import { Tooltip } from 'antd';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';

  return (
    <Tooltip title={dark ? 'Tema chiaro' : 'Tema scuro'}>
      <button
        type="button"
        className="sb-icon-btn theme-toggle"
        onClick={toggleTheme}
        aria-label={dark ? 'Attiva tema chiaro' : 'Attiva tema scuro'}
      >
        {dark ? <Sun size={20} strokeWidth={1.75} aria-hidden /> : <Moon size={20} strokeWidth={1.75} aria-hidden />}
      </button>
    </Tooltip>
  );
}

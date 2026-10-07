import { Button, Tooltip } from 'antd';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';

  return (
    <Tooltip title={dark ? 'Tema chiaro' : 'Tema scuro'}>
      <Button
        shape="circle"
        type="text"
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label={dark ? 'Attiva tema chiaro' : 'Attiva tema scuro'}
        icon={dark ? <Sun size={20} strokeWidth={1.75} /> : <Moon size={20} strokeWidth={1.75} />}
      />
    </Tooltip>
  );
}

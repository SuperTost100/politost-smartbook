import { ptsbColors, FONT_MONO } from '../../design-system/theme/ptsb-theme';
import { useTheme } from '../context/ThemeContext';

/** Plot colours from the design tokens (chart-1..3, chart-grid, border-control), following the theme. */
export function useChartColors() {
  const { theme } = useTheme();
  const c = ptsbColors[theme];
  return {
    series: [c.primaryText, c.info, c.star],
    surface: c.surface,
    grid: c.border,
    axis: c.borderControl,
    ink: c.ink,
    tick: c.inkSubtle,
    font: FONT_MONO,
  };
}

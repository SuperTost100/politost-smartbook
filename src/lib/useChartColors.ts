import { useMemo } from 'react';
import { ptsbColors, FONT_SANS } from '../../design-system/theme/ptsb-theme';
import { useTheme } from '../context/ThemeContext';

/** Plot colours from the design tokens (chart-1..3, chart-grid, border-control), following the theme. */
export function useChartColors() {
  const { theme } = useTheme();
  return useMemo(() => {
    const c = ptsbColors[theme];
    return {
      series: [c.primaryText, c.info, c.star],
      surface: c.page,
      grid: c.border,
      axis: c.borderControl,
      ink: c.ink,
      tick: c.inkSubtle,
      font: FONT_SANS,
    };
  }, [theme]);
}

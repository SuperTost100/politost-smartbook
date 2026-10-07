import type { ReactNode } from 'react';
import { ConfigProvider, App as AntApp } from 'antd';
import itIT from 'antd/locale/it_IT';
import { ptsbTheme } from '../../design-system/theme/ptsb-theme';
import { useTheme } from './ThemeContext';

/** antd theme + locale + App (modal/message context), driven by ThemeContext. */
export function AntdProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <ConfigProvider theme={ptsbTheme(theme)} locale={itIT}>
      <AntApp component={false}>{children}</AntApp>
    </ConfigProvider>
  );
}

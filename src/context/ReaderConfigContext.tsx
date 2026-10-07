import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  defaultReaderConfig,
  getReaderConfig,
  setReaderConfig,
  type ReaderConfig,
} from '../config/readerConfig';

const ReaderConfigContext = createContext<ReaderConfig>(defaultReaderConfig);

export function ReaderConfigProvider({
  config = getReaderConfig(),
  children,
}: {
  config?: ReaderConfig;
  children: ReactNode;
}) {
  const value = useMemo(() => {
    setReaderConfig(config);
    return getReaderConfig();
  }, [config]);

  return <ReaderConfigContext.Provider value={value}>{children}</ReaderConfigContext.Provider>;
}

export function useReaderConfig(): ReaderConfig {
  return useContext(ReaderConfigContext);
}

export function useReaderFeatures(): NonNullable<ReaderConfig['features']> {
  const { features } = useReaderConfig();
  return features ?? defaultReaderConfig.features!;
}

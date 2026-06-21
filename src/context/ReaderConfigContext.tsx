import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  defaultReaderConfig,
  resolveFeatures,
  type ReaderConfig,
  type ReaderFeatures,
} from '../config/readerConfig';

interface ReaderConfigState {
  config: ReaderConfig;
  features: ReaderFeatures;
}

const ReaderConfigContext = createContext<ReaderConfigState | null>(null);

export function ReaderConfigProvider({
  config = defaultReaderConfig,
  children,
}: {
  config?: ReaderConfig;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ config, features: resolveFeatures(config) }),
    [config],
  );
  return <ReaderConfigContext.Provider value={value}>{children}</ReaderConfigContext.Provider>;
}

export function useReaderConfig(): ReaderConfigState {
  const ctx = useContext(ReaderConfigContext);
  if (!ctx) throw new Error('useReaderConfig richiede ReaderConfigProvider');
  return ctx;
}

export function useReaderFeatures(): ReaderFeatures {
  return useReaderConfig().features;
}

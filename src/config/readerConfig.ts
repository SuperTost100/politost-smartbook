export interface ReaderConfig {
  apiBaseUrl?: string;
  features?: {
    auth?: boolean;
    drm?: boolean;
    cloud?: boolean;
    audit?: boolean;
    watermark?: boolean;
  };
}

export const defaultReaderConfig: ReaderConfig = {
  features: { auth: false, drm: false, cloud: false, audit: false, watermark: false },
};

/** Monorepo platform shell — auth + DRM enabled. OSS reader uses defaultReaderConfig. */
export const platformReaderConfig: ReaderConfig = {
  apiBaseUrl: import.meta.env?.VITE_API_URL ?? '',
  features: { auth: true, drm: true, cloud: true, audit: true, watermark: true },
};

let activeConfig: ReaderConfig = { ...defaultReaderConfig, features: { ...defaultReaderConfig.features } };

function mergeConfig(config: ReaderConfig): ReaderConfig {
  return {
    ...defaultReaderConfig,
    ...config,
    features: { ...defaultReaderConfig.features, ...config.features },
  };
}

export function setReaderConfig(config: ReaderConfig): void {
  activeConfig = mergeConfig(config);
}

export function getReaderConfig(): ReaderConfig {
  return activeConfig;
}

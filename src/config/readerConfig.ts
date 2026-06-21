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
  features: {
    auth: false,
    drm: false,
    cloud: false,
    audit: false,
    watermark: false,
  },
};

export type ReaderFeatures = Required<NonNullable<ReaderConfig['features']>>;

export function resolveFeatures(config: ReaderConfig): ReaderFeatures {
  return {
    auth: config.features?.auth ?? false,
    drm: config.features?.drm ?? false,
    cloud: config.features?.cloud ?? false,
    audit: config.features?.audit ?? false,
    watermark: config.features?.watermark ?? false,
  };
}

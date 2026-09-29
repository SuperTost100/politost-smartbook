import type { PtsbBundle } from '@politost/content-core';

export type { PtsbManifest } from '@politost/content-core';

/** A parsed package as the reader stores it in IndexedDB. */
export interface StoredBookBundle extends Omit<PtsbBundle, 'manifest' | 'assets' | 'warnings'> {
  assets?: Record<string, Uint8Array>;
  /** Older IndexedDB records predate persisted validation warnings. */
  warnings?: string[];
  importedAt: string;
  userId?: string;
}

export interface PtsbEncryptedHeader {
  id: string;
  title: string;
  subject?: string;
  access: 'public' | 'licensed';
  iv: string;
  wrapIv: string;
  wrappedKey: string;
}

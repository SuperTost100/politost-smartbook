import type { IdeSnippet, GraficoConfig, SmartbookConfig } from '../types/smartbook';

export interface StoredBookBundle {
  config: SmartbookConfig;
  chapterFiles: Record<string, string>;
  eserciziRaw: string;
  esamiRaw: string;
  ide: IdeSnippet[];
  grafici: GraficoConfig[];
  assets?: Record<string, Uint8Array>;
  importedAt: string;
  userId?: string;
}

export interface PtsbManifest {
  formatVersion: number;
  packageType: string;
  encrypted: boolean;
  access: 'public' | 'licensed';
  createdAt: string;
  producer?: string;
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

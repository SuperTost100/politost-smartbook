import type { SmartbookConfig, Chapter, Exercise, IdeSnippet, GraficoConfig } from '../types/smartbook';
import type { StoredBookBundle } from '../types/ptsb';
import { buildAssetUrlMap, revokeAssetUrls } from './assetResolver';
import { parseChapterMarkdown, parseExercises } from './parser';
import { listUploaded } from './ptsbStore';

export interface SmartbookData {
  config: SmartbookConfig;
  chapters: Chapter[];
  esercizi: Exercise[];
  esami: Exercise[];
  ide: IdeSnippet[];
  grafici: GraficoConfig[];
  assets: Record<string, string>;
}

export interface CatalogEntry {
  id: string;
  title: string;
  subject: string;
  source: 'builtin' | 'uploaded';
  access?: 'public' | 'licensed';
}

export interface BookBundle {
  config: SmartbookConfig;
  folder: string;
  chapterFiles: Record<string, string>;
  eserciziRaw: string;
  esamiRaw: string;
  ide: IdeSnippet[];
  grafici: GraficoConfig[];
  assets: Record<string, string>;
}

const configModules = import.meta.glob('../content/*/smartbook.json', {
  eager: true,
  import: 'default',
}) as Record<string, SmartbookConfig>;

const chapterModules = import.meta.glob('../content/*/chapters/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const eserciziModules = import.meta.glob('../content/*/esercizi.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const esamiModules = import.meta.glob('../content/*/esami.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const ideModules = import.meta.glob('../content/*/ide.json', {
  eager: true,
  import: 'default',
}) as Record<string, IdeSnippet[]>;

const graficiModules = import.meta.glob('../content/*/grafici.json', {
  eager: true,
  import: 'default',
}) as Record<string, GraficoConfig[]>;

const assetModules = import.meta.glob('../content/*/assets/**', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function folderFromPath(path: string): string | null {
  return path.match(/\/content\/([^/]+)\//)?.[1] ?? null;
}

function filesForFolder<T>(modules: Record<string, T>, folder: string, suffix: string): T | undefined {
  return modules[`../content/${folder}/${suffix}`];
}

function resolveBuiltinAssetUrl(folder: string, rel: string, url: string): string {
  // Vite inlines small SVGs as data: URLs; <img> often fails to size them correctly.
  if (rel.endsWith('.svg') && url.startsWith('data:')) {
    return import.meta.env.DEV
      ? `/src/content/${folder}/assets/${rel}`
      : url;
  }
  return url;
}

function assetsForFolder(folder: string): Record<string, string> {
  const prefix = `../content/${folder}/assets/`;
  const assets: Record<string, string> = {};
  for (const [path, url] of Object.entries(assetModules)) {
    if (path.startsWith(prefix)) {
      const rel = path.slice(prefix.length);
      assets[`assets/${rel}`] = resolveBuiltinAssetUrl(folder, rel, url);
    }
  }
  return assets;
}

function chapterFilesForFolder(folder: string): Record<string, string> {
  const prefix = `../content/${folder}/chapters/`;
  const files: Record<string, string> = {};
  for (const [path, content] of Object.entries(chapterModules)) {
    if (path.startsWith(prefix)) {
      files[path.slice(prefix.length)] = content;
    }
  }
  return files;
}

function buildBuiltinRegistry(): Map<string, BookBundle> {
  const registry = new Map<string, BookBundle>();

  for (const [path, config] of Object.entries(configModules)) {
    const folder = folderFromPath(path);
    if (!folder) continue;

    registry.set(config.id, {
      config: { ...config, access: config.access ?? 'public' },
      folder,
      chapterFiles: chapterFilesForFolder(folder),
      eserciziRaw: filesForFolder(eserciziModules, folder, 'esercizi.md') ?? '',
      esamiRaw: filesForFolder(esamiModules, folder, 'esami.md') ?? '',
      ide: filesForFolder(ideModules, folder, 'ide.json') ?? [],
      grafici: filesForFolder(graficiModules, folder, 'grafici.json') ?? [],
      assets: assetsForFolder(folder),
    });
  }

  return registry;
}

const builtinRegistry = buildBuiltinRegistry();
let uploadedRegistry = new Map<string, BookBundle>();
const uploadedAssetUrls = new Map<string, Record<string, string>>();

function storedToBundle(stored: StoredBookBundle): BookBundle {
  const assetUrls = buildAssetUrlMap(stored.assets ?? {});
  uploadedAssetUrls.set(stored.config.id, assetUrls);
  return {
    config: stored.config,
    folder: `uploaded:${stored.config.id}`,
    chapterFiles: stored.chapterFiles,
    eserciziRaw: stored.eserciziRaw,
    esamiRaw: stored.esamiRaw,
    ide: stored.ide,
    grafici: stored.grafici,
    assets: assetUrls,
  };
}

export async function initUploadedBooks(): Promise<void> {
  for (const urls of uploadedAssetUrls.values()) {
    revokeAssetUrls(urls);
  }
  uploadedAssetUrls.clear();
  const items = await listUploaded();
  uploadedRegistry = new Map(items.map((s) => [s.config.id, storedToBundle(s)]));
}

export function registerUploadedBook(stored: StoredBookBundle): void {
  const existing = uploadedAssetUrls.get(stored.config.id);
  if (existing) revokeAssetUrls(existing);
  uploadedRegistry.set(stored.config.id, storedToBundle(stored));
}

export function unregisterUploadedBook(id: string): void {
  const urls = uploadedAssetUrls.get(id);
  if (urls) revokeAssetUrls(urls);
  uploadedAssetUrls.delete(id);
  uploadedRegistry.delete(id);
}

export function isBuiltinBook(id: string): boolean {
  return builtinRegistry.has(id);
}

function loadBundle(id: string): BookBundle | undefined {
  return uploadedRegistry.get(id) ?? builtinRegistry.get(id);
}

function bundleToData(bundle: BookBundle): SmartbookData {
  const { config, chapterFiles, eserciziRaw, esamiRaw, ide, grafici, assets } = bundle;
  const chapters = config.chapters.map((meta) => {
    const raw = chapterFiles[meta.file] ?? '';
    const parsed = parseChapterMarkdown(raw, meta.number);
    parsed.meta = meta;
    return parsed;
  });
  return {
    config,
    chapters,
    esercizi: parseExercises(eserciziRaw, 'esercizio'),
    esami: parseExercises(esamiRaw, 'esame'),
    ide,
    grafici,
    assets,
  };
}

export function smartbookExists(id: string): boolean {
  return loadBundle(id) !== undefined;
}

export function loadSmartbook(id: string): SmartbookData | null {
  const bundle = loadBundle(id);
  if (!bundle) return null;
  return bundleToData(bundle);
}

export function getCatalog(): CatalogEntry[] {
  const seen = new Set<string>();
  const entries: CatalogEntry[] = [];

  for (const { config } of builtinRegistry.values()) {
    seen.add(config.id);
    entries.push({
      id: config.id,
      title: config.title,
      subject: config.subject,
      source: 'builtin',
      access: config.access ?? 'public',
    });
  }

  for (const { config } of uploadedRegistry.values()) {
    if (seen.has(config.id)) continue;
    entries.push({
      id: config.id,
      title: config.title,
      subject: config.subject,
      source: 'uploaded',
      access: config.access ?? 'public',
    });
  }

  entries.sort((a, b) => a.title.localeCompare(b.title, 'it'));
  const demoIdx = entries.findIndex((e) => e.id === 'esempio');
  if (demoIdx > 0) {
    const [demo] = entries.splice(demoIdx, 1);
    entries.unshift(demo);
  }
  return entries;
}

/** @deprecated use getCatalog() */
export const smartbooks = getCatalog();

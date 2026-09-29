import type { SmartbookConfig, Chapter, Exercise, IdeSnippet, GraficoConfig } from '../types/smartbook';
import type { StoredBookBundle } from '../types/ptsb';
import { buildAssetUrlMap, revokeAssetUrls } from './assetResolver';
import { parseChapterMarkdown, parseExercises } from './parser';
import { cachedByBundle } from './bundleCache';
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
  source: 'builtin' | 'uploaded' | 'cloud';
  access?: 'public' | 'licensed';
  authors?: string[];
  version?: string;
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
  delivery?: 'local' | 'cloud';
  /** Builtin chapter files and assets are filled when that book opens. */
  contentLoaded?: boolean;
}

const configLoaders = import.meta.glob('../content/*/smartbook.json', {
  import: 'default',
}) as Record<string, () => Promise<SmartbookConfig>>;

const chapterLoaders = import.meta.glob('../content/*/chapters/*.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

const eserciziLoaders = import.meta.glob('../content/*/esercizi.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

const esamiLoaders = import.meta.glob('../content/*/esami.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

const ideLoaders = import.meta.glob('../content/*/ide.json', {
  import: 'default',
}) as Record<string, () => Promise<IdeSnippet[]>>;

const graficiLoaders = import.meta.glob('../content/*/grafici.json', {
  import: 'default',
}) as Record<string, () => Promise<GraficoConfig[]>>;

const assetLoaders = import.meta.glob('../content/*/assets/**', {
  query: '?url',
  import: 'default',
}) as Record<string, () => Promise<string>>;

function folderFromPath(path: string): string | null {
  return path.match(/\/content\/([^/]+)\//)?.[1] ?? null;
}

async function loadOne<T>(
  modules: Record<string, () => Promise<T>>,
  folder: string,
  suffix: string,
): Promise<T | undefined> {
  const load = modules[`../content/${folder}/${suffix}`];
  return load ? load() : undefined;
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

async function assetsForFolder(folder: string): Promise<Record<string, string>> {
  const prefix = `../content/${folder}/assets/`;
  const assets: Record<string, string> = {};
  await Promise.all(
    Object.entries(assetLoaders).filter(([path]) => path.startsWith(prefix)).map(async ([path, load]) => {
      const rel = path.slice(prefix.length);
      assets[`assets/${rel}`] = resolveBuiltinAssetUrl(folder, rel, await load());
    }),
  );
  return assets;
}

async function chapterFilesForFolder(folder: string): Promise<Record<string, string>> {
  const prefix = `../content/${folder}/chapters/`;
  const files: Record<string, string> = {};
  await Promise.all(
    Object.entries(chapterLoaders).filter(([path]) => path.startsWith(prefix)).map(async ([path, load]) => {
      files[path.slice(prefix.length)] = await load();
    }),
  );
  return files;
}

const builtinRegistry = new Map<string, BookBundle>();
let builtinInit: Promise<void> | null = null;

export function initBuiltinBooks(): Promise<void> {
  if (!builtinInit) {
    builtinInit = (async () => {
      await Promise.all(
        Object.entries(configLoaders).map(async ([path, load]) => {
          const folder = folderFromPath(path);
          if (!folder) return;
          const config = await load();
          builtinRegistry.set(config.id, {
            config: { ...config, access: config.access ?? 'public' },
            folder,
            chapterFiles: {},
            eserciziRaw: '',
            esamiRaw: '',
            ide: [],
            grafici: [],
            assets: {},
            contentLoaded: false,
          });
        }),
      );
    })();
  }
  return builtinInit;
}

const contentLoads = new Map<string, Promise<void>>();

/** Chapter markdown and assets for one builtin book, when that book opens. */
export function ensureBookContent(id: string): Promise<void> {
  const pending = contentLoads.get(id);
  if (pending) return pending;
  const job = loadBuiltinContent(id).catch((err) => {
    contentLoads.delete(id);
    throw err;
  });
  contentLoads.set(id, job);
  return job;
}

async function loadBuiltinContent(id: string): Promise<void> {
  await initBuiltinBooks();
  const bundle = builtinRegistry.get(id);
  if (!bundle || bundle.contentLoaded) return;
  const folder = bundle.folder;
  const [chapterFiles, eserciziRaw, esamiRaw, ide, grafici, assets] = await Promise.all([
    chapterFilesForFolder(folder),
    loadOne(eserciziLoaders, folder, 'esercizi.md'),
    loadOne(esamiLoaders, folder, 'esami.md'),
    loadOne(ideLoaders, folder, 'ide.json'),
    loadOne(graficiLoaders, folder, 'grafici.json'),
    assetsForFolder(folder),
  ]);
  bundle.chapterFiles = chapterFiles;
  bundle.eserciziRaw = eserciziRaw ?? '';
  bundle.esamiRaw = esamiRaw ?? '';
  bundle.ide = ide ?? [];
  bundle.grafici = grafici ?? [];
  bundle.assets = assets;
  bundle.contentLoaded = true;
  dataCache.delete(id);
}

let uploadedRegistry = new Map<string, BookBundle>();
const cloudRegistry = new Map<string, BookBundle>();
const dataCache = new Map<string, { bundle: object; data: SmartbookData }>();
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

export async function initUploadedBooks(userId: string | null): Promise<void> {
  for (const urls of uploadedAssetUrls.values()) {
    revokeAssetUrls(urls);
  }
  uploadedAssetUrls.clear();
  const items = await listUploaded(userId);
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

export function isCloudBook(id: string): boolean {
  return cloudRegistry.has(id);
}

export function registerCloudBook(bundle: BookBundle): void {
  cloudRegistry.set(bundle.config.id, { ...bundle, delivery: 'cloud' });
}

export function setCloudBookAssets(bookId: string, assets: Record<string, string>): void {
  const bundle = cloudRegistry.get(bookId);
  if (!bundle) return;
  // Mutate the map already held by a cached SmartbookData so a chapter fetch does not reparse.
  Object.assign(bundle.assets, assets);
}

export function readCloudAssets(bookId: string): Record<string, string> {
  return { ...(cloudRegistry.get(bookId)?.assets ?? {}) };
}

export function clearCloudBooks(): void {
  cloudRegistry.clear();
}

function loadBundle(id: string): BookBundle | undefined {
  return cloudRegistry.get(id) ?? uploadedRegistry.get(id) ?? builtinRegistry.get(id);
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
  return cachedByBundle(dataCache, id, bundle, () => bundleToData(bundle));
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
      authors: config.authors,
      version: config.version,
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
      authors: config.authors,
      version: config.version,
    });
  }

  for (const { config } of cloudRegistry.values()) {
    if (seen.has(config.id)) continue;
    seen.add(config.id);
    entries.push({
      id: config.id,
      title: config.title,
      subject: config.subject,
      source: 'cloud',
      access: config.access ?? 'licensed',
      authors: config.authors,
      version: config.version,
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

import type { SmartbookConfig, Chapter, Exercise, IdeSnippet, GraficoConfig } from '../types/smartbook';
import type { StoredBookBundle } from '../types/ptsb';
import { buildAssetUrlMap, revokeAssetUrls } from './assetResolver';
import { parseChapterMarkdown, parseExercises } from './parser';
import { cachedByBundle } from './bundleCache';
import { listUploaded } from './ptsbStore';
import { booksBaseUrl, fetchRemoteBook, fetchRemoteCatalog, type RemoteCatalogEntry } from './remoteCatalog';

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
  source: 'builtin' | 'uploaded' | 'remote' | 'cloud';
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

/**
 * Chapter markdown and assets for one book, when that book opens: the remote package when the
 * books site lists it, otherwise the builtin files. Remote wins over builtin, uploaded over both.
 */
export function ensureBookContent(id: string): Promise<void> {
  const pending = contentLoads.get(id);
  if (pending) return pending;
  const job = loadContent(id).catch((err) => {
    contentLoads.delete(id);
    throw err;
  });
  contentLoads.set(id, job);
  return job;
}

async function loadContent(id: string): Promise<void> {
  await remoteReady;
  const remote = remoteRegistry.get(id);
  if (remote && !remote.bundle && !uploadedRegistry.has(id) && !cloudRegistry.has(id)) {
    try {
      const stored = await fetchRemoteBook(remote.entry);
      remote.bundle = storedToBundle(stored, remoteAssetUrls, 'remote');
      dataCache.delete(id);
      return;
    } catch (err) {
      // The builtin copy, if any, is the offline fallback.
      if (!builtinRegistry.has(id)) throw err;
      console.warn(`Libro ${id} dal catalogo remoto non disponibile, uso la copia inclusa:`, err);
    }
  }
  await loadBuiltinContent(id);
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
const remoteAssetUrls = new Map<string, Record<string, string>>();

function storedToBundle(
  stored: StoredBookBundle,
  urlMaps: Map<string, Record<string, string>> = uploadedAssetUrls,
  kind: 'uploaded' | 'remote' = 'uploaded',
): BookBundle {
  const assetUrls = buildAssetUrlMap(stored.assets ?? {});
  urlMaps.set(stored.config.id, assetUrls);
  return {
    config: stored.config,
    folder: `${kind}:${stored.config.id}`,
    chapterFiles: stored.chapterFiles,
    eserciziRaw: stored.eserciziRaw,
    esamiRaw: stored.esamiRaw,
    ide: stored.ide,
    grafici: stored.grafici,
    assets: assetUrls,
  };
}

let uploadedInitGeneration = 0;

export async function initUploadedBooks(userId: string | null): Promise<void> {
  const generation = ++uploadedInitGeneration;
  const items = await listUploaded(userId);
  // A newer user's load owns the registry. Do not create blob URLs for stale results.
  if (generation !== uploadedInitGeneration) return;
  for (const urls of uploadedAssetUrls.values()) revokeAssetUrls(urls);
  uploadedAssetUrls.clear();
  uploadedRegistry = new Map(items.map((s) => [s.config.id, storedToBundle(s)]));
  dataCache.clear();
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
  // The remote copy, if any, has not been fetched while the upload shadowed it.
  contentLoads.delete(id);
}

const remoteRegistry = new Map<string, { entry: RemoteCatalogEntry; bundle?: BookBundle }>();
let remoteReady: Promise<void> = Promise.resolve();

/**
 * List the books of the books site (`VITE_BOOKS_URL`). Packages download when a book opens.
 * A failed fetch leaves the builtin and uploaded books, so the home page is never empty.
 */
export function initRemoteBooks(): Promise<void> {
  const base = booksBaseUrl();
  if (!base) return remoteReady;
  remoteReady = fetchRemoteCatalog(base).then(
    (entries) => {
      for (const urls of remoteAssetUrls.values()) revokeAssetUrls(urls);
      remoteAssetUrls.clear();
      remoteRegistry.clear();
      for (const entry of entries) remoteRegistry.set(entry.id, { entry });
    },
    (err) => console.warn('Catalogo remoto non disponibile:', err),
  );
  return remoteReady;
}

export function whenRemoteBooksReady(): Promise<void> {
  return remoteReady;
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
  return cloudRegistry.get(id) ?? uploadedRegistry.get(id) ?? remoteRegistry.get(id)?.bundle ?? builtinRegistry.get(id);
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
  return loadBundle(id) !== undefined || remoteRegistry.has(id);
}

export function loadSmartbook(id: string): SmartbookData | null {
  const bundle = loadBundle(id);
  if (!bundle) return null;
  for (const cachedId of dataCache.keys()) {
    if (cachedId !== id) dataCache.delete(cachedId);
  }
  return cachedByBundle(dataCache, id, bundle, () => bundleToData(bundle));
}

export function getCatalog(): CatalogEntry[] {
  const fromConfig = (config: SmartbookConfig, source: CatalogEntry['source']): CatalogEntry => ({
    id: config.id,
    title: config.title,
    subject: config.subject,
    source,
    access: config.access ?? (source === 'cloud' ? 'licensed' : 'public'),
    authors: config.authors,
    version: config.version,
  });

  // One card per book, from the copy that opens: cloud, then uploaded, then remote, then builtin.
  const byId = new Map<string, CatalogEntry>();
  for (const { config } of builtinRegistry.values()) byId.set(config.id, fromConfig(config, 'builtin'));
  for (const { entry, bundle } of remoteRegistry.values()) {
    byId.set(entry.id, bundle ? fromConfig(bundle.config, 'remote') : {
      id: entry.id,
      title: entry.title,
      subject: entry.subject,
      source: 'remote',
      access: 'public',
      authors: entry.authors,
      version: entry.version,
    });
  }
  for (const { config } of uploadedRegistry.values()) byId.set(config.id, fromConfig(config, 'uploaded'));
  for (const { config } of cloudRegistry.values()) byId.set(config.id, fromConfig(config, 'cloud'));
  const entries = [...byId.values()];

  entries.sort((a, b) => a.title.localeCompare(b.title, 'it'));
  const demoIdx = entries.findIndex((e) => e.id === 'esempio');
  if (demoIdx > 0) {
    const [demo] = entries.splice(demoIdx, 1);
    entries.unshift(demo);
  }
  return entries;
}

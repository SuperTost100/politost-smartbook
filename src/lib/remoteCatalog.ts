import { CONTENT_FORMAT_VERSION, PTSB_ZIP_LIMITS, compareSpecVersions, ptsbKind } from '@politost/content-core';
import type { StoredBookBundle } from '../types/ptsb';
import { parsePtsbFile } from './ptsb';
import { getRemoteCached, saveRemoteCached } from './ptsbStore';

/** One book in the books site's `catalog.json`. See docs/Books-Repo.md. */
export interface RemoteCatalogEntry {
  id: string;
  title: string;
  subject: string;
  authors?: string[];
  version: string;
  specVersion?: string;
  chapters?: number;
  /** Absolute URL of the `.ptsb`, resolved against the books site. */
  packageUrl: string;
  bytes: number;
  sha256: string;
}

const ID_RE = /^[a-z0-9-]+$/;
const SHA256_RE = /^[0-9a-f]{64}$/;

/** `VITE_BOOKS_URL` without a trailing slash, or '' when the build has no books site. */
export function booksBaseUrl(): string {
  return (import.meta.env.VITE_BOOKS_URL ?? '').trim().replace(/\/+$/, '');
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Check `catalog.json` from `baseUrl`. Entries that are malformed, point outside the books site,
 * or need a newer content format than this reader knows are left out, with a console warning.
 */
export function parseRemoteCatalog(json: unknown, baseUrl: string): RemoteCatalogEntry[] {
  if (!isObject(json) || json.catalogVersion !== 1 || !Array.isArray(json.books)) {
    throw new Error('catalog.json: formato non riconosciuto');
  }
  const origin = new URL(baseUrl).origin;
  const entries: RemoteCatalogEntry[] = [];
  const seen = new Set<string>();

  for (const raw of json.books as unknown[]) {
    if (!isObject(raw)) continue;
    const { id, title, subject, authors, version, specVersion, chapters, bytes, sha256 } = raw;
    const skip = (reason: string) => console.warn(`catalog.json: salto ${String(id)}: ${reason}`);

    if (typeof id !== 'string' || !ID_RE.test(id) || seen.has(id)) { skip('id non valido o ripetuto'); continue; }
    if (!nonEmpty(title) || !nonEmpty(subject) || !nonEmpty(version) || !nonEmpty(raw.package)) {
      skip('campi mancanti');
      continue;
    }
    if (typeof bytes !== 'number' || !Number.isInteger(bytes) || bytes <= 0 || bytes > PTSB_ZIP_LIMITS.maxCompressedBytes) {
      skip('dimensione non valida');
      continue;
    }
    if (typeof sha256 !== 'string' || !SHA256_RE.test(sha256)) { skip('sha256 non valido'); continue; }
    if (specVersion !== undefined && (typeof specVersion !== 'string' || !/^\d+\.\d+$/.test(specVersion))) {
      skip('specVersion non valida');
      continue;
    }
    if (specVersion && compareSpecVersions(specVersion, CONTENT_FORMAT_VERSION) > 0) {
      skip(`formato ${specVersion}, questo lettore conosce il ${CONTENT_FORMAT_VERSION}`);
      continue;
    }
    let packageUrl: URL;
    try {
      packageUrl = new URL(raw.package as string, `${baseUrl}/`);
    } catch {
      skip('package non valido');
      continue;
    }
    if (packageUrl.origin !== origin) { skip('package fuori dal sito dei libri'); continue; }

    seen.add(id);
    entries.push({
      id,
      title,
      subject,
      authors: Array.isArray(authors) && authors.every(nonEmpty) ? authors : undefined,
      version,
      specVersion,
      chapters: typeof chapters === 'number' ? chapters : undefined,
      packageUrl: packageUrl.href,
      bytes,
      sha256,
    });
  }
  return entries;
}

/** Every book page waits for the catalog, so a hung request must not hold up the builtin books. */
const CATALOG_TIMEOUT_MS = 10_000;

export async function fetchRemoteCatalog(baseUrl: string): Promise<RemoteCatalogEntry[]> {
  const res = await fetch(`${baseUrl}/catalog.json`, { signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`catalog.json: HTTP ${res.status}`);
  return parseRemoteCatalog(await res.json(), baseUrl);
}

async function sha256Hex(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * The parsed package for a catalog entry. A copy saved in IndexedDB for the same version is
 * used without the network, so a book opened once also opens offline.
 */
export async function fetchRemoteBook(entry: RemoteCatalogEntry): Promise<StoredBookBundle> {
  const key = `${entry.id}@${entry.version}`;
  const cached = await getRemoteCached(key).catch(() => undefined);
  if (cached) return cached;

  const res = await fetch(entry.packageUrl, { signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Download del libro non riuscito (HTTP ${res.status})`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength !== entry.bytes || (await sha256Hex(bytes)) !== entry.sha256) {
    throw new Error('Il file scaricato non corrisponde al catalogo. Riprova più tardi.');
  }
  // Remote books are public only. Never send an encrypted package to the platform for a key.
  if (ptsbKind(bytes) !== 'zip') throw new Error('Il catalogo contiene un libro protetto: non lo apro.');

  const bundle = await parsePtsbFile(new File([bytes], `${key}.ptsb`));
  if (bundle.config.id !== entry.id || bundle.config.version !== entry.version) {
    throw new Error('Il libro scaricato non corrisponde al catalogo.');
  }
  if (bundle.config.access === 'licensed') throw new Error('Il catalogo contiene un libro con licenza: non lo apro.');
  await saveRemoteCached(key, bundle).catch((err) => console.warn('Cache del libro non salvata:', err));
  return bundle;
}

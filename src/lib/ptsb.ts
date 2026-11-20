import {
  PTSB_ZIP_LIMITS,
  isValidAssetPath,
  parsePtsbEntries,
  ptsbKind,
  safeUnzip,
  type GraficoConfig,
  type IdeSnippet,
  type PtsbBundle,
  type SmartbookConfig,
} from '@politost/content-core';
import type { PtsbEncryptedHeader, StoredBookBundle } from '../types/ptsb';
import { b64decode, decryptPayload, parseEncryptedHeader } from './ptsbCrypto';
import { fetchContentKey } from './api';
import { getReaderConfig } from '../config/readerConfig';

/** Plain-package parsing lives in content-core. The reader adds decryption and the import date. */
function toStored(entries: Record<string, Uint8Array>): StoredBookBundle {
  const bundle: Partial<PtsbBundle> = parsePtsbEntries(entries);
  delete bundle.manifest;
  return { ...(bundle as Omit<PtsbBundle, 'manifest'>), importedAt: new Date().toISOString() };
}

async function decryptLicensedFile(
  data: Uint8Array,
  header: PtsbEncryptedHeader,
): Promise<Uint8Array> {
  if (!getReaderConfig().features?.drm) {
    throw new Error('Libro protetto: richiede la piattaforma PoliTost.');
  }
  const { header: parsed, ciphertext, headerBytes } = parseEncryptedHeader(data);
  const payloadIv = b64decode(parsed.iv);

  const keyRes = await fetchContentKey(header.id, {
    bookId: header.id,
    wrapIv: parsed.wrapIv,
    wrappedKey: parsed.wrappedKey,
  });
  const cek = b64decode(keyRes.cek);
  return decryptPayload(cek, payloadIv, ciphertext, headerBytes);
}

export async function parsePtsbFile(file: File): Promise<StoredBookBundle> {
  const max = PTSB_ZIP_LIMITS.maxCompressedBytes;
  if (file.size > max) {
    throw new Error(`File troppo grande (max ${max / (1024 * 1024)} MB)`);
  }

  const buf = new Uint8Array(await file.arrayBuffer());
  const kind = ptsbKind(buf);

  if (kind === 'zip') {
    return toStored(safeUnzip(buf));
  }

  if (kind === 'encrypted') {
    const { header } = parseEncryptedHeader(buf);
    const encHeader = header as unknown as PtsbEncryptedHeader;
    // Tag check before the access field is trusted. A rewritten access value
    // fails decrypt because the header bytes are AES-GCM associated data.
    const zipBytes = await decryptLicensedFile(buf, encHeader);
    const access = encHeader.access ?? 'licensed';
    if (access !== 'licensed' && access !== 'public') {
      throw new Error('Libro protetto: accedi e verifica la licenza per aprire questo file.');
    }
    return toStored(safeUnzip(zipBytes));
  }

  throw new Error('Formato file non riconosciuto. Usa un file .ptsb valido.');
}

export function isEncryptedPtsb(buffer: ArrayBuffer): boolean {
  return ptsbKind(new Uint8Array(buffer)) === 'encrypted';
}

const ID_RE = /^[a-z0-9-]+$/;

/**
 * Unpacks a package from the books site whose bytes match the SHA-256 of the catalog, without
 * validating it again. The books repository validates every book with the same validateBundle
 * before it packs it and lists its hash, and that check renders every formula of the book with
 * KaTeX: about a third of opening a book for the first time. The limits of the archive still
 * apply, the text is sanitized when it renders, and a file the student imports gets the full
 * check (parsePtsbFile).
 */
export function readVerifiedPtsb(bytes: Uint8Array): StoredBookBundle {
  const entries = safeUnzip(bytes);
  const text = (name: string) => (entries[name] ? new TextDecoder().decode(entries[name]) : '');
  const config = JSON.parse(text('smartbook.json') || 'null') as SmartbookConfig | null;
  if (!config || typeof config !== 'object' || typeof config.id !== 'string' || !ID_RE.test(config.id) || !Array.isArray(config.chapters)) {
    throw new Error('smartbook.json mancante o non valido nel pacchetto');
  }
  const chapterFiles: Record<string, string> = {};
  const assets: Record<string, Uint8Array> = {};
  for (const [path, data] of Object.entries(entries)) {
    if (path.startsWith('chapters/') && path.endsWith('.md')) chapterFiles[path.slice('chapters/'.length)] = new TextDecoder().decode(data);
    else if (path.startsWith('assets/') && !path.endsWith('/') && isValidAssetPath(path)) assets[path] = data;
  }
  const ide = text('ide.json');
  const grafici = text('grafici.json');
  return {
    warnings: [],
    config: { ...config, access: config.access ?? 'public' },
    chapterFiles,
    eserciziRaw: text('esercizi.md'),
    esamiRaw: text('esami.md'),
    ide: ide ? (JSON.parse(ide) as IdeSnippet[]) : [],
    grafici: grafici ? (JSON.parse(grafici) as GraficoConfig[]) : [],
    assets,
    importedAt: new Date().toISOString(),
  };
}

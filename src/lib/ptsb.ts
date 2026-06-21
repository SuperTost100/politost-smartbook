import type { IdeSnippet, GraficoConfig, SmartbookConfig } from '../types/smartbook';
import type { PtsbEncryptedHeader, PtsbManifest, StoredBookBundle } from '../types/ptsb';
import { validateBundle } from './validateChapter';
import { isValidAssetPath } from './assetResolver';
import { b64decode, decryptPayload, parseEncryptedHeader } from './ptsbCrypto';
import { fetchContentKey } from './api';
import { defaultReaderConfig, resolveFeatures } from '../config/readerConfig';
import { MAX_COMPRESSED_BYTES, safeUnzip } from './safeUnzip';

const PLATFORM_REQUIRED_MSG =
  'Questo file è protetto con DRM. Aprirlo richiede la piattaforma Politost (account e licenza).';

const ID_RE = /^[a-z0-9-]+$/;

function readZipEntries(zipBytes: Uint8Array): Record<string, Uint8Array> {
  return safeUnzip(zipBytes);
}

function decodeText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function extractAssets(entries: Record<string, Uint8Array>): Record<string, Uint8Array> {
  const assets: Record<string, Uint8Array> = {};
  for (const [path, data] of Object.entries(entries)) {
    if (path.startsWith('assets/') && !path.endsWith('/') && isValidAssetPath(path)) {
      assets[path] = data;
    }
  }
  return assets;
}

function parseZipBundle(entries: Record<string, Uint8Array>): StoredBookBundle {
  if (!entries['smartbook.json']) {
    throw new Error('smartbook.json mancante nel pacchetto');
  }
  const config = JSON.parse(decodeText(entries['smartbook.json'])) as SmartbookConfig;
  if (!ID_RE.test(config.id)) {
    throw new Error(`ID smartbook non valido: ${config.id}`);
  }

  const chapterFiles: Record<string, string> = {};
  for (const [path, data] of Object.entries(entries)) {
    if (path.startsWith('chapters/') && path.endsWith('.md')) {
      chapterFiles[path.slice('chapters/'.length)] = decodeText(data);
    }
  }

  const assets = extractAssets(entries);
  const eserciziRaw = entries['esercizi.md'] ? decodeText(entries['esercizi.md']) : '';
  const esamiRaw = entries['esami.md'] ? decodeText(entries['esami.md']) : '';

  const validation = validateBundle(config, chapterFiles, assets, { eserciziRaw, esamiRaw });
  if (!validation.valid) {
    throw new Error(validation.errors.join('\n'));
  }

  return {
    config: { ...config, access: config.access ?? 'public' },
    chapterFiles,
    eserciziRaw,
    esamiRaw,
    ide: entries['ide.json'] ? (JSON.parse(decodeText(entries['ide.json'])) as IdeSnippet[]) : [],
    grafici: entries['grafici.json'] ? (JSON.parse(decodeText(entries['grafici.json'])) as GraficoConfig[]) : [],
    assets,
    importedAt: new Date().toISOString(),
  };
}

async function decryptLicensedFile(
  data: Uint8Array,
  header: PtsbEncryptedHeader,
): Promise<Uint8Array> {
  const { header: parsed, ciphertext } = parseEncryptedHeader(data);
  const payloadIv = b64decode(parsed.iv);

  const keyRes = await fetchContentKey(header.id, {
    bookId: header.id,
    wrapIv: parsed.wrapIv,
    wrappedKey: parsed.wrappedKey,
  });
  const cek = b64decode(keyRes.cek);
  return decryptPayload(cek, payloadIv, ciphertext);
}

export async function parsePtsbFile(file: File): Promise<StoredBookBundle> {
  if (file.size > MAX_COMPRESSED_BYTES) {
    throw new Error(`File troppo grande (max ${MAX_COMPRESSED_BYTES / (1024 * 1024)} MB)`);
  }

  const buf = new Uint8Array(await file.arrayBuffer());

  if (buf[0] === 0x50 && buf[1] === 0x4b) {
    const entries = readZipEntries(buf);
    return parseZipBundle(entries);
  }

  if (new TextDecoder().decode(buf.slice(0, 4)) === 'PTSB') {
    if (!resolveFeatures(defaultReaderConfig).drm) {
      throw new Error(PLATFORM_REQUIRED_MSG);
    }

    const { header } = parseEncryptedHeader(buf);
    const encHeader = header as unknown as PtsbEncryptedHeader;
    const access = encHeader.access ?? 'licensed';

    if (access === 'licensed') {
      const zipBytes = await decryptLicensedFile(buf, encHeader);
      return parseZipBundle(readZipEntries(zipBytes));
    }

    throw new Error('Libro protetto: accedi e verifica la licenza per aprire questo file.');
  }

  throw new Error('Formato file non riconosciuto. Usa un file .ptsb valido.');
}

export function isEncryptedPtsb(buffer: ArrayBuffer): boolean {
  const buf = new Uint8Array(buffer);
  return new TextDecoder().decode(buf.slice(0, 4)) === 'PTSB';
}

export function readPtsbManifestFromZip(buffer: ArrayBuffer): PtsbManifest | null {
  try {
    if (buffer.byteLength > MAX_COMPRESSED_BYTES) return null;
    const entries = readZipEntries(new Uint8Array(buffer));
    if (!entries['ptsb.json']) return null;
    return JSON.parse(decodeText(entries['ptsb.json'])) as PtsbManifest;
  } catch {
    return null;
  }
}

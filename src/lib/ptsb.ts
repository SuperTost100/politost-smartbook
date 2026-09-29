import { PTSB_ZIP_LIMITS, parsePtsbEntries, ptsbKind, safeUnzip, type PtsbBundle } from '@politost/content-core';
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
    throw new Error('Libro protetto: richiede la piattaforma Politost.');
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

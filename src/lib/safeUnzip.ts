import { unzipSync } from 'fflate';

export const MAX_COMPRESSED_BYTES = 50 * 1024 * 1024;
export const MAX_FILES = 200;
export const MAX_TOTAL_UNCOMPRESSED = 100 * 1024 * 1024;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

const EOCD_SIG = 0x06054b50;
const CD_SIG = 0x02014b50;

function readU32(data: Uint8Array, offset: number): number {
  return (
    data[offset] |
    (data[offset + 1] << 8) |
    (data[offset + 2] << 16) |
    (data[offset + 3] << 24)
  ) >>> 0;
}

function readU16(data: Uint8Array, offset: number): number {
  return data[offset] | (data[offset + 1] << 8);
}

/** Scan ZIP central directory without decompressing to enforce size limits. */
function scanZipLimits(data: Uint8Array): { fileCount: number; totalUncompressed: number } {
  if (data.length < 22) {
    throw new Error('Archivio ZIP non valido');
  }

  let eocdOffset = -1;
  for (let i = data.length - 22; i >= Math.max(0, data.length - 65557); i--) {
    if (readU32(data, i) === EOCD_SIG) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) {
    throw new Error('Archivio ZIP non valido: fine directory mancante');
  }

  const totalEntries = readU16(data, eocdOffset + 10);
  const cdOffset = readU32(data, eocdOffset + 16);

  let offset = cdOffset;
  let totalUncompressed = 0;

  for (let i = 0; i < totalEntries; i++) {
    if (offset + 46 > data.length) {
      throw new Error('Archivio ZIP corrotto');
    }
    if (readU32(data, offset) !== CD_SIG) {
      throw new Error('Archivio ZIP corrotto: directory centrale non valida');
    }

    const compression = readU16(data, offset + 10);
    const compressedSize = readU32(data, offset + 20);
    const uncompressedSize = readU32(data, offset + 24);
    const nameLen = readU16(data, offset + 28);
    const extraLen = readU16(data, offset + 30);
    const commentLen = readU16(data, offset + 32);
    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLen;

    if (nameEnd > data.length) {
      throw new Error('Archivio ZIP corrotto');
    }

    const name = new TextDecoder().decode(data.slice(nameStart, nameEnd));
    if (name.includes('..') || name.startsWith('/')) {
      throw new Error(`Percorso non consentito nell'archivio: ${name}`);
    }

    const size = compression === 0 ? compressedSize : uncompressedSize;
    if (size > MAX_FILE_BYTES) {
      throw new Error(`File troppo grande nell'archivio: ${name}`);
    }

    totalUncompressed += size;
    if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED) {
      throw new Error('Archivio troppo grande (limite decompressione superato)');
    }

    offset = nameEnd + extraLen + commentLen;
  }

  if (totalEntries > MAX_FILES) {
    throw new Error(`Troppi file nell'archivio (max ${MAX_FILES})`);
  }

  return { fileCount: totalEntries, totalUncompressed };
}

export function safeUnzip(data: Uint8Array): Record<string, Uint8Array> {
  if (data.length > MAX_COMPRESSED_BYTES) {
    throw new Error(`File troppo grande (max ${MAX_COMPRESSED_BYTES / (1024 * 1024)} MB)`);
  }

  scanZipLimits(data);

  const entries = unzipSync(data) as Record<string, Uint8Array>;

  for (const [path, content] of Object.entries(entries)) {
    if (content.length > MAX_FILE_BYTES) {
      throw new Error(`File troppo grande dopo estrazione: ${path}`);
    }
  }

  return entries;
}

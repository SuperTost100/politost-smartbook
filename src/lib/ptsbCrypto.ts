/** Web Crypto helpers mirroring ptsb-pack/ptsb_pack/crypto.py (browser decrypt only). */

function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64encode(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

export async function decryptPayload(
  cek: Uint8Array,
  iv: Uint8Array,
  ciphertext: Uint8Array,
  additionalData: Uint8Array,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', cek as BufferSource, 'AES-GCM', false, ['decrypt']);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource, additionalData: additionalData as BufferSource },
    key,
    ciphertext as BufferSource,
  );
  return new Uint8Array(plain);
}

export function parseEncryptedHeader(data: Uint8Array): {
  header: Record<string, string>;
  ciphertext: Uint8Array;
  headerBytes: Uint8Array;
} {
  const magic = new TextDecoder().decode(data.slice(0, 4));
  if (magic !== 'PTSB') throw new Error('File non PTSB cifrato');
  const version = data[4];
  const flags = data[5];
  if (version !== 1) throw new Error(`Versione PTSB non supportata: ${version}`);
  if (!(flags & 0x01)) throw new Error('Container non cifrato');
  const headerLen = (data[6] << 8) | data[7];
  const headerEnd = 8 + headerLen;
  if (headerEnd > data.length) throw new Error('Header PTSB troncato');
  const headerBytes = data.slice(0, headerEnd);
  const headerJson = new TextDecoder().decode(data.slice(8, headerEnd));
  const header = JSON.parse(headerJson) as Record<string, string>;
  const ciphertext = data.slice(headerEnd);
  return { header, ciphertext, headerBytes };
}

export { b64decode, b64encode };

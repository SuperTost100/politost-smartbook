import type { StoredBookBundle } from '../types/ptsb';

const DB_NAME = 'politost-smartbook';
const DB_VERSION = 1;
const STORE = 'uploaded-books';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'config.id' });
      }
    };
  });
}

function readAll(db: IDBDatabase): Promise<StoredBookBundle[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as StoredBookBundle[]);
    req.onerror = () => reject(req.error);
  });
}

/** Logged-out listing is rows with no owner. A signed-in user only sees their rows. */
export function filterUploadedForUser(
  rows: StoredBookBundle[],
  userId: string | null,
): StoredBookBundle[] {
  if (!userId) return rows.filter((row) => !row.userId);
  return rows.filter((row) => row.userId === userId);
}

export async function listUploaded(userId: string | null): Promise<StoredBookBundle[]> {
  const db = await openDb();
  return filterUploadedForUser(await readAll(db), userId);
}

export async function removeUploadedForUser(userId: string): Promise<string[]> {
  const db = await openDb();
  const ids = (await readAll(db)).filter((row) => row.userId === userId).map((row) => row.config.id);
  await Promise.all(ids.map((id) => removeUploaded(id)));
  return ids;
}

export async function getUploaded(id: string): Promise<StoredBookBundle | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result as StoredBookBundle | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function saveUploaded(bundle: StoredBookBundle): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(bundle);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function removeUploaded(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

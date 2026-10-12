import type { StoredBookBundle } from '../types/ptsb';

const DB_NAME = 'politost-smartbook';
const DB_VERSION = 2;
const STORE = 'uploaded-books';
/** Books downloaded from the remote catalog, keyed by `id@version`. */
const REMOTE_STORE = 'remote-books';

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
      if (!db.objectStoreNames.contains(REMOTE_STORE)) {
        db.createObjectStore(REMOTE_STORE);
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

export async function getRemoteCached(key: string): Promise<StoredBookBundle | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(REMOTE_STORE, 'readonly').objectStore(REMOTE_STORE).get(key);
    req.onsuccess = () => resolve(req.result as StoredBookBundle | undefined);
    req.onerror = () => reject(req.error);
  });
}

/** Save one version of a remote book and drop the older versions of the same book. */
export async function saveRemoteCached(key: string, bundle: StoredBookBundle): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(REMOTE_STORE, 'readwrite');
    const store = tx.objectStore(REMOTE_STORE);
    const keys = store.getAllKeys();
    keys.onsuccess = () => {
      for (const old of keys.result) {
        if (typeof old === 'string' && old !== key && old.startsWith(`${bundle.config.id}@`)) store.delete(old);
      }
      store.put(bundle, key);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** IndexedDB cache for subtitle timelines and movie metadata; works offline after a successful save. */
const DB_NAME = 'cinemorph-ai-cache';
const DB_VERSION = 1;
const STORES = ['subtitles', 'movieMetadata'] as const;
type CacheStore = typeof STORES[number];

function openCache(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB unavailable'));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      STORES.forEach(store => { if (!db.objectStoreNames.contains(store)) db.createObjectStore(store); });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open IndexedDB'));
  });
}

export async function cacheLocalRecord<T>(store: CacheStore, key: string, value: T): Promise<void> {
  const db = await openCache();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('IndexedDB write failed'));
      tx.onabort = () => reject(tx.error || new Error('IndexedDB write aborted'));
    });
  } finally { db.close(); }
}

export async function readLocalRecord<T>(store: CacheStore, key: string): Promise<T | null> {
  const db = await openCache();
  try {
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const request = tx.objectStore(store).get(key);
      request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
      request.onerror = () => reject(request.error || new Error('IndexedDB read failed'));
    });
  } finally { db.close(); }
}

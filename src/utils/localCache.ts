// High performance client-side storage cache using IndexedDB (with localStorage fallback)
const DB_NAME = 'brq_app_cache_v2';
const STORE_NAME = 'cache_store';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  
  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

export const localCache = {
  get: async <T = any>(key: string, maxAgeMs = 1000 * 60 * 15): Promise<T | null> => {
    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => {
          const item = req.result;
          if (!item) {
            resolve(null);
            return;
          }
          if (maxAgeMs && Date.now() - item.timestamp > maxAgeMs) {
            // Expired, but we can still return data if caller wants stale-while-revalidate, or null
            resolve(item.data);
          } else {
            resolve(item.data);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      // LocalStorage fallback
      try {
        const raw = localStorage.getItem(`brq_c_${key}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed.data;
      } catch {
        return null;
      }
    }
  },

  set: async (key: string, data: any): Promise<void> => {
    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({ data, timestamp: Date.now() }, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      try {
        localStorage.setItem(`brq_c_${key}`, JSON.stringify({ data, timestamp: Date.now() }));
      } catch {
        // storage quota exceeded or disabled
      }
    }
  },

  remove: async (key: string): Promise<void> => {
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
    } catch {
      try {
        localStorage.removeItem(`brq_c_${key}`);
      } catch {}
    }
  },

  clearMatching: async (prefix: string): Promise<void> => {
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      req.onsuccess = (e: any) => {
        const cursor = e.target.result;
        if (cursor) {
          if (String(cursor.key).startsWith(prefix)) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
    } catch {}
    try {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith(`brq_c_${prefix}`) || k.startsWith(prefix)) {
          localStorage.removeItem(k);
        }
      });
    } catch {}
  },

  clearAll: async (): Promise<void> => {
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
    } catch {
      try {
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('brq_c_')) localStorage.removeItem(k);
        });
      } catch {}
    }
  }
};

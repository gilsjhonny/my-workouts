import { openDB } from 'idb';

const DB_NAME = 'workout-tracker';
const DB_VERSION = 1;
const STORE = 'kv';

let dbPromise;
function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore(STORE);
      },
    });
  }
  return dbPromise;
}

export async function storageGet(key) {
  try {
    return await (await getDB()).get(STORE, key);
  } catch {
    return localStorage.getItem(key) ?? undefined;
  }
}

export async function storageSet(key, value) {
  try {
    await (await getDB()).put(STORE, value, key);
  } catch {
    try { localStorage.setItem(key, value); } catch {}
  }
}

export async function storageDelete(key) {
  try {
    await (await getDB()).delete(STORE, key);
  } catch {
    try { localStorage.removeItem(key); } catch {}
  }
}

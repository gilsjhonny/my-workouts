import { openDB } from 'idb';
import { cloudSet, cloudGet, cloudDelete, cloudGetAll } from './supabase.js';

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

let _uid = null;
export function setStorageUser(uid) {
  _uid = uid;
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
  if (_uid) cloudSet(_uid, key, value).catch(() => {});
}

export async function storageDelete(key) {
  try {
    await (await getDB()).delete(STORE, key);
  } catch {
    try { localStorage.removeItem(key); } catch {}
  }
  if (_uid) cloudDelete(_uid, key).catch(() => {});
}

export async function syncFromCloud(uid) {
  const all = await cloudGetAll(uid);
  const db = await getDB();
  const tx = db.transaction(STORE, 'readwrite');
  await Promise.all(Object.entries(all).map(([k, v]) => tx.store.put(v, k)));
  await tx.done;
  return all;
}

const LS_KEYS = [
  'workout_exercise_renames_v1',
  'workout_routine_renames_v1',
  'workout_folders_v1',
  'workout_exercise_alternates_v1',
];

export async function fullSyncFromCloud(uid) {
  const all = await cloudGetAll(uid);
  const db = await getDB();
  const tx = db.transaction(STORE, 'readwrite');
  await Promise.all(Object.entries(all).map(([k, v]) => tx.store.put(v, k)));
  await tx.done;
  LS_KEYS.forEach(k => { if (all[k]) localStorage.setItem(k, all[k]); });
}

export async function pushLocalToCloud(uid) {
  const db = await getDB();
  const keys = await db.getAllKeys(STORE);
  await Promise.all(keys.map(async k => {
    const v = await db.get(STORE, k);
    if (v !== undefined) await cloudSet(uid, k, v);
  }));
  // Also push localStorage keys (renames, folders)
  const lsKeys = [
    'workout_exercise_renames_v1',
    'workout_routine_renames_v1',
    'workout_folders_v1',
    'workout_exercise_alternates_v1',
  ];
  await Promise.all(lsKeys.map(async k => {
    const v = localStorage.getItem(k);
    if (v) await cloudSet(uid, k, v);
  }));
}

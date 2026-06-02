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
  const keys = Object.keys(all);
  if (keys.length === 0) return { count: 0, summary: 'La nube no tiene datos.' };

  const db = await getDB();
  const tx = db.transaction(STORE, 'readwrite');
  await Promise.all(Object.entries(all).map(([k, v]) => {
    const stored = typeof v === 'string' ? v : JSON.stringify(v);
    return tx.store.put(stored, k);
  }));
  await tx.done;
  LS_KEYS.forEach(k => {
    if (all[k] != null) {
      const stored = typeof all[k] === 'string' ? all[k] : JSON.stringify(all[k]);
      localStorage.setItem(k, stored);
    }
  });

  const setsValue = all['workout_tracker_sets_v2'];
  const setsSize = setsValue ? Math.round((typeof setsValue === 'string' ? setsValue : JSON.stringify(setsValue)).length / 1024) + ' KB' : 'no encontrado';
  const summary = `Claves recibidas: ${keys.join(', ')}\nTamaño datos entrenos: ${setsSize}`;
  return { count: keys.length, summary };
}

export async function pushLocalToCloud(uid) {
  const errors = [];
  const db = await getDB();
  const keys = await db.getAllKeys(STORE);
  await Promise.all(keys.map(async k => {
    const v = await db.get(STORE, k);
    if (v !== undefined) await cloudSet(uid, k, v).catch(e => errors.push(e.message));
  }));
  const lsKeys = [
    'workout_exercise_renames_v1',
    'workout_routine_renames_v1',
    'workout_folders_v1',
    'workout_exercise_alternates_v1',
  ];
  await Promise.all(lsKeys.map(async k => {
    const v = localStorage.getItem(k);
    if (v) await cloudSet(uid, k, v).catch(e => errors.push(e.message));
  }));
  if (errors.length) throw new Error(errors.join('\n'));
}

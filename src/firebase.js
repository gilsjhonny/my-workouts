import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

export const auth = getAuth(app);
export const db = getFirestore(app);

export function listenAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

export async function login(email, password) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

export async function signup(email, password) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  return user;
}

export async function logout() {
  await signOut(auth);
}

function kvDoc(uid, key) {
  return doc(db, 'users', uid, 'kv', key);
}

export async function cloudSet(uid, key, value) {
  await setDoc(kvDoc(uid, key), { value, updatedAt: new Date() });
}

export async function cloudGet(uid, key) {
  const snap = await getDoc(kvDoc(uid, key));
  return snap.exists() ? snap.data().value : undefined;
}

export async function cloudDelete(uid, key) {
  await deleteDoc(kvDoc(uid, key));
}

export async function cloudGetAll(uid) {
  const snaps = await getDocs(collection(db, 'users', uid, 'kv'));
  const result = {};
  snaps.forEach(d => { result[d.id] = d.data().value; });
  return result;
}

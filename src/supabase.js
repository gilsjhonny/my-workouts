import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    global: {
      // Force every request to bypass the HTTP cache so reads always reflect
      // the latest data (some mobile browsers cache GET responses).
      fetch: (input, init = {}) => fetch(input, { ...init, cache: 'no-store' }),
    },
  }
);

export default supabase;

export function listenAuth(cb) {
  // onAuthStateChange fires INITIAL_SESSION immediately, so getSession() is redundant
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
    cb(session?.user ?? null);
  });
  return () => subscription.unsubscribe();
}

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signup(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data.user;
}

export async function logout() {
  await supabase.auth.signOut();
}

export async function cloudSet(uid, key, value) {
  const { error } = await supabase
    .from('user_data')
    .upsert({ user_id: uid, key, value, updated_at: new Date().toISOString() }, { onConflict: 'user_id,key' });
  if (error) throw new Error(`cloudSet(${key}): ${error.message}`);
}

export async function cloudGet(uid, key) {
  const { data } = await supabase
    .from('user_data')
    .select('value')
    .eq('user_id', uid)
    .eq('key', key)
    .maybeSingle();
  return data?.value;
}

export async function cloudDelete(uid, key) {
  await supabase.from('user_data').delete().eq('user_id', uid).eq('key', key);
}

export async function cloudDeleteAll(uid) {
  await supabase.from('user_data').delete().eq('user_id', uid);
}

export async function cloudGetAll(uid) {
  const { data, error } = await supabase
    .from('user_data')
    .select('key, value')
    .eq('user_id', uid);
  if (error) throw new Error(error.message);
  if (!data) return {};
  return Object.fromEntries(data.map(r => [r.key, r.value]));
}

// Returns per-key metadata (updated_at + value length) straight from the DB,
// for diagnosing cross-device sync mismatches.
export async function cloudDiagnostic(uid) {
  const host = (import.meta.env.VITE_SUPABASE_URL || '').replace(/^https?:\/\//, '').split('.')[0];
  const { data, error } = await supabase
    .from('user_data')
    .select('key, value, updated_at')
    .eq('user_id', uid)
    .eq('key', 'workout_tracker_sets_v2')
    .maybeSingle();
  if (error) return `host=${host} ERROR: ${error.message}`;
  if (!data) return `host=${host} sin fila de sets`;
  const kb = Math.round((data.value?.length || 0) / 1024);
  return `host=${host}\nupdated_at=${data.updated_at}\nvalue=${kb} KB`;
}

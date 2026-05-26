// CSV parsing + data model for the Workout Tracker.
// Expected header: title,start_time,end_time,description,exercise_title,superset_id,
//                  exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe

function parseCSVLine(line) {
  const parts = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
      continue;
    }
    if (ch === ',' && !inQ) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  parts.push(cur);
  return parts;
}

// "22 May 2026, 09:48" -> Date
function parseHevyDate(s) {
  if (!s) return null;
  const cleaned = s.replace(',', '');
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}

// RPE -> RIR (Reps in Reserve). RIR ≈ 10 - RPE, clamped at 0.
export function rpeToRir(rpe) {
  if (rpe == null || rpe === '') return null;
  const n = parseFloat(rpe);
  if (isNaN(n)) return null;
  return Math.max(0, +(10 - n).toFixed(1));
}

export function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return { sets: [], errors: ['Empty or header-only file'] };

  const header = parseCSVLine(lines[0]).map(s => s.trim().toLowerCase());
  const col = {};
  const required = ['title', 'start_time', 'exercise_title', 'set_index', 'set_type', 'reps'];
  header.forEach((h, i) => { col[h] = i; });
  const missing = required.filter(r => !(r in col));
  if (missing.length) return { sets: [], errors: ['Missing columns: ' + missing.join(', ')] };

  const sets = [];
  const errors = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const r = parseCSVLine(line);
    if (r.length < header.length - 2) continue; // be lenient

    const startTime = parseHevyDate(r[col.start_time]);
    if (!startTime) continue;
    const endTime = parseHevyDate(r[col.end_time]);
    const reps = r[col.reps] ? parseFloat(r[col.reps]) : null;
    const weight = r[col.weight_kg] !== undefined && r[col.weight_kg] !== '' ? parseFloat(r[col.weight_kg]) : null;
    const rpe = r[col.rpe] !== undefined && r[col.rpe] !== '' ? parseFloat(r[col.rpe]) : null;

    sets.push({
      title: r[col.title],
      startTime,
      endTime,
      sessionKey: r[col.title] + '|' + r[col.start_time],
      exercise: r[col.exercise_title],
      notes: r[col.exercise_notes] || '',
      setIndex: parseInt(r[col.set_index], 10) || 0,
      setType: r[col.set_type] || 'normal',
      weight,
      reps,
      rpe,
      rir: rpeToRir(rpe),
      duration: r[col.duration_seconds] ? parseFloat(r[col.duration_seconds]) : null,
      distance: r[col.distance_km] ? parseFloat(r[col.distance_km]) : null,
    });
  }
  return { sets, errors };
}

// Merge two set arrays, skipping sessions already present in existing (by sessionKey).
export function mergeSets(existing, incoming) {
  const known = new Set(existing.map(s => s.sessionKey));
  return [...existing, ...incoming.filter(s => !known.has(s.sessionKey))];
}

// Build hierarchical structure: workouts -> sessions -> exercises -> sets
export function buildModel(sets) {
  // Group by workout title
  const workoutMap = new Map();
  for (const s of sets) {
    if (!workoutMap.has(s.title)) {
      workoutMap.set(s.title, { title: s.title, sessions: new Map() });
    }
    const wk = workoutMap.get(s.title);
    if (!wk.sessions.has(s.sessionKey)) {
      wk.sessions.set(s.sessionKey, {
        key: s.sessionKey,
        title: s.title,
        startTime: s.startTime,
        endTime: s.endTime,
        exercises: new Map(),
      });
    }
    const sess = wk.sessions.get(s.sessionKey);
    if (!sess.exercises.has(s.exercise)) {
      sess.exercises.set(s.exercise, {
        name: s.exercise,
        notes: s.notes,
        sets: [],
      });
    }
    sess.exercises.get(s.exercise).sets.push(s);
  }

  // Flatten to arrays + sort
  const workouts = [];
  for (const wk of workoutMap.values()) {
    const sessions = [...wk.sessions.values()]
      .map(sess => {
        const exercises = [...sess.exercises.values()].map(ex => {
          ex.sets.sort((a, b) => a.setIndex - b.setIndex);
          // keep latest notes (some sets carry notes, others don't)
          const noteSet = ex.sets.find(s => s.notes);
          if (noteSet) ex.notes = noteSet.notes;
          return ex;
        });
        // duration in minutes
        let durationMin = null;
        if (sess.endTime && sess.startTime) {
          durationMin = Math.round((sess.endTime - sess.startTime) / 60000);
        }
        return { ...sess, exercises, durationMin };
      })
      .sort((a, b) => b.startTime - a.startTime);

    const totalSets = sessions.reduce((acc, s) => acc + s.exercises.reduce((a, e) => a + e.sets.length, 0), 0);
    const uniqueExercises = new Set();
    sessions.forEach(s => s.exercises.forEach(e => uniqueExercises.add(e.name)));

    workouts.push({
      title: wk.title,
      sessions,
      lastDate: sessions[0]?.startTime || null,
      sessionCount: sessions.length,
      totalSets,
      exerciseCount: uniqueExercises.size,
    });
  }
  workouts.sort((a, b) => (b.lastDate?.getTime() || 0) - (a.lastDate?.getTime() || 0));
  return workouts;
}

// For comparison: given a workout + exercise, return sessions of that exercise sorted desc.
export function exerciseHistory(workout, exerciseName) {
  const out = [];
  workout.sessions.forEach(sess => {
    const ex = sess.exercises.find(e => e.name === exerciseName);
    if (ex) {
      out.push({
        session: sess,
        ex,
        topSetWeight: Math.max(0, ...ex.sets.filter(s => s.setType !== 'warmup').map(s => s.weight || 0)),
        topReps: Math.max(0, ...ex.sets.filter(s => s.setType !== 'warmup').map(s => s.reps || 0)),
        totalVolume: ex.sets.reduce((a, s) => a + (s.weight || 0) * (s.reps || 0), 0),
        workSets: ex.sets.filter(s => s.setType !== 'warmup'),
      });
    }
  });
  return out; // already desc by session.startTime
}

// Same shape, but iterates every workout in the dataset so the exercise's
// full history is returned regardless of which routine it was logged under.
export function exerciseHistoryAll(workouts, exerciseName) {
  const out = [];
  workouts.forEach(w => {
    w.sessions.forEach(sess => {
      const ex = sess.exercises.find(e => e.name === exerciseName);
      if (ex) {
        out.push({
          session: sess,
          ex,
          topSetWeight: Math.max(0, ...ex.sets.filter(s => s.setType !== 'warmup').map(s => s.weight || 0)),
          topReps: Math.max(0, ...ex.sets.filter(s => s.setType !== 'warmup').map(s => s.reps || 0)),
          totalVolume: ex.sets.reduce((a, s) => a + (s.weight || 0) * (s.reps || 0), 0),
          workSets: ex.sets.filter(s => s.setType !== 'warmup'),
        });
      }
    });
  });
  // sort desc by startTime
  out.sort((a, b) => b.session.startTime - a.session.startTime);
  return out;
}

// Date format helpers
export function fmtDate(d) {
  if (!d) return '—';
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}
export function fmtDateShort(d) {
  if (!d) return '—';
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}
export function fmtTime(d) {
  if (!d) return '—';
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}
export function fmtRelative(d) {
  if (!d) return '—';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return 'hace ' + Math.floor(diff / 60) + ' min';
  if (diff < 86400) return 'hace ' + Math.floor(diff / 3600) + ' h';
  if (diff < 86400 * 7) return 'hace ' + Math.floor(diff / 86400) + ' d';
  if (diff < 86400 * 30) return 'hace ' + Math.floor(diff / 86400 / 7) + ' sem';
  if (diff < 86400 * 365) return 'hace ' + Math.floor(diff / 86400 / 30) + ' mes';
  return 'hace ' + Math.floor(diff / 86400 / 365) + ' a';
}

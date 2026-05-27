import React from 'react';
import { parseCSV, buildModel, mergeSets } from './parser.js';
import { ExerciseNamesContext, RoutineNamesContext } from './contexts.js';
import { storageGet, storageSet, storageDelete, setStorageUser, syncFromCloud } from './storage.js';
import { listenAuth, logout, cloudSet, cloudGet } from './supabase.js';
import { useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio } from './tweaks-panel.jsx';
import AuthScreen from './screen-auth.jsx';
import ImportScreen from './screen-import.jsx';
import ListScreen from './screen-list.jsx';
import { FolderListScreen, FolderDetailScreen } from './screen-folders.jsx';
import DetailScreen from './screen-detail.jsx';
import ExerciseScreen from './screen-exercise.jsx';

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "lime",
  "baseline": "previous",
  "deltaStyle": "arrows"
}/*EDITMODE-END*/;

const ACCENT_PRESETS = {
  lime:   { accent: '#bff262', soft: '#e8fab7', label: 'Lime' },
  mint:   { accent: '#9fe8b8', soft: '#d6f5e2', label: 'Mint' },
  apricot:{ accent: '#ffc59a', soft: '#ffe5cf', label: 'Apricot' },
  lavender:{ accent: '#cdc1f9', soft: '#e6dffa', label: 'Lavender' },
};

const SETS_KEY = 'workout_tracker_sets_v2';
const STORAGE_KEY = 'workout_tracker_csv_v1';
const NAME_KEY = 'workout_tracker_filename_v1';
const RENAMES_KEY = 'workout_exercise_renames_v1';
const ROUTINE_RENAMES_KEY = 'workout_routine_renames_v1';
const FOLDERS_KEY = 'workout_folders_v1';

function setsToJSON(sets) {
  return JSON.stringify(sets.map(s => ({
    ...s,
    startTime: s.startTime?.toISOString() ?? null,
    endTime: s.endTime?.toISOString() ?? null,
  })));
}

function setsFromJSON(text) {
  return JSON.parse(text).map(s => ({
    ...s,
    startTime: s.startTime ? new Date(s.startTime) : null,
    endTime: s.endTime ? new Date(s.endTime) : null,
  }));
}

function foldersFromRaw(raw) {
  return Array.isArray(raw) ? raw.map(f => ({ ...f, createdAt: f.createdAt ? new Date(f.createdAt) : new Date() })) : [];
}

function App() {
  const [tweaks, setTweaksRaw] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = React.useState({ name: 'import' });
  const [sets, setSets] = React.useState(null);
  const [filename, setFilename] = React.useState(null);
  const [loadingInitial, setLoadingInitial] = React.useState(true);
  const [currentUser, setCurrentUser] = React.useState(undefined); // undefined = not yet resolved

  const [renames, setRenamesState] = React.useState({});
  const [routineRenames, setRoutineRenamesState] = React.useState({});
  const [folders, setFoldersState] = React.useState([]);

  // Listen to Firebase auth state
  React.useEffect(() => {
    return listenAuth(user => {
      setCurrentUser(user ?? null);
    });
  }, []);

  // Load data once auth is resolved
  React.useEffect(() => {
    if (currentUser === undefined) return; // still resolving

    if (!currentUser) {
      setLoadingInitial(false);
      return;
    }

    setStorageUser(currentUser.uid);

    (async () => {
      try {
        // Load renames + folders (local first, cloud fallback)
        const renamesRaw = localStorage.getItem(RENAMES_KEY);
        const routineRenamesRaw = localStorage.getItem(ROUTINE_RENAMES_KEY);
        const foldersRaw = localStorage.getItem(FOLDERS_KEY);

        if (renamesRaw) {
          try { setRenamesState(JSON.parse(renamesRaw)); } catch {}
        } else {
          const cloud = await cloudGet(currentUser.uid, RENAMES_KEY).catch(() => null);
          if (cloud) {
            localStorage.setItem(RENAMES_KEY, cloud);
            try { setRenamesState(JSON.parse(cloud)); } catch {}
          }
        }

        if (routineRenamesRaw) {
          try { setRoutineRenamesState(JSON.parse(routineRenamesRaw)); } catch {}
        } else {
          const cloud = await cloudGet(currentUser.uid, ROUTINE_RENAMES_KEY).catch(() => null);
          if (cloud) {
            localStorage.setItem(ROUTINE_RENAMES_KEY, cloud);
            try { setRoutineRenamesState(JSON.parse(cloud)); } catch {}
          }
        }

        if (foldersRaw) {
          try { setFoldersState(foldersFromRaw(JSON.parse(foldersRaw))); } catch {}
        } else {
          const cloud = await cloudGet(currentUser.uid, FOLDERS_KEY).catch(() => null);
          if (cloud) {
            localStorage.setItem(FOLDERS_KEY, cloud);
            try { setFoldersState(foldersFromRaw(JSON.parse(cloud))); } catch {}
          }
        }

        // Load sets
        const storedName = await storageGet(NAME_KEY);
        let loadedSets = null;

        const json = await storageGet(SETS_KEY);
        if (json) {
          loadedSets = setsFromJSON(json);
        } else {
          // Migrate legacy CSV
          const csv = await storageGet(STORAGE_KEY);
          if (csv) {
            const { sets } = parseCSV(csv);
            if (sets.length) {
              loadedSets = sets;
              await storageSet(SETS_KEY, setsToJSON(sets));
              await storageDelete(STORAGE_KEY);
            }
          }

          // No local data → try to restore from cloud
          if (!loadedSets) {
            try {
              await syncFromCloud(currentUser.uid);
              const cloudJson = await storageGet(SETS_KEY);
              if (cloudJson) loadedSets = setsFromJSON(cloudJson);
              const cloudName = await storageGet(NAME_KEY);
              if (cloudName) setFilename(cloudName);
            } catch {}
          }
        }

        if (loadedSets?.length) {
          setSets(loadedSets);
          setFilename(storedName || 'data.csv');
          setRoute({ name: 'list' });
        }
      } catch (e) {
        console.warn('Could not restore data:', e);
      }
      setLoadingInitial(false);
    })();
  }, [currentUser]);

  function persistFolders(next) {
    setFoldersState(next);
    const serialized = JSON.stringify(next.map(f => ({ ...f, createdAt: f.createdAt.toISOString() })));
    try { localStorage.setItem(FOLDERS_KEY, serialized); } catch {}
    if (currentUser) cloudSet(currentUser.uid, FOLDERS_KEY, serialized).catch(() => {});
  }

  function createFolder(name) {
    const id = 'f_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const next = [{ id, name, routineTitles: [], createdAt: new Date() }, ...folders];
    persistFolders(next);
    return id;
  }
  function updateFolder(id, patch) {
    persistFolders(folders.map(f => f.id === id ? { ...f, ...patch } : f));
  }
  function deleteFolder(id) {
    persistFolders(folders.filter(f => f.id !== id));
  }

  const namesApi = React.useMemo(() => ({
    get: (orig) => (orig && renames[orig]) ? renames[orig] : orig,
    rename: (orig, newName) => {
      const trimmed = (newName || '').trim();
      const next = { ...renames };
      if (!trimmed || trimmed === orig) delete next[orig]; else next[orig] = trimmed;
      setRenamesState(next);
      const serialized = JSON.stringify(next);
      try { localStorage.setItem(RENAMES_KEY, serialized); } catch {}
      if (currentUser) cloudSet(currentUser.uid, RENAMES_KEY, serialized).catch(() => {});
    },
    hasRename: (orig) => !!renames[orig],
  }), [renames, currentUser]);

  const routineNamesApi = React.useMemo(() => ({
    get: (orig) => (orig && routineRenames[orig]) ? routineRenames[orig] : orig,
    rename: (orig, newName) => {
      const trimmed = (newName || '').trim();
      const next = { ...routineRenames };
      if (!trimmed || trimmed === orig) delete next[orig]; else next[orig] = trimmed;
      setRoutineRenamesState(next);
      const serialized = JSON.stringify(next);
      try { localStorage.setItem(ROUTINE_RENAMES_KEY, serialized); } catch {}
      if (currentUser) cloudSet(currentUser.uid, ROUTINE_RENAMES_KEY, serialized).catch(() => {});
    },
    hasRename: (orig) => !!routineRenames[orig],
  }), [routineRenames, currentUser]);

  React.useEffect(() => {
    function handler(e) {
      const key = e.detail;
      if (key === 'routines') setRoute({ name: 'list' });
      else if (key === 'folders') setRoute({ name: 'folders' });
    }
    window.addEventListener('tabchange', handler);
    return () => window.removeEventListener('tabchange', handler);
  }, []);

  React.useEffect(() => {
    const preset = ACCENT_PRESETS[tweaks.accent] || ACCENT_PRESETS.lime;
    document.documentElement.style.setProperty('--accent', preset.accent);
    document.documentElement.style.setProperty('--accent-soft', preset.soft);
  }, [tweaks.accent]);

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.name, route.title, route.id, route.exerciseName]);

  const workouts = React.useMemo(() => {
    if (!sets) return [];
    return buildModel(sets);
  }, [sets]);

  function persistSets(setsToSave, name) {
    storageSet(SETS_KEY, setsToJSON(setsToSave)).catch(e => console.warn('Could not persist sets:', e));
    if (name) storageSet(NAME_KEY, name).catch(() => {});
  }

  function onImport(parsedSets, name) {
    setSets(parsedSets);
    setFilename(name);
    persistSets(parsedSets, name);
    setRoute({ name: 'list' });
  }

  function onMerge(newSets, name) {
    const merged = mergeSets(sets || [], newSets);
    setSets(merged);
    persistSets(merged, filename);
    setRoute({ name: 'list' });
  }

  async function onLoadDemo() {
    try {
      const res = await fetch('sample_data.csv');
      const text = await res.text();
      const { sets, errors } = parseCSV(text);
      if (errors.length) throw new Error(errors.join('; '));
      setSets(sets);
      setFilename('sample_data.csv');
      persistSets(sets, 'sample_data.csv');
      setRoute({ name: 'list' });
    } catch (e) {
      console.error('demo load failed', e);
      alert('No se pudieron cargar los datos: ' + e.message);
    }
  }

  function onReimport() {
    setRoute({ name: 'import' });
  }

  // Still resolving auth or loading data
  if (currentUser === undefined || loadingInitial) {
    return (
      <div className="app-root">
        <div className="app-frame">
          <div className="empty"><div className="spinner" /></div>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!currentUser) {
    return (
      <div className="app-root">
        <AuthScreen />
      </div>
    );
  }

  let screen;
  if (route.name === 'import' || !sets) {
    screen = (
      <ImportScreen
        onImport={onImport}
        onMerge={onMerge}
        onLoadDemo={onLoadDemo}
        hasData={!!sets}
        onContinue={() => setRoute({ name: 'list' })}
        onClearData={() => {
          storageDelete(SETS_KEY).catch(() => {});
          storageDelete(NAME_KEY).catch(() => {});
          setSets(null);
          setFilename(null);
        }}
      />
    );
  } else if (route.name === 'list') {
    screen = (
      <ListScreen
        workouts={workouts}
        onOpen={(title) => setRoute({ name: 'detail', title })}
        onReimport={onReimport}
        onLogout={() => { logout(); setStorageUser(null); setCurrentUser(null); }}
      />
    );
  } else if (route.name === 'folders') {
    screen = (
      <FolderListScreen
        folders={folders}
        onOpen={(id) => setRoute({ name: 'folder-detail', id })}
        onCreate={(name) => {
          const id = createFolder(name);
          setRoute({ name: 'folder-detail', id });
        }}
        onReimport={onReimport}
      />
    );
  } else if (route.name === 'folder-detail') {
    const folder = folders.find(f => f.id === route.id);
    if (!folder) { setRoute({ name: 'folders' }); return null; }
    screen = (
      <FolderDetailScreen
        folder={folder}
        workouts={workouts}
        onBack={() => setRoute({ name: 'folders' })}
        onOpenRoutine={(title) => setRoute({ name: 'detail', title, from: { name: 'folder-detail', id: folder.id } })}
        onRename={(name) => updateFolder(folder.id, { name })}
        onDelete={() => { deleteFolder(folder.id); setRoute({ name: 'folders' }); }}
        onUpdateRoutines={(titles) => updateFolder(folder.id, { routineTitles: titles })}
      />
    );
  } else if (route.name === 'detail') {
    const workout = workouts.find(w => w.title === route.title);
    if (!workout) {
      setRoute({ name: 'list' });
      return null;
    }
    screen = (
      <DetailScreen
        workout={workout}
        workouts={workouts}
        onBack={() => setRoute(route.from || { name: 'list' })}
        onOpenExercise={(exerciseName) => setRoute({ name: 'exercise', exerciseName, from: route })}
        tweaks={tweaks}
      />
    );
  } else if (route.name === 'exercise') {
    screen = (
      <ExerciseScreen
        exerciseName={route.exerciseName}
        workouts={workouts}
        onBack={() => setRoute(route.from || { name: 'list' })}
      />
    );
  }

  return (
    <div className="app-root">
      <ExerciseNamesContext.Provider value={namesApi}>
        <RoutineNamesContext.Provider value={routineNamesApi}>
          {screen}
          <TweaksUI tweaks={tweaks} setTweak={setTweaksRaw} onLogout={() => {
            logout();
            setStorageUser(null);
            setCurrentUser(null);
          }} />
        </RoutineNamesContext.Provider>
      </ExerciseNamesContext.Provider>
    </div>
  );
}

function TweaksUI({ tweaks, setTweak, onLogout }) {
  return (
    <TweaksPanel title="Ajustes">
      <TweakSection label="Aspecto">
        <TweakColor
          label="Color"
          value={ACCENT_PRESETS[tweaks.accent]?.accent || ACCENT_PRESETS.lime.accent}
          options={['lime', 'mint', 'apricot', 'lavender'].map(k => ACCENT_PRESETS[k].accent)}
          onChange={(hex) => {
            const found = Object.entries(ACCENT_PRESETS).find(([_, v]) => v.accent === hex);
            setTweak('accent', found ? found[0] : 'lime');
          }}
        />
      </TweakSection>
      <TweakSection label="Comparación">
        <TweakRadio
          label="Comparar con"
          value={tweaks.baseline}
          options={[
            { value: 'previous', label: 'Anterior' },
            { value: 'best', label: 'Mejor' },
            { value: 'first', label: 'Primera' },
          ]}
          onChange={(v) => setTweak('baseline', v)}
        />
        <TweakRadio
          label="Estilo delta"
          value={tweaks.deltaStyle}
          options={[
            { value: 'arrows', label: 'Flechas' },
            { value: 'numeric', label: 'Numérico' },
          ]}
          onChange={(v) => setTweak('deltaStyle', v)}
        />
      </TweakSection>
      <TweakSection label="Cuenta">
        <button
          onClick={onLogout}
          style={{ fontSize: 13, color: 'var(--down)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}
        >
          Cerrar sesión
        </button>
      </TweakSection>
    </TweaksPanel>
  );
}

export default App;

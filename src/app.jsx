import React from 'react';
import { parseCSV, buildModel, mergeSets } from './parser.js';
import { ExerciseNamesContext, RoutineNamesContext, ExerciseAlternatesContext } from './contexts.js';
import { storageGet, storageSet, storageDelete, setStorageUser, pushLocalToCloud } from './storage.js';
import { listenAuth, logout, cloudSet, cloudGetAll, cloudDeleteAll } from './supabase.js';
import { useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio } from './tweaks-panel.jsx';
import AuthScreen from './screen-auth.jsx';
import ImportScreen from './screen-import.jsx';
import ListScreen from './screen-list.jsx';
import { FolderListScreen, FolderDetailScreen } from './screen-folders.jsx';
import TemplateEditScreen from './screen-template-edit.jsx';
import TemplateProgressScreen from './screen-template-progress.jsx';
import SlotMappingScreen from './screen-slot-mapping.jsx';
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
const ALTERNATES_KEY = 'workout_exercise_alternates_v1';

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
  return Array.isArray(raw) ? raw.map(f => ({
    ...f,
    createdAt: f.createdAt ? new Date(f.createdAt) : new Date(),
    templates: f.templates || [],
    assignments: f.assignments || {},
  })) : [];
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
  const [alternates, setAlternatesState] = React.useState({});
  const loadedUidRef = React.useRef(null);

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

    if (loadedUidRef.current === currentUser.id) return;
    loadedUidRef.current = currentUser.id;
    setStorageUser(currentUser.id);

    (async () => {
      try {
        const hasLocalSets = !!(await storageGet(SETS_KEY));
        const hasLocalRenames = !!localStorage.getItem(RENAMES_KEY);
        const hasLocalRoutineRenames = !!localStorage.getItem(ROUTINE_RENAMES_KEY);
        const hasLocalFolders = !!localStorage.getItem(FOLDERS_KEY);
        const hasLocalAlternates = !!localStorage.getItem(ALTERNATES_KEY);
        const allLocal = hasLocalSets && hasLocalRenames && hasLocalRoutineRenames && hasLocalFolders && hasLocalAlternates;

        // One request to get everything from cloud if any local data is missing
        let cloudAll = null;
        if (!allLocal) {
          cloudAll = await cloudGetAll(currentUser.id).catch(() => ({}));
          // Populate missing local data from cloud
          if (!hasLocalRenames && cloudAll[RENAMES_KEY]) {
            localStorage.setItem(RENAMES_KEY, cloudAll[RENAMES_KEY]);
            try { setRenamesState(JSON.parse(cloudAll[RENAMES_KEY])); } catch {}
          } else if (hasLocalRenames) {
            try { setRenamesState(JSON.parse(localStorage.getItem(RENAMES_KEY))); } catch {}
          }
          if (!hasLocalRoutineRenames && cloudAll[ROUTINE_RENAMES_KEY]) {
            localStorage.setItem(ROUTINE_RENAMES_KEY, cloudAll[ROUTINE_RENAMES_KEY]);
            try { setRoutineRenamesState(JSON.parse(cloudAll[ROUTINE_RENAMES_KEY])); } catch {}
          } else if (hasLocalRoutineRenames) {
            try { setRoutineRenamesState(JSON.parse(localStorage.getItem(ROUTINE_RENAMES_KEY))); } catch {}
          }
          if (!hasLocalFolders && cloudAll[FOLDERS_KEY]) {
            localStorage.setItem(FOLDERS_KEY, cloudAll[FOLDERS_KEY]);
            try { setFoldersState(foldersFromRaw(JSON.parse(cloudAll[FOLDERS_KEY]))); } catch {}
          } else if (hasLocalFolders) {
            try { setFoldersState(foldersFromRaw(JSON.parse(localStorage.getItem(FOLDERS_KEY)))); } catch {}
          }
          if (!hasLocalAlternates && cloudAll[ALTERNATES_KEY]) {
            localStorage.setItem(ALTERNATES_KEY, cloudAll[ALTERNATES_KEY]);
            try { setAlternatesState(JSON.parse(cloudAll[ALTERNATES_KEY])); } catch {}
          } else if (hasLocalAlternates) {
            try { setAlternatesState(JSON.parse(localStorage.getItem(ALTERNATES_KEY))); } catch {}
          }
        } else {
          try { setRenamesState(JSON.parse(localStorage.getItem(RENAMES_KEY))); } catch {}
          try { setRoutineRenamesState(JSON.parse(localStorage.getItem(ROUTINE_RENAMES_KEY))); } catch {}
          try { setFoldersState(foldersFromRaw(JSON.parse(localStorage.getItem(FOLDERS_KEY)))); } catch {}
          try { setAlternatesState(JSON.parse(localStorage.getItem(ALTERNATES_KEY))); } catch {}
        }

        // Push any existing local data up to Supabase (first login on this device)
        pushLocalToCloud(currentUser.id).catch(() => {});

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

          // No local sets → restore from cloud data already fetched
          if (!loadedSets && cloudAll) {
            if (cloudAll[SETS_KEY]) {
              loadedSets = setsFromJSON(cloudAll[SETS_KEY]);
              await storageSet(SETS_KEY, cloudAll[SETS_KEY]);
            }
            if (cloudAll[NAME_KEY]) {
              setFilename(cloudAll[NAME_KEY]);
              await storageSet(NAME_KEY, cloudAll[NAME_KEY]);
            }
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
    if (currentUser) cloudSet(currentUser.id, FOLDERS_KEY, serialized).catch(() => {});
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

  function createTemplate(folderId, data) {
    const id = 't_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    persistFolders(folders.map(f => f.id === folderId
      ? { ...f, templates: [...(f.templates || []), { id, ...data }] }
      : f
    ));
    return id;
  }
  function updateTemplate(folderId, templateId, data) {
    persistFolders(folders.map(f => f.id === folderId
      ? { ...f, templates: (f.templates || []).map(t => t.id === templateId ? { ...t, ...data } : t) }
      : f
    ));
  }
  function deleteTemplate(folderId, templateId) {
    persistFolders(folders.map(f => f.id === folderId
      ? { ...f, templates: (f.templates || []).filter(t => t.id !== templateId) }
      : f
    ));
  }
  function saveAssignment(folderId, sessionKey, templateId, mapping) {
    persistFolders(folders.map(f => f.id === folderId
      ? { ...f, assignments: { ...(f.assignments || {}), [sessionKey]: { templateId, mapping } } }
      : f
    ));
  }

  function persistAlternates(next) {
    setAlternatesState(next);
    const serialized = JSON.stringify(next);
    try { localStorage.setItem(ALTERNATES_KEY, serialized); } catch {}
    if (currentUser) cloudSet(currentUser.id, ALTERNATES_KEY, serialized).catch(() => {});
  }

  const alternatesApi = React.useMemo(() => ({
    getCanonical: (name) => alternates[name] || name,
    link: (altName, canonicalName) => {
      const next = { ...alternates, [altName]: canonicalName };
      // remap anything that pointed to altName as canonical
      Object.keys(next).forEach(k => { if (next[k] === altName) next[k] = canonicalName; });
      persistAlternates(next);
    },
    unlink: (name) => {
      const next = { ...alternates };
      delete next[name];
      persistAlternates(next);
    },
    getGroup: (name) => {
      const canonical = alternates[name] || name;
      return [canonical, ...Object.keys(alternates).filter(k => alternates[k] === canonical)];
    },
    isAlternate: (name) => !!alternates[name],
  }), [alternates, currentUser]);

  const namesApi = React.useMemo(() => ({
    get: (orig) => (orig && renames[orig]) ? renames[orig] : orig,
    rename: (orig, newName) => {
      const trimmed = (newName || '').trim();
      const next = { ...renames };
      if (!trimmed || trimmed === orig) delete next[orig]; else next[orig] = trimmed;
      setRenamesState(next);
      const serialized = JSON.stringify(next);
      try { localStorage.setItem(RENAMES_KEY, serialized); } catch {}
      if (currentUser) cloudSet(currentUser.id, RENAMES_KEY, serialized).catch(() => {});
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
      if (currentUser) cloudSet(currentUser.id, ROUTINE_RENAMES_KEY, serialized).catch(() => {});
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
        currentUser={currentUser}
        onLogout={() => { logout(); setStorageUser(null); setCurrentUser(null); }}
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
        onClearAll={async () => {
          storageDelete(SETS_KEY).catch(() => {});
          storageDelete(NAME_KEY).catch(() => {});
          try { localStorage.removeItem(RENAMES_KEY); } catch {}
          try { localStorage.removeItem(ROUTINE_RENAMES_KEY); } catch {}
          try { localStorage.removeItem(FOLDERS_KEY); } catch {}
          try { localStorage.removeItem(ALTERNATES_KEY); } catch {}
          if (currentUser) cloudDeleteAll(currentUser.id).catch(() => {});
          setSets(null);
          setFilename(null);
          setRenamesState({});
          setRoutineRenamesState({});
          setFoldersState([]);
          setAlternatesState({});
          setRoute({ name: 'import' });
        }}
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
        onBack={() => setRoute({ name: 'folders' })}
        onRename={(name) => updateFolder(folder.id, { name })}
        onUpdateDescription={(description) => updateFolder(folder.id, { description })}
        onDelete={() => { deleteFolder(folder.id); setRoute({ name: 'folders' }); }}
        onOpenTemplate={(templateId) => setRoute({ name: 'template-progress', folderId: folder.id, templateId })}
        onEditTemplate={(templateId) => setRoute({ name: 'template-edit', folderId: folder.id, templateId: templateId || null })}
      />
    );
  } else if (route.name === 'detail') {
    const workout = workouts.find(w => w.title === route.title);
    if (!workout) {
      setRoute({ name: 'list' });
      return null;
    }
    const filteredWorkout = route.dateFrom
      ? { ...workout, sessions: workout.sessions.filter(s => s.startTime >= new Date(route.dateFrom)) }
      : workout;
    const folderForDetail = route.folderId ? folders.find(f => f.id === route.folderId) : null;
    const hasTemplates = (folderForDetail?.templates?.length || 0) > 0;
    screen = (
      <DetailScreen
        workout={filteredWorkout}
        workouts={workouts}
        onBack={() => setRoute(route.from || { name: 'list' })}
        onOpenExercise={(exerciseName) => setRoute({ name: 'exercise', exerciseName, from: route })}
        tweaks={tweaks}
        onAssign={hasTemplates ? (sessionKey) => setRoute({ name: 'slot-mapping', folderId: route.folderId, sessionKey, routineTitle: route.title, from: route }) : null}
      />
    );
  } else if (route.name === 'template-progress') {
    const folder = folders.find(f => f.id === route.folderId);
    if (!folder) { setRoute({ name: 'folders' }); return null; }
    const template = (folder.templates || []).find(t => t.id === route.templateId);
    if (!template) { setRoute({ name: 'folder-detail', id: route.folderId }); return null; }
    screen = (
      <TemplateProgressScreen
        folder={folder}
        template={template}
        workouts={workouts}
        openPicker={route.openPicker || false}
        onBack={() => setRoute({ name: 'folder-detail', id: route.folderId })}
        onEdit={() => setRoute({ name: 'template-edit', folderId: route.folderId, templateId: route.templateId })}
        onAddSession={(sessionKey, routineTitle) => setRoute({ name: 'slot-mapping', folderId: route.folderId, sessionKey, routineTitle, from: { name: 'template-progress', folderId: route.folderId, templateId: route.templateId } })}
        onOpenSession={(sessionKey, routineTitle) => setRoute({ name: 'detail', title: routineTitle, from: { name: 'template-progress', folderId: route.folderId, templateId: route.templateId, openPicker: true } })}
      />
    );
  } else if (route.name === 'template-edit') {
    const folder = folders.find(f => f.id === route.folderId);
    if (!folder) { setRoute({ name: 'folders' }); return null; }
    const template = route.templateId ? (folder.templates || []).find(t => t.id === route.templateId) : null;
    screen = (
      <TemplateEditScreen
        template={template}
        onBack={() => setRoute({ name: 'folder-detail', id: route.folderId })}
        onSave={(data) => {
          if (template) updateTemplate(route.folderId, route.templateId, data);
          else createTemplate(route.folderId, data);
          setRoute({ name: 'folder-detail', id: route.folderId });
        }}
        onDelete={template ? () => { deleteTemplate(route.folderId, route.templateId); setRoute({ name: 'folder-detail', id: route.folderId }); } : null}
      />
    );
  } else if (route.name === 'slot-mapping') {
    const folder = folders.find(f => f.id === route.folderId);
    if (!folder) { setRoute(route.from || { name: 'list' }); return null; }
    const workout = workouts.find(w => w.title === route.routineTitle);
    if (!workout) { setRoute(route.from || { name: 'list' }); return null; }
    const session = workout.sessions.find(s => s.key === route.sessionKey);
    if (!session) { setRoute(route.from || { name: 'list' }); return null; }
    screen = (
      <SlotMappingScreen
        folder={folder}
        session={session}
        lockedTemplateId={route.from?.name === 'template-progress' ? route.from.templateId : null}
        onBack={() => setRoute(route.from || { name: 'list' })}
        onConfirm={(templateId, mapping) => {
          saveAssignment(route.folderId, route.sessionKey, templateId, mapping);
          setRoute(route.from || { name: 'list' });
        }}
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
          <ExerciseAlternatesContext.Provider value={alternatesApi}>
            {screen}
            <TweaksUI tweaks={tweaks} setTweak={setTweaksRaw} onLogout={() => {
              logout();
              setStorageUser(null);
              setCurrentUser(null);
            }} />
          </ExerciseAlternatesContext.Provider>
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

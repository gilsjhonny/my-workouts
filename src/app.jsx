import React from 'react';
import { parseCSV, buildModel } from './parser.js';
import { ExerciseNamesContext, RoutineNamesContext } from './contexts.js';
import { useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio } from './tweaks-panel.jsx';
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

const STORAGE_KEY = 'workout_tracker_csv_v1';
const NAME_KEY = 'workout_tracker_filename_v1';
const RENAMES_KEY = 'workout_exercise_renames_v1';
const ROUTINE_RENAMES_KEY = 'workout_routine_renames_v1';
const FOLDERS_KEY = 'workout_folders_v1';

function App() {
  const [tweaks, setTweaksRaw] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = React.useState({ name: 'import' });
  const [sets, setSets] = React.useState(null);
  const [filename, setFilename] = React.useState(null);
  const [loadingInitial, setLoadingInitial] = React.useState(true);
  const [renames, setRenamesState] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(RENAMES_KEY) || '{}'); } catch (e) { return {}; }
  });
  const [routineRenames, setRoutineRenamesState] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(ROUTINE_RENAMES_KEY) || '{}'); } catch (e) { return {}; }
  });
  const [folders, setFoldersState] = React.useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(FOLDERS_KEY) || '[]');
      return Array.isArray(raw) ? raw.map(f => ({ ...f, createdAt: f.createdAt ? new Date(f.createdAt) : new Date() })) : [];
    } catch (e) { return []; }
  });
  function persistFolders(next) {
    setFoldersState(next);
    try { localStorage.setItem(FOLDERS_KEY, JSON.stringify(next.map(f => ({ ...f, createdAt: f.createdAt.toISOString() })))); } catch (e) {}
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
      try { localStorage.setItem(RENAMES_KEY, JSON.stringify(next)); } catch (e) {}
    },
    hasRename: (orig) => !!renames[orig],
  }), [renames]);

  const routineNamesApi = React.useMemo(() => ({
    get: (orig) => (orig && routineRenames[orig]) ? routineRenames[orig] : orig,
    rename: (orig, newName) => {
      const trimmed = (newName || '').trim();
      const next = { ...routineRenames };
      if (!trimmed || trimmed === orig) delete next[orig]; else next[orig] = trimmed;
      setRoutineRenamesState(next);
      try { localStorage.setItem(ROUTINE_RENAMES_KEY, JSON.stringify(next)); } catch (e) {}
    },
    hasRename: (orig) => !!routineRenames[orig],
  }), [routineRenames]);

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

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const storedName = localStorage.getItem(NAME_KEY);
      if (stored) {
        const { sets, errors } = parseCSV(stored);
        if (sets.length) {
          setSets(sets);
          setFilename(storedName || 'data.csv');
          setRoute({ name: 'list' });
        }
      }
    } catch (e) {
      console.warn('Could not restore data:', e);
    }
    setLoadingInitial(false);
  }, []);

  const workouts = React.useMemo(() => {
    if (!sets) return [];
    return buildModel(sets);
  }, [sets]);

  function persistCSV(text, name) {
    try {
      localStorage.setItem(STORAGE_KEY, text);
      localStorage.setItem(NAME_KEY, name || 'data.csv');
    } catch (e) {
      console.warn('Could not persist CSV (size/quota):', e);
    }
  }

  function onImport(parsedSets, name, rawText) {
    setSets(parsedSets);
    setFilename(name);
    if (rawText) persistCSV(rawText, name);
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
      persistCSV(text, 'sample_data.csv');
      setRoute({ name: 'list' });
    } catch (e) {
      console.error('demo load failed', e);
      alert('No se pudieron cargar los datos: ' + e.message);
    }
  }

  function onReimport() {
    if (confirm('¿Descartar los datos actuales e importar un archivo nuevo?')) {
      try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(NAME_KEY); } catch (_) {}
      setSets(null);
      setRoute({ name: 'import' });
    }
  }

  if (loadingInitial) {
    return (
      <div className="app-root">
        <div className="app-frame">
          <div className="empty"><div className="spinner" /></div>
        </div>
      </div>
    );
  }

  let screen;
  if (route.name === 'import' || !sets) {
    screen = (
      <ImportScreen
        onImport={onImport}
        onLoadDemo={onLoadDemo}
        hasData={!!sets}
        onContinue={() => setRoute({ name: 'list' })}
      />
    );
  } else if (route.name === 'list') {
    screen = (
      <ListScreen
        workouts={workouts}
        onOpen={(title) => setRoute({ name: 'detail', title })}
        onReimport={onReimport}
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
          <TweaksUI tweaks={tweaks} setTweak={setTweaksRaw} />
        </RoutineNamesContext.Provider>
      </ExerciseNamesContext.Provider>
    </div>
  );
}

function TweaksUI({ tweaks, setTweak }) {
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
    </TweaksPanel>
  );
}

export default App;

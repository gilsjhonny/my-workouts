import React from 'react';
import { parseCSV } from './parser.js';
import Icon from './icons.jsx';

function ImportScreen({ onImport, onMerge, onLoadDemo, hasData, onContinue, onClearData }) {
  const [dragOver, setDragOver] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [mode, setMode] = React.useState(hasData ? 'merge' : 'replace');
  const fileRef = React.useRef(null);

  function handleFile(file) {
    if (!file) return;
    setLoading(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const { sets, errors } = parseCSV(text);
        if (errors.length) { setError(errors.join('; ')); setLoading(false); return; }
        if (!sets.length) { setError('No se encontraron filas.'); setLoading(false); return; }
        if (mode === 'merge' && hasData) {
          onMerge(sets, file.name);
        } else {
          onImport(sets, file.name);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => { setError('No se pudo leer el archivo.'); setLoading(false); };
    reader.readAsText(file);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="app-frame" data-screen-label="01 Importar">
      <div className="topbar">
        <div style={{ width: 40 }} />
        <div className="title">Mis Entrenos</div>
        <button className="iconbtn" aria-label="más"><Icon.Dots /></button>
      </div>

      <div className="import-shell">
        <div className="import-hero">
          <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Bienvenido
          </div>
          <h1 style={{ marginTop: 6 }}>Registra cada<br/>rep, cada RIR.</h1>
          <div className="accent-grid" aria-hidden="true">
            {Array.from({ length: 28 }).map((_, i) => (
              <span key={i} className={[3, 5, 8, 9, 12, 16, 17, 20, 23, 25].includes(i) ? 'on' : ''} />
            ))}
          </div>
        </div>

        {hasData && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button
              className={'pickbtn' + (mode === 'merge' ? '' : ' ghost')}
              style={{ flex: 1, padding: '10px 0', fontSize: 13 }}
              onClick={() => { setMode('merge'); setError(null); }}
            >
              Añadir datos
            </button>
            <button
              className={'pickbtn' + (mode === 'replace' ? '' : ' ghost')}
              style={{ flex: 1, padding: '10px 0', fontSize: 13 }}
              onClick={() => { setMode('replace'); setError(null); }}
            >
              Reemplazar todo
            </button>
          </div>
        )}

        <div
          className={'upload-zone' + (dragOver ? ' drag' : '')}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <div className="icon">
            {loading ? <div className="spinner" style={{ width: 22, height: 22, borderWidth: 2.5 }} /> : <Icon.Upload size={24} />}
          </div>
          <h3>{hasData && mode === 'merge' ? 'Añadir más datos' : 'Sube tu CSV'}</h3>
          <p>
            {hasData && mode === 'merge'
              ? 'Las sesiones nuevas se añadirán. Las ya existentes no se duplicarán.'
              : 'De Hevy o cualquier app con el mismo formato.\nSuéltalo aquí o elige un archivo.'}
          </p>
          {hasData && mode === 'replace' && (
            <div style={{ fontSize: 12, color: 'var(--down)', marginBottom: 4 }}>
              Los datos actuales se eliminarán al importar.
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (mode === 'replace' && hasData) {
                if (!confirm('¿Reemplazar todos los datos actuales?')) return;
                onClearData?.();
              }
              handleFile(e.target.files?.[0]);
            }}
          />
          <button className="pickbtn" onClick={() => fileRef.current?.click()} disabled={loading}>
            {loading ? 'Leyendo…' : hasData && mode === 'merge' ? 'Añadir archivo' : 'Elegir archivo'}
          </button>
          {error && (
            <div style={{ marginTop: 12, color: 'var(--down)', fontSize: 12.5 }}>{error}</div>
          )}
        </div>

        <div className="demo-link">
          ¿No tienes un CSV?{' '}
          <button onClick={() => { setLoading(true); onLoadDemo().finally(() => setLoading(false)); }}>
            Cargar datos de ejemplo
          </button>
        </div>

        {hasData && (
          <button
            className="pickbtn"
            style={{ background: 'var(--accent)', color: 'var(--accent-ink)', padding: '14px 22px', borderRadius: 999, fontWeight: 600, fontSize: 15 }}
            onClick={onContinue}
          >
            Continuar con los datos actuales →
          </button>
        )}

        <div className="import-spec">
          <strong>Columnas esperadas:</strong>{' '}
          <code>title</code>, <code>start_time</code>, <code>end_time</code>, <code>exercise_title</code>, <code>set_index</code>, <code>set_type</code>, <code>weight_kg</code>, <code>reps</code>, <code>rpe</code>.{' '}
          El RIR se calcula como <code>10 − RPE</code>.
        </div>
      </div>
    </div>
  );
}

export default ImportScreen;

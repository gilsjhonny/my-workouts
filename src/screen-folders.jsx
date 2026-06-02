import React from 'react';
import Icon from './icons.jsx';
import { fmtRelative } from './parser.js';
import { RoutineNamesContext } from './contexts.js';
import { initials } from './screen-list.jsx';

function FolderListScreen({ folders, onOpen, onCreate, onReimport }) {
  const [creating, setCreating] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (creating && inputRef.current) inputRef.current.focus();
  }, [creating]);

  function submit() {
    const name = draft.trim();
    if (!name) { setCreating(false); return; }
    onCreate(name);
    setDraft('');
    setCreating(false);
  }

  return (
    <div className="app-frame" data-screen-label="04 Lista de programas">
      <div className="topbar">
        <button className="iconbtn" onClick={onReimport} aria-label="reimportar"><Icon.File size={16} /></button>
        <div className="title">Mis Entrenos</div>
        <button className="iconbtn" aria-label="más"><Icon.Dots /></button>
      </div>

      <div className="page-head">
        <div className="eyebrow">Programas</div>
      </div>

      <div className="list">
        {creating && (
          <div className="folder-create">
            <Icon.FolderPlus size={18} />
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={submit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); submit(); }
                if (e.key === 'Escape') { e.preventDefault(); setCreating(false); setDraft(''); }
              }}
              placeholder="Nombre del programa"
            />
          </div>
        )}

        {!creating && (
          <button className="folder-create-btn" onClick={() => { setDraft(''); setCreating(true); }}>
            <Icon.FolderPlus size={18} />
            <span>Nuevo programa</span>
          </button>
        )}

        {folders.length === 0 && !creating && (
          <div className="empty" style={{ paddingTop: 32 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Todavía no hay programas</div>
            <div style={{ fontSize: 13 }}>Crea uno para agrupar días de entreno (por mesociclo, fase, mes…).</div>
          </div>
        )}

        {[...folders].sort((a, b) => a.name.localeCompare(b.name)).map((f, i) => (
          <button
            key={f.id}
            className="workout-row fade-in"
            style={{ animationDelay: `${Math.min(i, 12) * 0.02}s` }}
            onClick={() => onOpen(f.id)}
          >
            <div className="badge folder">
              <Icon.Folder size={22} />
            </div>
            <div className="main">
              <div className="name">{f.name}</div>
              <div className="meta">
                <span>{f.routineTitles.length} sesión{f.routineTitles.length === 1 ? '' : 'es'}</span>
                <span className="dot" />
                <span>{fmtRelative(f.createdAt)}</span>
              </div>
              {f.description && <div className="meta" style={{ marginTop: 2, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.description}</div>}
            </div>
            <span className="chev"><Icon.Chevron /></span>
          </button>
        ))}
      </div>

      <BottomTabs active="folders" />
    </div>
  );
}

function FolderDetailScreen({ folder, workouts, onBack, onOpenRoutine, onRename, onUpdateDescription, onDelete, onUpdateRoutines, onUpdateDateFrom, onEditTemplate, onOpenTemplate }) {
  const routineNames = React.useContext(RoutineNamesContext);
  const [editingName, setEditingName] = React.useState(false);
  const [draft, setDraft] = React.useState(folder.name);
  const [descDraft, setDescDraft] = React.useState(folder.description || '');
  const [picking, setPicking] = React.useState(false);
  const nameRef = React.useRef(null);

  React.useEffect(() => {
    if (editingName && nameRef.current) {
      nameRef.current.focus();
      nameRef.current.select();
    }
  }, [editingName]);

  React.useEffect(() => {
    setDescDraft(folder.description || '');
  }, [folder.description]);

  function commitName() {
    const v = draft.trim();
    if (v && v !== folder.name) onRename(v);
    setEditingName(false);
  }

  const from = folder.dateFrom ? new Date(folder.dateFrom) : null;

  const inFolder = React.useMemo(() => {
    return folder.routineTitles
      .map(t => workouts.find(w => w.title === t))
      .filter(Boolean)
      .map(w => {
        const filteredSessions = from
          ? w.sessions.filter(s => s.startTime >= from)
          : w.sessions;
        return { ...w, filteredSessions, filteredCount: filteredSessions.length };
      })
      .sort((a, b) => routineNames.get(a.title).localeCompare(routineNames.get(b.title)));
  }, [workouts, folder.routineTitles, folder.dateFrom]);

  if (picking) {
    return (
      <RoutinePicker
        workouts={workouts}
        initialSelected={folder.routineTitles}
        folderName={folder.name}
        onCancel={() => setPicking(false)}
        onConfirm={(titles) => { onUpdateRoutines(titles); setPicking(false); }}
      />
    );
  }

  return (
    <div className="app-frame" data-screen-label="05 Detalle de programa">
      <div className="topbar">
        <button className="iconbtn" onClick={onBack} aria-label="volver"><Icon.Back /></button>
        <div className="title">Programa</div>
        <button
          className="iconbtn"
          aria-label="eliminar"
          onClick={() => {
            if (confirm(`¿Eliminar el programa "${folder.name}"? Las sesiones seguirán intactas.`)) onDelete();
          }}
        >
          <Icon.Trash size={16} />
        </button>
      </div>

      <div className="detail-hero fade-in">
        <div className="eyebrow">Programa</div>
        {editingName ? (
          <input
            ref={nameRef}
            className="folder-name-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitName(); }
              if (e.key === 'Escape') { e.preventDefault(); setEditingName(false); setDraft(folder.name); }
            }}
          />
        ) : (
          <h1 onClick={() => { setDraft(folder.name); setEditingName(true); }} style={{ cursor: 'text' }}>
            {folder.name}
            <Icon.Pencil size={13} color="rgba(20,22,15,0.4)" />
          </h1>
        )}
        <div className="when">
          <span>{inFolder.length} sesión{inFolder.length === 1 ? '' : 'es'}</span>
        </div>
        <textarea
          value={descDraft}
          onChange={(e) => setDescDraft(e.target.value)}
          onBlur={() => onUpdateDescription?.(descDraft.trim())}
          placeholder="Descripción del programa…"
          rows={2}
          style={{ width: '100%', marginTop: 10, padding: '8px 0', background: 'none', border: 'none', borderTop: '1px solid var(--line)', resize: 'none', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, outline: 'none', fontFamily: 'inherit' }}
        />
      </div>

      <div style={{ padding: '0 16px 12px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Desde</div>
          {folder.dateFrom && (
            <button
              onClick={() => onUpdateDateFrom?.(null)}
              style={{ padding: '2px 0', background: 'none', border: 'none', fontSize: 12, color: 'var(--ink-3)', cursor: 'pointer' }}
            >
              Limpiar
            </button>
          )}
        </div>
        <input
          type="date"
          value={folder.dateFrom || ''}
          onChange={e => onUpdateDateFrom?.(e.target.value || null)}
          style={{ width: '100%', minWidth: 0, padding: '9px 12px', borderRadius: 12, border: '1px solid var(--line-2)', background: 'var(--surface)', fontSize: 14 }}
        />
      </div>

      <div className="list">
        <button className="folder-create-btn" onClick={() => setPicking(true)}>
          <Icon.Plus size={18} />
          <span>{folder.routineTitles.length === 0 ? 'Añadir sesiones' : 'Editar sesiones'}</span>
        </button>

        {folder.routineTitles.length === 0 && (
          <div className="empty" style={{ paddingTop: 32 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Programa vacío</div>
            <div style={{ fontSize: 13 }}>Añade sesiones para verlas aquí.</div>
          </div>
        )}

        {inFolder.map((w, i) => (
          <button
            key={w.title}
            className="workout-row fade-in"
            style={{ animationDelay: `${Math.min(i, 12) * 0.02}s` }}
            onClick={() => onOpenRoutine(w.title)}
          >
            <div className="badge">
              <span className="glyph">{initials(routineNames.get(w.title))}</span>
            </div>
            <div className="main">
              <div className="name">
                {routineNames.get(w.title)}
                {routineNames.hasRename(w.title) && <span className="renamed-dot" />}
              </div>
              <div className="meta">
                <span>{w.filteredCount} {w.filteredCount === 1 ? 'sesión' : 'sesiones'}</span>
                <span className="dot" />
                <span>{w.exerciseCount} ej</span>
                {w.filteredSessions[0] && <><span className="dot" /><span>{fmtRelative(w.filteredSessions[0].startTime)}</span></>}
              </div>
            </div>
            <span className="chev"><Icon.Chevron /></span>
          </button>
        ))}
        <div style={{ height: 1, background: 'var(--line)', margin: '8px 16px' }} />

        <div style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Días
        </div>

        {(folder.templates || []).map(t => (
          <button
            key={t.id}
            className="workout-row"
            onClick={() => onOpenTemplate?.(t.id)}
          >
            <div className="badge folder">
              <Icon.File size={18} />
            </div>
            <div className="main">
              <div className="name">{t.name}</div>
              <div className="meta"><span>{t.slots.length} ejercicio{t.slots.length === 1 ? '' : 's'}</span></div>
            </div>
            <span className="chev"><Icon.Chevron /></span>
          </button>
        ))}

        <button className="folder-create-btn" onClick={() => onEditTemplate?.(null)}>
          <Icon.Plus size={16} />
          <span>Nuevo día</span>
        </button>

        <div className="safe-bottom" />
      </div>
    </div>
  );
}

function RoutinePicker({ workouts, initialSelected, folderName, onCancel, onConfirm }) {
  const routineNames = React.useContext(RoutineNamesContext);
  const [selected, setSelected] = React.useState(new Set(initialSelected));
  const [query, setQuery] = React.useState('');

  const filtered = React.useMemo(() => {
    if (!query) return workouts;
    const q = query.toLowerCase();
    return workouts.filter(w =>
      routineNames.get(w.title).toLowerCase().includes(q) ||
      w.title.toLowerCase().includes(q)
    );
  }, [workouts, query, routineNames]);

  function toggle(title) {
    const next = new Set(selected);
    if (next.has(title)) next.delete(title); else next.add(title);
    setSelected(next);
  }

  return (
    <div className="app-frame" data-screen-label="06 Selector de sesiones">
      <div className="topbar">
        <button className="iconbtn" onClick={onCancel} aria-label="cancelar"><Icon.Back /></button>
        <div className="title">{folderName}</div>
        <button className="iconbtn" onClick={() => onConfirm([...selected])} style={{ background: 'var(--ink)', color: '#fff', border: 0 }} aria-label="hecho">
          <Icon.Check size={16} color="#fff" />
        </button>
      </div>

      <div className="page-head">
        <div className="eyebrow">Selector</div>
        <h1>{selected.size} seleccionada{selected.size === 1 ? '' : 's'}</h1>
        <div className="sub">Marca las sesiones que quieres incluir en este programa.</div>
      </div>

      <div className="search">
        <Icon.Search />
        <input
          placeholder="Buscar sesiones…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="list">
        {filtered.map((w, i) => {
          const checked = selected.has(w.title);
          return (
            <button
              key={w.title}
              className={'workout-row picker' + (checked ? ' checked' : '')}
              onClick={() => toggle(w.title)}
            >
              <div className={'check-box' + (checked ? ' on' : '')}>
                {checked && <Icon.Check size={14} color="var(--accent-ink)" />}
              </div>
              <div className="main">
                <div className="name">{routineNames.get(w.title)}</div>
                <div className="meta">
                  <span>{w.sessionCount} {w.sessionCount === 1 ? 'sesión' : 'sesiones'}</span>
                  <span className="dot" />
                  <span>{fmtRelative(w.lastDate)}</span>
                </div>
              </div>
            </button>
          );
        })}
        <div className="safe-bottom" />
      </div>

      <div className="picker-bottombar">
        <button className="pickbtn ghost" onClick={onCancel}>Cancelar</button>
        <button className="pickbtn" onClick={() => onConfirm([...selected])}>
          Guardar · {selected.size}
        </button>
      </div>
    </div>
  );
}

export function BottomTabs({ active, onChange }) {
  const switchTo = (key) => {
    if (onChange) onChange(key);
    else window.dispatchEvent(new CustomEvent('tabchange', { detail: key }));
  };
  return (
    <nav className="tabbar">
      <button className={'tab' + (active === 'routines' ? ' active' : '')} onClick={() => switchTo('routines')}>
        <Icon.Home size={20} />
        <span>Historial</span>
      </button>
      <button className={'tab' + (active === 'folders' ? ' active' : '')} onClick={() => switchTo('folders')}>
        <Icon.Folder size={20} />
        <span>Programas</span>
      </button>
    </nav>
  );
}

export { FolderListScreen, FolderDetailScreen };

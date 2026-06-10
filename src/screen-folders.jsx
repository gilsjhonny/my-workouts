import React from 'react';
import Icon from './icons.jsx';
import { fmtRelative } from './parser.js';

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
                <span>{(f.templates || []).length} día{(f.templates || []).length === 1 ? '' : 's'}</span>
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

function FolderDetailScreen({ folder, onBack, onRename, onUpdateDescription, onDelete, onEditTemplate, onOpenTemplate }) {
  const [editingName, setEditingName] = React.useState(false);
  const [draft, setDraft] = React.useState(folder.name);
  const [descDraft, setDescDraft] = React.useState(folder.description || '');
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

  const templates = folder.templates || [];

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
        <textarea
          value={descDraft}
          onChange={(e) => setDescDraft(e.target.value)}
          onBlur={() => onUpdateDescription?.(descDraft.trim())}
          placeholder="Descripción del programa…"
          rows={2}
          style={{ width: '100%', marginTop: 10, padding: '8px 0', background: 'none', border: 'none', borderTop: '1px solid var(--line)', resize: 'none', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, outline: 'none', fontFamily: 'inherit' }}
        />
      </div>

      <div className="list">
        {templates.length === 0 && (
          <div className="empty" style={{ paddingTop: 32 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Sin días aún</div>
            <div style={{ fontSize: 13 }}>Añade los días que el coach te dio.</div>
          </div>
        )}

        {templates.map(t => (
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


export function BottomTabs({ active, onChange }) {
  const switchTo = (key) => {
    if (onChange) onChange(key);
    else window.dispatchEvent(new CustomEvent('tabchange', { detail: key }));
  };
  return (
    <nav className="tabbar">
      <button className={'tab' + (active === 'folders' ? ' active' : '')} onClick={() => switchTo('folders')}>
        <Icon.Folder size={20} />
        <span>Programas</span>
      </button>
      <button className={'tab' + (active === 'routines' ? ' active' : '')} onClick={() => switchTo('routines')}>
        <Icon.Dumbbell size={20} />
        <span>Historial</span>
      </button>
    </nav>
  );
}

export { FolderListScreen, FolderDetailScreen };

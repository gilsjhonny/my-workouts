import React from 'react';
import Icon from './icons.jsx';

function TemplateEditScreen({ template, onBack, onSave, onDelete }) {
  const [name, setName] = React.useState(template?.name || '');
  const [slots, setSlots] = React.useState(template?.slots || []);
  const [draft, setDraft] = React.useState('');
  const inputRef = React.useRef(null);

  function addSlot() {
    const v = draft.trim();
    if (!v) return;
    setSlots(s => [...s, v]);
    setDraft('');
    inputRef.current?.focus();
  }

  function removeSlot(i) {
    setSlots(s => s.filter((_, idx) => idx !== i));
  }

  function save() {
    const trimmed = name.trim();
    if (!trimmed) { inputRef.current?.focus(); return; }
    onSave({ name: trimmed, slots });
  }

  return (
    <div className="app-frame">
      <div className="topbar">
        <button className="iconbtn" onClick={onBack} aria-label="volver"><Icon.Back /></button>
        <div className="title">{template ? 'Editar plantilla' : 'Nueva plantilla'}</div>
        <button
          className="iconbtn"
          onClick={save}
          style={{ background: 'var(--ink)', color: '#fff', border: 0 }}
          aria-label="guardar"
        >
          <Icon.Check size={16} color="#fff" />
        </button>
      </div>

      <div className="page-head">
        <div className="eyebrow">Plantilla</div>
        <input
          className="folder-name-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nombre (ej: Day 1 – Hombros)"
          style={{ fontSize: 22, fontWeight: 700, width: '100%', marginTop: 4 }}
          autoFocus={!template}
        />
      </div>

      <div style={{ padding: '0 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
          Ejercicios del coach
        </div>

        {slots.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--ink-3)', paddingBottom: 12 }}>
            Añade los ejercicios en el orden que el coach los puso.
          </div>
        )}

        {slots.map((slot, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
            <div style={{ width: 22, textAlign: 'center', fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, flexShrink: 0 }}>{i + 1}</div>
            <div style={{ flex: 1, fontSize: 15, fontWeight: 500 }}>{slot}</div>
            <button
              onClick={() => removeSlot(i)}
              style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', padding: 4 }}
              aria-label="eliminar"
            >
              <Icon.Trash size={14} />
            </button>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSlot(); } }}
            placeholder="Añadir ejercicio…"
            style={{ flex: 1, padding: '9px 12px', borderRadius: 12, border: '1px solid var(--line-2)', background: 'var(--surface)', fontSize: 14, minWidth: 0 }}
          />
          <button
            onClick={addSlot}
            style={{ padding: '9px 14px', borderRadius: 12, border: 'none', background: 'var(--ink)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
          >
            Añadir
          </button>
        </div>
      </div>

      {template && onDelete && (
        <div style={{ padding: '28px 16px 0' }}>
          <button
            onClick={() => {
              if (confirm(`¿Eliminar la plantilla "${template.name}"?`)) onDelete();
            }}
            style={{ fontSize: 13, color: 'var(--down)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Eliminar plantilla
          </button>
        </div>
      )}

      <div className="safe-bottom" />
    </div>
  );
}

export default TemplateEditScreen;

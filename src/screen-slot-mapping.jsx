import React from 'react';
import Icon from './icons.jsx';
import { ExerciseNamesContext } from './contexts.js';

function SlotMappingScreen({ folder, session, onBack, onConfirm }) {
  const names = React.useContext(ExerciseNamesContext);
  const templates = folder.templates || [];

  const [selectedTemplateId, setSelectedTemplateId] = React.useState(
    () => {
      const existing = folder.assignments?.[session.key];
      return existing?.templateId || templates[0]?.id || null;
    }
  );
  const [mapping, setMapping] = React.useState(() => {
    const existing = folder.assignments?.[session.key];
    return existing ? { ...existing.mapping } : {};
  });
  const [pickingForSlot, setPickingForSlot] = React.useState(null);

  const template = templates.find(t => t.id === selectedTemplateId) || null;

  function handleTemplateChange(id) {
    setSelectedTemplateId(id);
    const existing = folder.assignments?.[session.key];
    if (existing?.templateId === id) {
      setMapping({ ...existing.mapping });
    } else {
      setMapping({});
    }
  }

  function assignExercise(exerciseName) {
    const next = { ...mapping };
    // Remove any previous assignment of this exercise
    Object.keys(next).forEach(ex => { if (next[ex] === pickingForSlot) delete next[ex]; });
    next[exerciseName] = pickingForSlot;
    setMapping(next);
    setPickingForSlot(null);
  }

  function clearSlot(slot) {
    const next = { ...mapping };
    Object.keys(next).forEach(ex => { if (next[ex] === slot) delete next[ex]; });
    setMapping(next);
  }

  if (pickingForSlot !== null) {
    const assignedToOthers = new Set(
      Object.keys(mapping).filter(ex => mapping[ex] !== pickingForSlot)
    );
    return (
      <div className="app-frame">
        <div className="topbar">
          <button className="iconbtn" onClick={() => setPickingForSlot(null)} aria-label="cancelar"><Icon.Back /></button>
          <div className="title" style={{ fontSize: 14 }}>{pickingForSlot}</div>
          <div style={{ width: 40 }} />
        </div>
        <div className="page-head">
          <div className="eyebrow">Slot</div>
          <h1>¿Qué ejercicio hiciste?</h1>
        </div>
        <div className="list">
          {session.exercises.map(ex => {
            const alreadyUsed = assignedToOthers.has(ex.name);
            const currentlyAssigned = mapping[ex.name] === pickingForSlot;
            return (
              <button
                key={ex.name}
                className={'workout-row' + (currentlyAssigned ? ' checked' : '')}
                onClick={() => assignExercise(ex.name)}
              >
                <div className="main">
                  <div className="name">{names.get(ex.name)}</div>
                  {alreadyUsed && (
                    <div className="meta"><span style={{ color: 'var(--ink-3)' }}>asignado a "{mapping[ex.name]}"</span></div>
                  )}
                </div>
                {currentlyAssigned && <Icon.Check size={16} color="var(--accent-ink)" />}
              </button>
            );
          })}
          <div className="safe-bottom" />
        </div>
      </div>
    );
  }

  return (
    <div className="app-frame">
      <div className="topbar">
        <button className="iconbtn" onClick={onBack} aria-label="volver"><Icon.Back /></button>
        <div className="title">Asignar sesión</div>
        <button
          className="iconbtn"
          onClick={() => onConfirm(selectedTemplateId, mapping)}
          style={{ background: 'var(--ink)', color: '#fff', border: 0 }}
          aria-label="guardar"
        >
          <Icon.Check size={16} color="#fff" />
        </button>
      </div>

      {templates.length > 1 && (
        <div style={{ padding: '10px 16px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => handleTemplateChange(t.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: '1px solid var(--line)',
                background: t.id === selectedTemplateId ? 'var(--ink)' : 'var(--surface)',
                color: t.id === selectedTemplateId ? '#fff' : 'var(--ink)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      <div className="page-head">
        <div className="eyebrow">Día</div>
        <h1>{template?.name || '—'}</h1>
        <div className="sub">Asigna cada ejercicio del coach al que hiciste en esta sesión.</div>
      </div>

      {!template && (
        <div className="empty">
          <div style={{ fontSize: 13 }}>Este programa no tiene días aún.</div>
        </div>
      )}

      {template && (
        <div className="list">
          {template.slots.map((slot, i) => {
            const assignedEx = Object.keys(mapping).find(ex => mapping[ex] === slot);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ width: 22, textAlign: 'center', fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 4 }}>{slot}</div>
                  <button
                    onClick={() => setPickingForSlot(slot)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 8,
                      border: '1px solid ' + (assignedEx ? 'transparent' : 'var(--line)'),
                      background: assignedEx ? 'var(--accent-soft)' : 'var(--surface-2)',
                      color: assignedEx ? 'var(--accent-ink)' : 'var(--ink-3)',
                      fontSize: 13,
                      fontWeight: assignedEx ? 600 : 400,
                      cursor: 'pointer',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {assignedEx ? names.get(assignedEx) : '+ Asignar'}
                  </button>
                </div>
                {assignedEx && (
                  <button
                    onClick={() => clearSlot(slot)}
                    style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', padding: 4, flexShrink: 0 }}
                    aria-label="quitar"
                  >
                    <Icon.Trash size={14} />
                  </button>
                )}
              </div>
            );
          })}
          <div className="safe-bottom" />
        </div>
      )}
    </div>
  );
}

export default SlotMappingScreen;

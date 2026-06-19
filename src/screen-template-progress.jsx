import React from 'react';
import Icon from './icons.jsx';
import { fmtRelative } from './parser.js';
import { RoutineNamesContext } from './contexts.js';
import { FullHistoryGrid } from './screen-exercise.jsx';
import { topSetOf } from './screen-detail.jsx';

function buildSlotHistories(template, folder, workouts) {
  const histories = {};
  template.slots.forEach(slot => { histories[slot] = []; });

  Object.entries(folder.assignments || {}).forEach(([sessionKey, { templateId, mapping }]) => {
    if (templateId !== template.id) return;
    let session = null;
    for (const w of workouts) {
      const s = w.sessions.find(s => s.key === sessionKey);
      if (s) { session = s; break; }
    }
    if (!session) return;

    Object.entries(mapping).forEach(([exName, slotName]) => {
      if (!histories[slotName]) return;
      const ex = session.exercises.find(e => e.name === exName);
      if (!ex) return;
      histories[slotName].push({
        session,
        ex,
        actualName: exName,
        topSetWeight: Math.max(0, ...ex.sets.filter(s => s.setType !== 'warmup').map(s => s.weight || 0)),
        workSets: ex.sets.filter(s => s.setType !== 'warmup'),
      });
    });
  });

  Object.values(histories).forEach(h =>
    h.sort((a, b) => b.session.startTime - a.session.startTime)
  );
  return histories;
}

function SessionPicker({ workouts, assignedKeys, filteredTitles, templateName, onSelect, onOpenSession, onCancel }) {
  const routineNames = React.useContext(RoutineNamesContext);
  const isFiltered = filteredTitles.size > 0;

  const available = React.useMemo(() => {
    const source = isFiltered
      ? workouts.filter(w => filteredTitles.has(w.title))
      : workouts;
    return source
      .flatMap(w => w.sessions
        .filter(s => !assignedKeys.has(s.key))
        .map(s => ({ session: s, routineTitle: w.title }))
      )
      .sort((a, b) => b.session.startTime - a.session.startTime);
  }, [workouts, assignedKeys, filteredTitles]);

  return (
    <div className="app-frame">
      <div className="topbar">
        <button className="iconbtn" onClick={onCancel} aria-label="cancelar"><Icon.Back /></button>
        <div className="title">Añadir sesión</div>
        <div style={{ width: 40 }} />
      </div>
      <div className="page-head">
        <div className="eyebrow">Añadir a · {templateName}</div>
        <h1>{isFiltered ? 'Mismo tipo' : 'Todas las sesiones'}</h1>
        {isFiltered && (
          <div className="sub">
            Mostrando solo sesiones de {[...filteredTitles].map(t => routineNames.get(t)).join(', ')}.
          </div>
        )}
      </div>
      <div className="list">
        {available.length === 0 && (
          <div className="empty" style={{ paddingTop: 32 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Sin sesiones nuevas</div>
            <div style={{ fontSize: 13 }}>Todas las sesiones de este tipo ya están asignadas.</div>
          </div>
        )}
        {available.map(({ session, routineTitle }) => (
          <div key={session.key} className="workout-row fade-in" style={{ display: 'flex', alignItems: 'center', cursor: 'default' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', minWidth: 0 }} onClick={() => onSelect(session.key, routineTitle)}>
              <div className="main">
                <div className="name">{routineNames.get(routineTitle)}</div>
                <div className="meta">
                  <span>{fmtRelative(session.startTime)}</span>
                  <span className="dot" />
                  <span>{session.exercises.length} ej</span>
                </div>
              </div>
            </div>
            <button
              className="iconbtn"
              onClick={() => onOpenSession(session.key, routineTitle)}
              aria-label="editar sesión"
              style={{ flexShrink: 0 }}
            >
              <Icon.Pencil size={14} />
            </button>
          </div>
        ))}
        <div className="safe-bottom" />
      </div>
    </div>
  );
}

function TemplateProgressScreen({ folder, template, workouts, onBack, onEdit, onAddSession, onOpenSession, onViewSession, onRemoveSession, openPicker }) {
  const [picking, setPicking] = React.useState(openPicker || false);
  const [managing, setManaging] = React.useState(false);
  const routineNames = React.useContext(RoutineNamesContext);

  const slotHistories = React.useMemo(
    () => buildSlotHistories(template, folder, workouts),
    [template, folder, workouts]
  );

  const assignedCount = Object.values(folder.assignments || {}).filter(a => a.templateId === template.id).length;

  const assignedSessions = React.useMemo(() => {
    const result = [];
    Object.entries(folder.assignments || {}).forEach(([sessionKey, { templateId }]) => {
      if (templateId !== template.id) return;
      for (const w of workouts) {
        const s = w.sessions.find(s => s.key === sessionKey);
        if (s) { result.push({ sessionKey, session: s, routineTitle: w.title }); break; }
      }
    });
    return result.sort((a, b) => b.session.startTime - a.session.startTime);
  }, [folder.assignments, template.id, workouts]);

  const { assignedKeys, filteredTitles } = React.useMemo(() => {
    const keys = new Set();
    const titles = new Set();
    Object.entries(folder.assignments || {}).forEach(([sessionKey, { templateId }]) => {
      if (templateId !== template.id) return;
      keys.add(sessionKey);
      for (const w of workouts) {
        if (w.sessions.some(s => s.key === sessionKey)) { titles.add(w.title); break; }
      }
    });
    return { assignedKeys: keys, filteredTitles: titles };
  }, [folder.assignments, template.id, workouts]);

  if (picking) {
    return (
      <SessionPicker
        workouts={workouts}
        assignedKeys={assignedKeys}
        filteredTitles={filteredTitles}
        templateName={template.name}
        onCancel={() => setPicking(false)}
        onOpenSession={onOpenSession}
        onSelect={(sessionKey, routineTitle) => {
          setPicking(false);
          onAddSession(sessionKey, routineTitle);
        }}
      />
    );
  }

  return (
    <div className="app-frame">
      <div className="topbar">
        <button className="iconbtn" onClick={onBack} aria-label="volver"><Icon.Back /></button>
        <div className="title">Progreso</div>
        <button className="iconbtn" onClick={onEdit} aria-label="editar"><Icon.Pencil size={15} /></button>
      </div>

      <div className="detail-hero fade-in">
        <div className="eyebrow">Día</div>
        <h1>{template.name}</h1>
        <div className="when">
          <span>{template.slots.length} ejercicio{template.slots.length === 1 ? '' : 's'}</span>
          <span className="dot" />
          <span>{assignedCount} sesión{assignedCount === 1 ? '' : 'es'} asignada{assignedCount === 1 ? '' : 's'}</span>
        </div>
      </div>

      <div style={{ padding: '0 16px 12px', display: 'flex', gap: 8 }}>
        <button
          className="folder-create-btn"
          style={{ flex: 1 }}
          onClick={() => setPicking(true)}
        >
          <Icon.Plus size={16} />
          <span>Añadir sesión</span>
        </button>
        {assignedSessions.length > 0 && (
          <button
            className="folder-create-btn"
            style={{ flex: 1 }}
            onClick={() => setManaging(true)}
          >
            <Icon.Pencil size={14} />
            <span>Editar sesiones</span>
          </button>
        )}
      </div>

      {managing && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setManaging(false)}
        >
          <div
            style={{ background: 'var(--surface)', borderRadius: '16px 16px 0 0', width: '100%', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', padding: '16px 16px 8px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>Sesiones asignadas</div>
              <button onClick={() => setManaging(false)} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', fontSize: 13, padding: '4px 0' }}>Cerrar</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {assignedSessions.map(({ sessionKey, session, routineTitle }) => (
                <div key={sessionKey} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--line)', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{fmtRelative(session.startTime)}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{routineNames.get(routineTitle)} · {session.exercises.length} ejercicios</div>
                  </div>
                  <button
                    onClick={() => { onRemoveSession(sessionKey); if (assignedSessions.length === 1) setManaging(false); }}
                    style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', padding: 6, flexShrink: 0 }}
                    aria-label="quitar sesión"
                  >
                    <Icon.Trash size={15} />
                  </button>
                </div>
              ))}
              <div style={{ height: 'env(safe-area-inset-bottom, 16px)' }} />
            </div>
          </div>
        </div>
      )}

      {assignedCount === 0 && (
        <div className="empty" style={{ paddingTop: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Sin sesiones asignadas</div>
          <div style={{ fontSize: 13 }}>Añade una sesión para ver el progreso aquí.</div>
        </div>
      )}

      {template.slots.map(slot => {
        const history = slotHistories[slot] || [];
        const desc = template.slotDescriptions?.[slot];
        return (
          <div key={slot}>
            <div style={{
              padding: '14px 16px 2px',
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--ink)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              {slot}
              {history.length > 0 && (
                <span style={{ fontWeight: 500, color: 'var(--ink-3)', textTransform: 'none', letterSpacing: 0, fontSize: 12 }}>
                  {history.length} sesión{history.length === 1 ? '' : 'es'}
                </span>
              )}
            </div>
            {desc && (
              <div style={{ padding: '0 16px 6px', fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>
                {desc}
              </div>
            )}

            {history.length === 0 ? (
              <div style={{ padding: '4px 16px 12px', fontSize: 13, color: 'var(--ink-3)' }}>
                Sin datos aún
              </div>
            ) : (
              <div className="ex-history-wrap" style={{ marginBottom: 8 }}>
                <FullHistoryGrid history={history} canonicalName={slot} onOpenSession={onViewSession || onOpenSession} hideRoutineName />
              </div>
            )}
          </div>
        );
      })}

      <div className="safe-bottom" />
    </div>
  );
}

export default TemplateProgressScreen;

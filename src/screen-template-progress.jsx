import React from 'react';
import Icon from './icons.jsx';
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

function TemplateProgressScreen({ folder, template, workouts, onBack, onEdit }) {
  const slotHistories = React.useMemo(
    () => buildSlotHistories(template, folder, workouts),
    [template, folder, workouts]
  );

  const totalSessions = Object.keys(
    Object.fromEntries(
      Object.values(folder.assignments || {})
        .filter(a => a.templateId === template.id)
        .map(a => [Object.keys(a.mapping)[0], true])
    )
  ).length;

  const assignedCount = Object.values(folder.assignments || {}).filter(a => a.templateId === template.id).length;

  return (
    <div className="app-frame">
      <div className="topbar">
        <button className="iconbtn" onClick={onBack} aria-label="volver"><Icon.Back /></button>
        <div className="title">Progreso</div>
        <button className="iconbtn" onClick={onEdit} aria-label="editar"><Icon.Pencil size={15} /></button>
      </div>

      <div className="detail-hero fade-in">
        <div className="eyebrow">Plantilla</div>
        <h1>{template.name}</h1>
        <div className="when">
          <span>{template.slots.length} ejercicio{template.slots.length === 1 ? '' : 's'}</span>
          <span className="dot" />
          <span>{assignedCount} sesión{assignedCount === 1 ? '' : 'es'} asignada{assignedCount === 1 ? '' : 's'}</span>
        </div>
      </div>

      {assignedCount === 0 && (
        <div className="empty" style={{ paddingTop: 40 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Sin sesiones asignadas</div>
          <div style={{ fontSize: 13 }}>Abre una sesión desde esta carpeta y usa "Asignar a plantilla".</div>
        </div>
      )}

      {template.slots.map(slot => {
        const history = slotHistories[slot] || [];
        return (
          <div key={slot}>
            <div style={{
              padding: '14px 16px 6px',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--ink-2)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
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

            {history.length === 0 ? (
              <div style={{ padding: '4px 16px 12px', fontSize: 13, color: 'var(--ink-3)' }}>
                Sin datos aún
              </div>
            ) : (
              <div className="ex-history-wrap" style={{ marginBottom: 8 }}>
                <FullHistoryGrid history={history} canonicalName={slot} />
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

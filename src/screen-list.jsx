import React from 'react';
import Icon from './icons.jsx';
import { fmtRelative } from './parser.js';
import { RoutineNamesContext } from './contexts.js';
import { BottomTabs } from './screen-folders.jsx';

function ListScreen({ workouts, onOpen, onReimport, onLogout, onClearAll }) {
  const routineNames = React.useContext(RoutineNamesContext);
  const [query, setQuery] = React.useState('');
  const [showAll, setShowAll] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [confirmClear, setConfirmClear] = React.useState(false);

  // Flat list of all sessions sorted by most recent
  const allSessions = React.useMemo(() => {
    const sessions = [];
    for (const w of workouts) {
      for (const s of w.sessions) {
        sessions.push({ ...s, routineTitle: w.title });
      }
    }
    sessions.sort((a, b) => (b.startTime?.getTime() || 0) - (a.startTime?.getTime() || 0));
    return sessions;
  }, [workouts]);

  const filtered = React.useMemo(() => {
    if (!query) return allSessions;
    const q = query.toLowerCase();
    return allSessions.filter(s =>
      routineNames.get(s.routineTitle).toLowerCase().includes(q) ||
      s.routineTitle.toLowerCase().includes(q)
    );
  }, [allSessions, query, routineNames]);

  const initialN = 10;
  const visible = (showAll || query) ? filtered : filtered.slice(0, initialN);
  const hiddenCount = filtered.length - visible.length;

  const mostRecent = allSessions[0];

  return (
    <div className="app-frame" data-screen-label="02 Lista de rutinas">
      <div className="topbar">
        <button className="iconbtn" onClick={onReimport} aria-label="reimportar"><Icon.File size={16} /></button>
        <div className="title">Mis Entrenos</div>
        <div style={{ position: 'relative' }}>
          <button className="iconbtn" aria-label="más" onClick={() => setMenuOpen(v => !v)}><Icon.Dots /></button>
          {menuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setMenuOpen(false)} />
              <div style={{ position: 'absolute', right: 0, top: '110%', zIndex: 100, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, boxShadow: 'var(--shadow-md)', minWidth: 180, overflow: 'hidden' }}>
                <button
                  onClick={() => { setMenuOpen(false); setConfirmClear(true); }}
                  style={{ width: '100%', textAlign: 'left', padding: '13px 16px', fontSize: 14, color: 'var(--down)', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--line)' }}
                >
                  Borrar todos los datos
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onLogout?.(); }}
                  style={{ width: '100%', textAlign: 'left', padding: '13px 16px', fontSize: 14, color: 'var(--ink-2)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {confirmClear && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(0,0,0,0.4)' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, boxShadow: 'var(--shadow-md)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 600 }}>¿Borrar todos los datos?</h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5 }}>Se eliminarán todos tus entrenos, carpetas y nombres personalizados. Esta acción no se puede deshacer.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirmClear(false)}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => { setConfirmClear(false); onClearAll?.(); }}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: 'var(--down)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Borrar todo
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-head">
        <div className="eyebrow">Biblioteca</div>
      </div>

      {mostRecent && (
        <div className="hero fade-in" key={mostRecent.key} role="button" onClick={() => onOpen(mostRecent.routineTitle)}>
          <div className="hero-eyebrow">Última sesión</div>
          <h2>{routineNames.get(mostRecent.routineTitle)}</h2>
          <div className="stats">
            <span><span className="stat-num">{mostRecent.exercises.length}</span> ejercicios</span>
            {mostRecent.durationMin && <><span>·</span><span><span className="stat-num">{mostRecent.durationMin}</span> min</span></>}
            <span>·</span>
            <span>{fmtRelative(mostRecent.startTime)}</span>
          </div>
          <button className="cta">
            <span>Ver sesiones</span>
            <span className="arrow"><Icon.Chevron size={14} /></span>
          </button>
        </div>
      )}

      <div className="filterbar-label">Últimas sesiones</div>

      <div className="search">
        <Icon.Search />
        <input
          placeholder="Buscar sesiones…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="list">
        {visible.length === 0 && (
          <div className="empty">
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Sin rutinas</div>
            <div style={{ fontSize: 13 }}>Prueba otro filtro o importa datos.</div>
          </div>
        )}
        {visible.map((s, i) => (
          <button
            key={s.key}
            className="workout-row fade-in"
            style={{ animationDelay: `${Math.min(i, 12) * 0.02}s` }}
            onClick={() => onOpen(s.routineTitle)}
          >
            <div className="badge">
              <span className="glyph">{initials(routineNames.get(s.routineTitle))}</span>
            </div>
            <div className="main">
              <div className="name">
                {routineNames.get(s.routineTitle)}
                {routineNames.hasRename(s.routineTitle) && <span className="renamed-dot" />}
              </div>
              <div className="meta">
                <span>{fmtRelative(s.startTime)}</span>
                <span className="dot" />
                <span>{s.exercises.length} ej</span>
                {s.durationMin && <><span className="dot" /><span>{s.durationMin} min</span></>}
              </div>
            </div>
            <span className="chev"><Icon.Chevron /></span>
          </button>
        ))}
        {!query && hiddenCount > 0 && !showAll && (
          <button className="see-all-btn" onClick={() => setShowAll(true)}>
            Ver más
          </button>
        )}
        {!query && showAll && filtered.length > initialN && (
          <button className="see-all-btn ghost" onClick={() => setShowAll(false)}>
            Mostrar menos
          </button>
        )}
        <div className="safe-bottom" />
      </div>
      <BottomTabs active="routines" />
    </div>
  );
}

export function initials(title) {
  const cleaned = title
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[()#:\-_/]/g, ' ')
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'W';

  const dayMatch = title.match(/day\s*(\d+)/i);
  if (dayMatch) return 'D' + dayMatch[1];

  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + (parts[1][0] || '')).toUpperCase();
}

export default ListScreen;

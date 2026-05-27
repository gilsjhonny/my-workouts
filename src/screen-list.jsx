import React from 'react';
import Icon from './icons.jsx';
import { fmtRelative } from './parser.js';
import { RoutineNamesContext } from './contexts.js';
import { BottomTabs } from './screen-folders.jsx';

function ListScreen({ workouts, onOpen, onReimport, onLogout }) {
  const routineNames = React.useContext(RoutineNamesContext);
  const [query, setQuery] = React.useState('');
  const [showAll, setShowAll] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  const filtered = React.useMemo(() => {
    let arr = workouts.slice();
    if (query) {
      const q = query.toLowerCase();
      arr = arr.filter(w =>
        routineNames.get(w.title).toLowerCase().includes(q) ||
        w.title.toLowerCase().includes(q)
      );
    }
    return arr;
  }, [workouts, query, routineNames]);

  const initialN = 5;
  const visible = (showAll || query) ? filtered : filtered.slice(0, initialN);
  const hiddenCount = filtered.length - visible.length;

  const totalSessions = workouts.reduce((a, w) => a + w.sessionCount, 0);
  const totalSets = workouts.reduce((a, w) => a + w.totalSets, 0);

  const mostRecent = workouts[0];

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
              <div style={{ position: 'absolute', right: 0, top: '110%', zIndex: 100, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, boxShadow: 'var(--shadow-md)', minWidth: 160, overflow: 'hidden' }}>
                <button
                  onClick={() => { setMenuOpen(false); onLogout?.(); }}
                  style={{ width: '100%', textAlign: 'left', padding: '13px 16px', fontSize: 14, color: 'var(--down)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="page-head">
        <div className="eyebrow">Biblioteca</div>
      </div>

      {mostRecent && (
        <div className="hero fade-in" key={mostRecent.title} role="button" onClick={() => onOpen(mostRecent.title)}>
          <div className="hero-eyebrow">Más reciente</div>
          <h2>{routineNames.get(mostRecent.title)}</h2>
          <div className="stats">
            <span><span className="stat-num">{mostRecent.sessionCount}</span> sesiones</span>
            <span>·</span>
            <span><span className="stat-num">{mostRecent.exerciseCount}</span> ejercicios</span>
            <span>·</span>
            <span>{fmtRelative(mostRecent.lastDate)}</span>
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
          placeholder="Buscar rutinas…"
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
        {visible.map((w, i) => (
          <button
            key={w.title}
            className="workout-row fade-in"
            style={{ animationDelay: `${Math.min(i, 12) * 0.02}s` }}
            onClick={() => onOpen(w.title)}
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
                <span>{w.sessionCount} {w.sessionCount === 1 ? 'sesión' : 'sesiones'}</span>
                <span className="dot" />
                <span>{w.exerciseCount} ej</span>
                <span className="dot" />
                <span>{fmtRelative(w.lastDate)}</span>
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

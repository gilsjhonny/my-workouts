import React from 'react';
import Icon from './icons.jsx';
import { exerciseHistoryForGroup } from './parser.js';
import { ExerciseNamesContext, RoutineNamesContext, ExerciseAlternatesContext } from './contexts.js';
import { SetMini, formatNum, topSetOf, shortRoutine } from './screen-detail.jsx';

function ExerciseScreen({ exerciseName, workouts, onBack }) {
  const names = React.useContext(ExerciseNamesContext);
  const routineNames = React.useContext(RoutineNamesContext);
  const alts = React.useContext(ExerciseAlternatesContext);

  const displayName = names.get(exerciseName);
  const renamed = names.hasRename(exerciseName);
  const group = alts.getGroup(exerciseName);
  const linkedAlts = group.filter(n => n !== exerciseName);

  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [pickingAlt, setPickingAlt] = React.useState(false);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [editing]);

  const history = React.useMemo(
    () => exerciseHistoryForGroup(workouts, group),
    [workouts, group.join(',')]
  );

  const stats = React.useMemo(() => computeStats(history), [history]);

  if (pickingAlt) {
    return (
      <AlternatePicker
        workouts={workouts}
        group={group}
        canonicalName={exerciseName}
        onCancel={() => setPickingAlt(false)}
        onConfirm={(altName) => { alts.link(altName, exerciseName); setPickingAlt(false); }}
      />
    );
  }

  if (history.length === 0) {
    return (
      <div className="app-frame" data-screen-label="07 Detalle de ejercicio">
        <div className="topbar">
          <button className="iconbtn" onClick={onBack} aria-label="volver"><Icon.Back /></button>
          <div className="title">Ejercicio</div>
          <div style={{ width: 40 }} />
        </div>
        <div className="empty">Sin datos para este ejercicio.</div>
      </div>
    );
  }

  function commitName() {
    names.rename(exerciseName, draft);
    setEditing(false);
  }
  function resetName() { names.rename(exerciseName, ''); setEditing(false); }

  return (
    <div className="app-frame" data-screen-label="07 Detalle de ejercicio">
      <div className="topbar">
        <button className="iconbtn" onClick={onBack} aria-label="volver"><Icon.Back /></button>
        <div className="title">Ejercicio</div>
        <div style={{ width: 40 }} />
      </div>

      <div className="ex-screen-head fade-in">
        <div className="eyebrow">Ejercicio</div>
        {editing ? (
          <div className="routine-title-edit">
            <input
              ref={inputRef}
              className="folder-name-input ex-name-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); commitName(); }
                if (e.key === 'Escape') { e.preventDefault(); setEditing(false); }
              }}
              placeholder={exerciseName}
            />
            {renamed && (
              <button className="routine-title-reset" onMouseDown={(e)=>e.preventDefault()} onClick={resetName} title="Restaurar nombre original">
                <Icon.Reset size={14} />
              </button>
            )}
          </div>
        ) : (
          <h1 onClick={() => { setDraft(displayName); setEditing(true); }} className="ex-name" title={renamed ? 'Original: ' + exerciseName : 'Tocar para renombrar'}>
            {displayName}
            {renamed && <span className="renamed-dot" />}
            <Icon.Pencil size={13} color="rgba(20,22,15,0.4)" />
          </h1>
        )}
        <div className="ex-sub">
          {stats.sessionCount} sesi{stats.sessionCount === 1 ? 'ón' : 'ones'} · {stats.dateRange}
        </div>
      </div>

      <div className="ex-stats">
        <StatCard
          label="Mejor peso"
          value={stats.heaviest ? `${formatNum(stats.heaviest.weight)}kg` : '—'}
          sub={stats.heaviest ? `${stats.heaviest.reps} reps · ${stats.heaviest.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}` : null}
          highlight
        />
        <StatCard
          label="Mejor reps × peso"
          value={stats.bestRepsByWeight ? `${stats.bestRepsByWeight.reps} × ${formatNum(stats.bestRepsByWeight.weight)}kg` : '—'}
          sub={stats.bestRepsByWeight ? `${stats.bestRepsByWeight.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })} · rutina ${routineNames.get(stats.bestRepsByWeight.routine)}` : null}
        />
      </div>

      <TopSetChart history={history} />

      <div className="ex-section-title">Historial completo</div>
      <div className="ex-history-wrap">
        <FullHistoryGrid history={history} canonicalName={exerciseName} />
      </div>

      <div className="ex-section-title">Ejercicios alternativos</div>
      <div style={{ padding: '0 16px 8px' }}>
        {linkedAlts.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 8 }}>
            Ninguno. Añade ejercicios que hayas hecho en lugar de éste.
          </div>
        )}
        {linkedAlts.map(altName => (
          <div key={altName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{names.get(altName)}</div>
              {names.hasRename(altName) && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{altName}</div>}
            </div>
            <button
              onClick={() => alts.unlink(altName)}
              style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', fontSize: 13, padding: '4px 0 4px 12px' }}
            >
              Quitar
            </button>
          </div>
        ))}
        <button
          className="folder-create-btn"
          style={{ marginTop: 8 }}
          onClick={() => setPickingAlt(true)}
        >
          <Icon.Plus size={16} />
          <span>Añadir alternativo</span>
        </button>
      </div>

      <div className="safe-bottom" />
    </div>
  );
}

function AlternatePicker({ workouts, group, canonicalName, onCancel, onConfirm }) {
  const names = React.useContext(ExerciseNamesContext);
  const [query, setQuery] = React.useState('');
  const groupSet = new Set(group);

  const allExercises = React.useMemo(() => {
    const seen = new Set();
    workouts.forEach(w => w.sessions.forEach(s => s.exercises.forEach(e => seen.add(e.name))));
    return [...seen]
      .filter(n => !groupSet.has(n))
      .sort((a, b) => names.get(a).localeCompare(names.get(b)));
  }, [workouts, group]);

  const filtered = React.useMemo(() => {
    if (!query) return allExercises;
    const q = query.toLowerCase();
    return allExercises.filter(n => names.get(n).toLowerCase().includes(q) || n.toLowerCase().includes(q));
  }, [allExercises, query]);

  return (
    <div className="app-frame" data-screen-label="08 Selector de alternativo">
      <div className="topbar">
        <button className="iconbtn" onClick={onCancel} aria-label="cancelar"><Icon.Back /></button>
        <div className="title">{names.get(canonicalName)}</div>
        <div style={{ width: 40 }} />
      </div>

      <div className="page-head">
        <div className="eyebrow">Alternativo</div>
        <h1>¿Qué ejercicio hiciste en su lugar?</h1>
      </div>

      <div className="search">
        <Icon.Search />
        <input
          placeholder="Buscar ejercicio…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      <div className="list">
        {filtered.length === 0 && (
          <div className="empty">
            <div style={{ fontSize: 13 }}>Sin resultados.</div>
          </div>
        )}
        {filtered.map(name => (
          <button
            key={name}
            className="workout-row"
            onClick={() => onConfirm(name)}
          >
            <div className="main">
              <div className="name">{names.get(name)}</div>
              {names.hasRename(name) && <div className="meta"><span>{name}</span></div>}
            </div>
            <span className="chev"><Icon.Chevron /></span>
          </button>
        ))}
        <div className="safe-bottom" />
      </div>
    </div>
  );
}

function computeStats(history) {
  let heaviest = null;
  let bestRepsByWeight = null;
  for (const h of history) {
    for (const s of h.ex.sets) {
      if (s.setType === 'warmup' || !s.weight || !s.reps) continue;
      if (!heaviest || s.weight > heaviest.weight || (s.weight === heaviest.weight && s.reps > heaviest.reps)) {
        heaviest = { weight: s.weight, reps: s.reps, date: h.session.startTime, routine: h.session.title };
      }
      const score = s.reps * s.weight;
      if (!bestRepsByWeight || score > bestRepsByWeight.score) {
        bestRepsByWeight = { weight: s.weight, reps: s.reps, score, date: h.session.startTime, routine: h.session.title };
      }
    }
  }

  const sessionCount = history.length;
  const last = history[0]?.session.startTime;
  const first = history[history.length - 1]?.session.startTime;
  const fmtFull = (d) => d ? d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const dateRange = first && last
    ? (first.getTime() === last.getTime()
        ? fmtFull(first)
        : `${fmtFull(first)} → ${fmtFull(last)}`)
    : '—';

  let frequency = '—';
  if (first && last && sessionCount > 1) {
    const months = Math.max(1, (last - first) / (1000 * 60 * 60 * 24 * 30));
    const perMonth = sessionCount / months;
    frequency = `${perMonth >= 10 ? perMonth.toFixed(0) : perMonth.toFixed(1)} ses/mes`;
  } else {
    frequency = sessionCount === 1 ? 'única' : '—';
  }

  const topSetOfEntry = (h) => {
    let best = null;
    for (const s of h.ex.sets) {
      if (s.setType === 'warmup' || !s.weight || !s.reps) continue;
      if (!best || s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)) best = s;
    }
    return best;
  };
  const firstTop = first ? topSetOfEntry(history[history.length - 1]) : null;
  const lastTop = last ? topSetOfEntry(history[0]) : null;
  let progressionText = '—', progressionSub = null, progressionTone = 'flat';
  if (firstTop && lastTop) {
    const diff = lastTop.weight - firstTop.weight;
    progressionTone = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
    const sign = diff > 0 ? '+' : '';
    progressionText = diff === 0 ? '0 kg' : `${sign}${formatNum(diff)} kg`;
    progressionSub = `${formatNum(firstTop.weight)} → ${formatNum(lastTop.weight)}kg`;
  }

  return { heaviest, bestRepsByWeight, sessionCount, dateRange, frequency, progressionText, progressionSub, progressionTone };
}

function StatCard({ label, value, sub, highlight, tone }) {
  return (
    <div className={'stat-card' + (highlight ? ' hi' : '') + (tone ? ' tone-' + tone : '')}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function TopSetChart({ history }) {
  const series = history.slice().reverse().map(h => {
    let top = null;
    for (const s of h.ex.sets) {
      if (s.setType === 'warmup' || !s.weight || !s.reps) continue;
      if (!top || s.weight > top.weight || (s.weight === top.weight && s.reps > top.reps)) top = s;
    }
    return top ? { date: h.session.startTime, weight: top.weight, reps: top.reps, routine: h.session.title } : null;
  }).filter(Boolean);
  if (series.length < 2) return null;

  const vals = series.map(p => p.weight);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const padTop = max + range * 0.12;
  const padBot = Math.max(0, min - range * 0.08);
  const fullRange = padTop - padBot;
  const W = 320, H = 140, P = 14;
  const innerW = W - P * 2;
  const innerH = H - P * 2;
  const points = series.map((p, i) => {
    const x = P + (i / (series.length - 1)) * innerW;
    const y = P + innerH - ((p.weight - padBot) / fullRange) * innerH;
    return { ...p, x, y };
  });
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = path + ` L${points[points.length-1].x.toFixed(1)},${(P+innerH).toFixed(1)} L${points[0].x.toFixed(1)},${(P+innerH).toFixed(1)} Z`;

  const first = points[0], last = points[points.length - 1];
  const diff = last.weight - first.weight;

  const yearTicks = [];
  const firstYear = first.date.getFullYear();
  const lastYear = last.date.getFullYear();
  if (firstYear !== lastYear) {
    const span = last.date.getTime() - first.date.getTime();
    for (let y = firstYear + 1; y <= lastYear; y++) {
      const yearStart = new Date(y, 0, 1).getTime();
      if (yearStart >= first.date.getTime() && yearStart <= last.date.getTime()) {
        const t = (yearStart - first.date.getTime()) / span;
        yearTicks.push({ year: y, x: P + t * innerW });
      }
    }
  }

  return (
    <div className="ex-chart">
      <div className="ex-chart-head">
        <div className="ex-chart-title">Evolución del peso máximo</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="ex-chart-svg" preserveAspectRatio="none">
        {yearTicks.map((t, i) => (
          <line key={i} x1={t.x} x2={t.x} y1={P} y2={P + innerH} stroke="var(--ink-3)" strokeWidth="1" strokeDasharray="2 3" opacity="0.4" />
        ))}
        <path d={areaPath} fill="var(--accent)" opacity="0.22" />
        <path d={path} fill="none" stroke="var(--ink)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2.2} fill={i === points.length - 1 ? 'var(--accent)' : 'var(--ink)'} stroke={i === points.length - 1 ? 'var(--ink)' : 'none'} strokeWidth="1.4" />
        ))}
      </svg>
      {yearTicks.length > 0 && (
        <div className="ex-chart-years" style={{ position: 'relative', height: 14, margin: '2px 0 0' }}>
          <span className="yr-tick" style={{ left: `${(P / W) * 100}%` }}>{firstYear}</span>
          {yearTicks.map(t => (
            <span key={t.year} className="yr-tick" style={{ left: `${(t.x / W) * 100}%` }}>{t.year}</span>
          ))}
        </div>
      )}
      <div className="ex-chart-axes">
        <span>{first.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })} · {formatNum(first.weight)}kg</span>
        <span>{last.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })} · {formatNum(last.weight)}kg</span>
      </div>
    </div>
  );
}

const COL_PALETTE = [
  { bg: 'rgba(239,68,68,0.13)',   fg: 'rgba(185,28,28,0.9)'  },
  { bg: 'rgba(249,115,22,0.13)',  fg: 'rgba(194,65,12,0.9)'  },
  { bg: 'rgba(234,179,8,0.13)',   fg: 'rgba(161,98,7,0.9)'   },
  { bg: 'rgba(34,197,94,0.13)',   fg: 'rgba(21,128,61,0.9)'  },
  { bg: 'rgba(59,130,246,0.13)',  fg: 'rgba(29,78,216,0.9)'  },
  { bg: 'rgba(168,85,247,0.13)',  fg: 'rgba(126,34,206,0.9)' },
  { bg: 'rgba(236,72,153,0.13)',  fg: 'rgba(190,24,93,0.9)'  },
  { bg: 'rgba(20,184,166,0.13)',  fg: 'rgba(15,118,110,0.9)' },
];

function buildColorMap(display) {
  const map = new Map();
  display.forEach(h => {
    const key = h.actualName || '';
    if (key && !map.has(key)) map.set(key, COL_PALETTE[map.size % COL_PALETTE.length]);
  });
  return map;
}

export function FullHistoryGrid({ history, canonicalName, onOpenSession, hideRoutineName }) {
  const names = React.useContext(ExerciseNamesContext);
  const routineNames = React.useContext(RoutineNamesContext);
  const display = history.slice().reverse();
  const lastIdx = display.length - 1;
  const maxSets = display.reduce((m, h) => Math.max(m, h.ex.sets.length), 0);
  const rows = Array.from({ length: maxSets }, (_, i) => i);
  const tops = display.map(h => topSetOf(h.ex.sets.filter(s => s.setType !== 'warmup')));

  const distinctNames = new Set(display.map(h => h.actualName).filter(Boolean));
  const useColors = distinctNames.size > 1;
  const colorMap = useColors ? buildColorMap(display) : new Map();

  const colBg = (h) => useColors ? (colorMap.get(h.actualName)?.bg || undefined) : undefined;
  const colFg = (h) => useColors ? (colorMap.get(h.actualName)?.fg || undefined) : undefined;

  // newest-to-oldest: old sessions reversed so index 0 = second-newest
  const oldDisplay = display.slice(0, lastIdx).map((h, i) => ({ h, origIdx: i })).reverse();

  const splitRef = React.useRef(null);
  const historyKey = display.map(h => h.session.key).join(',');
  React.useLayoutEffect(() => {
    if (!splitRef.current) return;
    const heads = splitRef.current.querySelectorAll('.hcell.head');
    heads.forEach(el => { el.style.minHeight = ''; });
    const maxH = Math.max(...Array.from(heads).map(el => el.getBoundingClientRect().height));
    heads.forEach(el => { el.style.minHeight = maxH + 'px'; });
  }, [historyKey]);

  return (
    <div className="history-split" ref={splitRef}>
      <div className="history-current">
        <div className="history-grid cur-grid" style={{ gridTemplateColumns: 'minmax(108px, 1fr)' }}>
          <div
            className="hcell head cur"
            style={{ cursor: onOpenSession ? 'pointer' : undefined }}
            onClick={onOpenSession ? () => onOpenSession(display[lastIdx].session.key, display[lastIdx].session.title) : undefined}
          >
            <div className="date">{display[lastIdx].session.startTime.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</div>
            <div className="yr">{display[lastIdx].session.startTime.getFullYear()}</div>
            {!hideRoutineName && (
              <div className="rt" style={{ color: 'rgba(20,22,15,0.6)' }}>{shortRoutine(routineNames.get(display[lastIdx].session.title))}</div>
            )}
            {display[lastIdx].actualName && display[lastIdx].actualName !== canonicalName && (
              <div className="alt-tag" style={useColors ? { background: colorMap.get(display[lastIdx].actualName)?.bg, color: colorMap.get(display[lastIdx].actualName)?.fg, outline: `1px solid ${colorMap.get(display[lastIdx].actualName)?.fg}` } : undefined} title={names.get(display[lastIdx].actualName)}>
                {names.get(display[lastIdx].actualName)}
              </div>
            )}
          </div>
          {rows.map(rIdx => {
            const set = display[lastIdx].ex.sets[rIdx];
            const prev = display[lastIdx - 1]?.ex.sets[rIdx];
            const isTop = set && tops[lastIdx] && set === tops[lastIdx];
            return (
              <div key={'cur:' + rIdx} className={'hcell set cur' + (isTop ? ' top' : '')}>
                <SetMini set={set} prev={prev} isTop={isTop} />
              </div>
            );
          })}
        </div>
      </div>

      {display.length > 1 ? (
        <div className="history-scroll">
          <div className="history-grid old" style={{ gridTemplateColumns: `28px repeat(${display.length - 1}, minmax(96px, 130px))` }}>
            <div className="hcell idx">#</div>
            {oldDisplay.map(({ h }) => (
              <div
                key={h.session.key}
                className="hcell head"
                style={{ background: colBg(h), cursor: onOpenSession ? 'pointer' : undefined }}
                onClick={onOpenSession ? () => onOpenSession(h.session.key, h.session.title) : undefined}
              >
                <div className="date">{h.session.startTime.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</div>
                <div className="yr">{h.session.startTime.getFullYear()}</div>
                {!hideRoutineName && (
                  <div className="rt" title={routineNames.get(h.session.title)}>
                    {shortRoutine(routineNames.get(h.session.title))}
                  </div>
                )}
                {h.actualName && h.actualName !== canonicalName && (
                  <div className="alt-tag" style={useColors ? { background: colBg(h), color: colFg(h), outline: `1px solid ${colFg(h)}` } : undefined} title={names.get(h.actualName)}>
                    {names.get(h.actualName)}
                  </div>
                )}
              </div>
            ))}
            {rows.map(rIdx => (
              <React.Fragment key={rIdx}>
                <div className="hcell idx">{rIdx + 1}</div>
                {oldDisplay.map(({ h, origIdx }) => {
                  const set = h.ex.sets[rIdx];
                  const isTop = set && tops[origIdx] && set === tops[origIdx];
                  return (
                    <div key={h.session.key + ':' + rIdx} className={'hcell set' + (isTop ? ' top' : '')} style={{ background: colBg(h) }}>
                      <SetMini set={set} prev={null} isTop={isTop} />
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      ) : (
        <div className="history-empty">
          Solo una sesión registrada
          <span>aún sin historial</span>
        </div>
      )}
    </div>
  );
}

export default ExerciseScreen;

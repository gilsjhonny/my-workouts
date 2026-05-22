import React from 'react';
import Icon from './icons.jsx';
import { exerciseHistoryAll } from './parser.js';
import { ExerciseNamesContext, RoutineNamesContext } from './contexts.js';
import { SetMini, formatNum, topSetOf, shortRoutine } from './screen-detail.jsx';

function ExerciseScreen({ exerciseName, workouts, onBack }) {
  const names = React.useContext(ExerciseNamesContext);
  const routineNames = React.useContext(RoutineNamesContext);
  const displayName = names.get(exerciseName);
  const renamed = names.hasRename(exerciseName);

  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [editing]);

  const history = React.useMemo(
    () => exerciseHistoryAll(workouts, exerciseName),
    [workouts, exerciseName]
  );

  const stats = React.useMemo(() => computeStats(history), [history]);

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
        <FullHistoryGrid history={history} currentRoutineTitle={null} />
      </div>

      <div className="safe-bottom" />
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
  const tone = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';

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

function FullHistoryGrid({ history }) {
  const routineNames = React.useContext(RoutineNamesContext);
  const display = history.slice().reverse();
  const lastIdx = display.length - 1;
  const maxSets = display.reduce((m, h) => Math.max(m, h.ex.sets.length), 0);
  const rows = Array.from({ length: maxSets }, (_, i) => i);
  const tops = display.map(h => topSetOf(h.ex.sets.filter(s => s.setType !== 'warmup')));

  const wrapRef = React.useRef(null);
  React.useLayoutEffect(() => {
    if (wrapRef.current) wrapRef.current.scrollLeft = wrapRef.current.scrollWidth;
  }, [display.length]);

  return (
    <div className="history-split">
      {display.length > 1 ? (
        <div className="history-scroll" ref={wrapRef}>
          <div className="history-grid old" style={{ gridTemplateColumns: `28px repeat(${display.length - 1}, minmax(96px, 1fr))` }}>
            <div className="hcell idx">#</div>
            {display.slice(0, lastIdx).map((h) => (
              <div key={h.session.key} className="hcell head">
                <div className="date">{h.session.startTime.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</div>
                <div className="yr">{h.session.startTime.getFullYear()}</div>
                <div className="rt" title={routineNames.get(h.session.title)}>
                  {shortRoutine(routineNames.get(h.session.title))}
                </div>
              </div>
            ))}
            {rows.map(rIdx => (
              <React.Fragment key={rIdx}>
                <div className="hcell idx">{rIdx + 1}</div>
                {display.slice(0, lastIdx).map((h, ci) => {
                  const set = h.ex.sets[rIdx];
                  const isTop = set && tops[ci] && set === tops[ci];
                  return (
                    <div key={h.session.key + ':' + rIdx} className={'hcell set' + (isTop ? ' top' : '')}>
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

      <div className="history-current">
        <div className="history-grid cur-grid" style={{ gridTemplateColumns: 'minmax(108px, 1fr)' }}>
          <div className="hcell head cur">
            <div className="date">{display[lastIdx].session.startTime.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</div>
            <div className="yr">{display[lastIdx].session.startTime.getFullYear()}</div>
            <div className="rt" style={{ color: 'rgba(20,22,15,0.6)' }}>{shortRoutine(routineNames.get(display[lastIdx].session.title))}</div>
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
    </div>
  );
}

export default ExerciseScreen;

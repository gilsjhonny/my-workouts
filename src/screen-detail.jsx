import React from 'react';
import Icon from './icons.jsx';
import { fmtDate, fmtDateShort, exerciseHistory } from './parser.js';
import { ExerciseNamesContext, RoutineNamesContext } from './contexts.js';

function DetailScreen({ workout, workouts, onBack, onOpenExercise, tweaks, onAssign }) {
  const names = React.useContext(ExerciseNamesContext);
  const routineNames = React.useContext(RoutineNamesContext);
  const [selectedIdx, setSelectedIdx] = React.useState(0);
  const [openExercise, setOpenExercise] = React.useState(null);
  const [editingTitle, setEditingTitle] = React.useState(false);
  const [showAllSessions, setShowAllSessions] = React.useState(false);
  const [titleDraft, setTitleDraft] = React.useState('');
  const titleRef = React.useRef(null);

  React.useEffect(() => {
    if (editingTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [editingTitle]);

  const displayTitle = routineNames.get(workout.title);
  const isRenamed = routineNames.hasRename(workout.title);

  function startTitleEdit() {
    setTitleDraft(displayTitle);
    setEditingTitle(true);
  }
  function commitTitle() {
    routineNames.rename(workout.title, titleDraft);
    setEditingTitle(false);
  }
  function resetTitle() {
    routineNames.rename(workout.title, '');
    setEditingTitle(false);
  }

  const session = workout.sessions[selectedIdx];
  const baselineMode = tweaks.baseline || 'previous';

  if (!session) return (
    <div className="app-frame">
      <div className="topbar">
        <button className="iconbtn" onClick={onBack} aria-label="volver"><Icon.Back /></button>
        <div className="title">Progreso</div>
        <div style={{ width: 36 }} />
      </div>
      <div className="empty" style={{ paddingTop: 80 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{displayTitle}</div>
        <div style={{ fontSize: 13 }}>No hay sesiones en este período.</div>
      </div>
    </div>
  );

  return (
    <div className="app-frame" data-screen-label="03 Detalle de rutina">
      <div className="topbar">
        <button className="iconbtn" onClick={onBack} aria-label="volver"><Icon.Back /></button>
        <div className="title">Progreso</div>
        <button className="iconbtn" aria-label="más"><Icon.Dots /></button>
      </div>

      <div className="detail-hero fade-in">
        <div className="eyebrow">Rutina</div>
        {editingTitle ? (
          <div className="routine-title-edit">
            <input
              ref={titleRef}
              className="folder-name-input"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); commitTitle(); }
                if (e.key === 'Escape') { e.preventDefault(); setEditingTitle(false); }
              }}
              placeholder={workout.title}
            />
            {isRenamed && (
              <button
                className="routine-title-reset"
                onMouseDown={(e) => e.preventDefault()}
                onClick={resetTitle}
                title="Restaurar nombre original"
              >
                <Icon.Reset size={14} />
              </button>
            )}
          </div>
        ) : (
          <h1
            className="routine-title"
            onClick={startTitleEdit}
            title={isRenamed ? 'Original: ' + workout.title : 'Tocar para renombrar'}
          >
            {displayTitle}
            {isRenamed && <span className="renamed-dot dark" aria-label="renombrado" />}
            <Icon.Pencil size={13} color="rgba(20,22,15,0.4)" />
          </h1>
        )}
        <div className="when">
          <Icon.Calendar size={13} />
          <span>{fmtDate(session.startTime)}</span>
          <span className="dot" />
          <Icon.Clock size={13} />
          <span>{session.durationMin != null ? session.durationMin + ' min' : '—'}</span>
          <span className="dot" />
          <span>{session.exercises.length} ej · {session.exercises.reduce((a,e)=>a+e.sets.length,0)} series</span>
        </div>
      </div>

      {workout.sessions.length > 1 && (
        <>
          <div style={{ padding: '0 20px 8px', fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>
            Sesión
          </div>
          <div className="sessions-strip">
            {(() => {
              const initialN = 5;
              const shouldShowAll = showAllSessions || selectedIdx >= initialN;
              const visible = shouldShowAll ? workout.sessions : workout.sessions.slice(0, initialN);
              const rest = workout.sessions.length - visible.length;
              return (
                <>
                  {visible.map((s, i) => {
                    const d = s.startTime;
                    return (
                      <button
                        key={s.key}
                        className={'sess-pill' + (i === selectedIdx ? ' active' : '')}
                        onClick={() => { setSelectedIdx(i); setOpenExercise(null); }}
                      >
                        <span className="day">{d.getDate()}</span>
                        <span className="month">{d.toLocaleDateString('es-ES', { month: 'short' })} {d.getFullYear().toString().slice(2)}</span>
                      </button>
                    );
                  })}
                  {rest > 0 && (
                    <button className="sess-pill more" onClick={() => setShowAllSessions(true)}>
                      <span className="day">+{rest}</span>
                      <span className="month">ver todas</span>
                    </button>
                  )}
                  {shouldShowAll && workout.sessions.length > initialN && (
                    <button className="sess-pill less" onClick={() => { setShowAllSessions(false); if (selectedIdx >= initialN) setSelectedIdx(0); }}>
                      <span className="day">−</span>
                      <span className="month">menos</span>
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </>
      )}

      {onAssign && (
        <div style={{ padding: '0 16px 8px' }}>
          <button
            onClick={() => onAssign(session.key)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px dashed var(--line)', background: 'var(--surface-2)', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', cursor: 'pointer', textAlign: 'left' }}
          >
            Asignar a plantilla →
          </button>
        </div>
      )}

      <div className="list" style={{ paddingTop: 8 }}>
        {session.exercises.map((ex, i) => (
          <ExerciseCard
            key={ex.name}
            workout={workout}
            workouts={workouts}
            exercise={ex}
            currentSession={session}
            currentSessionIdx={selectedIdx}
            isOpen={openExercise === ex.name}
            onToggle={() => setOpenExercise(openExercise === ex.name ? null : ex.name)}
            onOpenExercise={onOpenExercise}
            baselineMode={baselineMode}
            deltaStyle={tweaks.deltaStyle || 'arrows'}
            tweaks={tweaks}
            animIdx={i}
          />
        ))}
        <div className="safe-bottom" />
      </div>
    </div>
  );
}

function ExerciseCard({ workout, workouts, exercise, currentSession, currentSessionIdx, isOpen, onToggle, onOpenExercise, baselineMode, deltaStyle, tweaks, animIdx }) {
  const names = React.useContext(ExerciseNamesContext);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const displayName = names.get(exercise.name);
  const renamed = names.hasRename(exercise.name);

  function startEdit(e) {
    e.stopPropagation();
    setDraft(displayName);
    setEditing(true);
  }
  function commit() {
    names.rename(exercise.name, draft);
    setEditing(false);
  }
  function cancel() { setEditing(false); }
  function resetName(e) {
    e.stopPropagation();
    names.rename(exercise.name, '');
    setEditing(false);
  }

  const history = React.useMemo(
    () => exerciseHistory(workout, exercise.name),
    [workout, exercise.name]
  );

  const currentEntry = history.find(h => h.session.key === currentSession.key);
  const currentIdxInHistory = history.indexOf(currentEntry);

  let baselineEntry = null;
  if (baselineMode === 'previous') {
    baselineEntry = history[currentIdxInHistory + 1] || null;
  } else if (baselineMode === 'best') {
    const others = history.filter((_, i) => i !== currentIdxInHistory);
    baselineEntry = others.sort((a, b) => b.topSetWeight - a.topSetWeight || b.totalVolume - a.totalVolume)[0] || null;
  } else if (baselineMode === 'first') {
    const earlier = history.slice(currentIdxInHistory + 1);
    baselineEntry = earlier[earlier.length - 1] || null;
  }

  const pbTopSetWeight = history.reduce((m, h) => Math.max(m, h.topSetWeight), 0);
  const pbTopReps = history.reduce((m, h) => {
    const maxRepAtAnyWeight = Math.max(...h.workSets.map(s => s.reps || 0), 0);
    return Math.max(m, maxRepAtAnyWeight);
  }, 0);

  const cur = currentEntry || { topSetWeight: 0, topReps: 0, totalVolume: 0, workSets: exercise.sets.filter(s => s.setType !== 'warmup') };
  const base = baselineEntry;

  const avgRir = (sets) => {
    const vals = sets.map(s => s.rir).filter(v => v != null);
    if (!vals.length) return null;
    return +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  };
  const curRir = avgRir(cur.workSets);
  const baseRir = base ? avgRir(base.workSets) : null;

  const topSetCur = topSetOf(cur.workSets);
  const topSetBase = base ? topSetOf(base.workSets) : null;

  const isPRTop = cur.topSetWeight > 0 && cur.topSetWeight >= pbTopSetWeight;

  return (
    <div className={'ex-card' + (isOpen ? ' open' : '') + ' fade-in'} style={{ animationDelay: `${Math.min(animIdx, 10) * 0.03}s` }}>
      <div className="ex-head" onClick={editing ? undefined : onToggle} role="button">
        {editing ? (
          <input
            ref={inputRef}
            className="ex-title-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commit(); }
              if (e.key === 'Escape') { e.preventDefault(); cancel(); }
            }}
            placeholder={exercise.name}
          />
        ) : (
          <div className="ex-title" title={renamed ? 'Original: ' + exercise.name : ''}>
            <span className="ex-title-text">{displayName}</span>
            {renamed && <span className="renamed-dot" aria-label="renombrado"></span>}
          </div>
        )}
        {!editing && (
          <button className="ex-edit" onClick={startEdit} aria-label="renombrar" title="Renombrar ejercicio">
            <Icon.Pencil size={13} />
          </button>
        )}
        {editing && renamed && (
          <button className="ex-edit" onMouseDown={(e) => e.preventDefault()} onClick={resetName} aria-label="restaurar" title="Restaurar nombre original">
            <Icon.Reset size={13} />
          </button>
        )}
        {!editing && (
          <>
            <span className="badge-num">{cur.workSets.length} {cur.workSets.length === 1 ? 'serie' : 'series'}</span>
            <span className="chev"><Icon.Chevron dir="down" /></span>
          </>
        )}
      </div>

      {history.length >= 2 && tweaks.showTrend && (
        <Sparkline history={history} currentKey={currentSession.key} />
      )}

      <div className={isOpen ? 'collapse-open' : 'collapse-enter'}>
        {isOpen && (
          <>
            {onOpenExercise && (
              <button className="ex-open-detail" onClick={() => onOpenExercise(exercise.name)}>
                <span>Ver detalle del ejercicio</span>
                <Icon.Chevron size={14} />
              </button>
            )}
            <HistoryTable
              history={history}
              currentKey={currentSession.key}
              currentRoutineTitle={workout.title}
              baselineMode={baselineMode}
              notes={exercise.notes}
              pbTopSetWeight={pbTopSetWeight}
            />
          </>
        )}
      </div>
    </div>
  );
}

function baselineLabel(base, mode) {
  const d = fmtDateShort(base.session.startTime);
  if (mode === 'previous') return 'Anterior · ' + d;
  if (mode === 'best') return 'Mejor · ' + d;
  if (mode === 'first') return 'Primera · ' + d;
  return d;
}

export function shortRoutine(title) {
  if (!title) return '';
  const cleaned = title.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim();
  if (cleaned.length <= 12) return cleaned;
  return cleaned.slice(0, 11) + '…';
}

export function topSetOf(sets) {
  let best = null;
  for (const s of sets) {
    if (!s.weight || !s.reps) continue;
    if (!best || s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)) best = s;
  }
  return best;
}

function topSetDelta(cur, base) {
  if (!cur || !base) return null;
  const wDiff = (cur.weight || 0) - (base.weight || 0);
  const rDiff = (cur.reps || 0) - (base.reps || 0);
  if (wDiff !== 0) return { dir: wDiff > 0 ? 'up' : 'down', text: `${wDiff > 0 ? '+' : ''}${formatNum(wDiff)} kg` };
  if (rDiff !== 0) return { dir: rDiff > 0 ? 'up' : 'down', text: `${rDiff > 0 ? '+' : ''}${rDiff} rep` };
  return { dir: 'flat', text: 'igual' };
}

function deltaNum(cur, base, suffix = '', lowerIsHarder = false) {
  const diff = cur - base;
  if (Math.abs(diff) < 0.05) return { dir: 'flat', text: 'igual' };
  let dir = diff > 0 ? 'up' : 'down';
  if (lowerIsHarder) dir = diff < 0 ? 'up' : 'down';
  const sign = diff > 0 ? '+' : '';
  return { dir, text: `${sign}${formatNum(diff)}${suffix ? ' ' + suffix : ''}` };
}

function SummaryCell({ label, value, delta, deltaStyle }) {
  return (
    <div className="cell">
      <span className="lbl">{label}</span>
      <span className="val">{value}</span>
      {delta && (
        <DeltaBadge delta={delta} style={deltaStyle} />
      )}
    </div>
  );
}

function DeltaBadge({ delta, style }) {
  if (style === 'numeric') {
    return <span className={'delta ' + delta.dir}>{delta.text}</span>;
  }
  const Arrow = delta.dir === 'up' ? Icon.ArrowUp : delta.dir === 'down' ? Icon.ArrowDown : Icon.Equals;
  return (
    <span className={'delta ' + delta.dir}>
      <Arrow size={10} /> {delta.text}
    </span>
  );
}

export function formatNum(n) {
  if (n == null) return '—';
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(1).replace(/\.0$/, '');
}

function Sparkline({ history, currentKey }) {
  const series = history.slice().reverse().map(h => ({
    key: h.session.key,
    date: h.session.startTime,
    val: h.topSetWeight,
  })).filter(p => p.val > 0);
  if (series.length < 2) return null;
  const vals = series.map(p => p.val);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const W = 200, H = 32, P = 4;
  const innerW = W - P * 2;
  const innerH = H - P * 2;
  const points = series.map((p, i) => {
    const x = P + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
    const y = P + innerH - ((p.val - min) / range) * innerH;
    return { ...p, x, y };
  });
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = path + ` L${points[points.length-1].x.toFixed(1)},${(P+innerH).toFixed(1)} L${points[0].x.toFixed(1)},${(P+innerH).toFixed(1)} Z`;
  const curPt = points.find(p => p.key === currentKey) || points[points.length - 1];
  const firstPt = points[0];

  const trendDir = curPt.val > firstPt.val ? 'up' : curPt.val < firstPt.val ? 'down' : 'flat';
  const diff = curPt.val - firstPt.val;

  return (
    <div className="trend">
      <div className="trend-head">
        <div className="trend-title">Evolución del peso tope</div>
        <div className={'trend-delta ' + trendDir}>
          {trendDir === 'up' && <Icon.ArrowUp size={10}/>}
          {trendDir === 'down' && <Icon.ArrowDown size={10}/>}
          {trendDir === 'flat' && <Icon.Equals size={10}/>}
          {diff > 0 ? '+' : ''}{formatNum(diff)} kg en {series.length} sesiones
        </div>
      </div>
      <div className="trend-body">
        <span className="trend-edge">
          <span className="v">{formatNum(firstPt.val)}kg</span>
          <span className="d">{fmtDateShort(firstPt.date)}</span>
        </span>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="trend-svg">
          <path d={areaPath} fill="var(--accent)" opacity="0.22" />
          <path d={path} fill="none" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={firstPt.x} cy={firstPt.y} r="2.5" fill="var(--ink-3)" />
          <circle cx={curPt.x} cy={curPt.y} r="4.5" fill="var(--accent)" stroke="var(--ink)" strokeWidth="1.5" />
        </svg>
        <span className="trend-edge right">
          <span className="v">{formatNum(curPt.val)}kg</span>
          <span className="d">actual</span>
        </span>
      </div>
    </div>
  );
}

function HistoryTable({ history, currentKey, currentRoutineTitle, baselineMode, notes, pbTopSetWeight }) {
  const [showAll, setShowAll] = React.useState(false);
  const curIdx = history.findIndex(h => h.session.key === currentKey);
  const fromCur = curIdx >= 0 ? history.slice(curIdx) : history;
  const initialN = 5;
  const descSlice = showAll ? fromCur : fromCur.slice(0, initialN);
  const display = descSlice.slice().reverse();
  const lastIdx = display.length - 1;
  const currentSessionDate = curIdx >= 0 ? history[curIdx].session.startTime : null;

  const maxSets = display.reduce((m, h) => Math.max(m, h.ex.sets.length), 0);
  const rows = Array.from({ length: maxSets }, (_, i) => i);

  const tops = display.map(h => topSetOf(h.ex.sets.filter(s => s.setType !== 'warmup')));

  const wrapRef = React.useRef(null);
  React.useLayoutEffect(() => {
    if (wrapRef.current) wrapRef.current.scrollLeft = wrapRef.current.scrollWidth;
  }, [display.length]);

  const labelFor = (h) => {
    const d = h.session.startTime;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="history fade-in">
      {notes && (
        <div className="session-note">
          <div className="session-note-label">
            Nota de la sesión {currentSessionDate ? '· ' + fmtDateShort(currentSessionDate) : ''}
          </div>
          <div className="session-note-body">"{notes}"</div>
        </div>
      )}

      <div className="history-split">
        {fromCur.length > initialN && !showAll && (
          <button
            className="history-more-fab"
            onClick={() => setShowAll(true)}
            aria-label={`Ver ${fromCur.length - initialN} sesiones más`}
            title={`Ver ${fromCur.length - initialN} sesiones más`}
          >
            <Icon.Chevron dir="left" size={18} />
            <span className="count">+{fromCur.length - initialN}</span>
          </button>
        )}
        {showAll && fromCur.length > initialN && (
          <button
            className="history-more-fab collapse"
            onClick={() => setShowAll(false)}
            aria-label="Mostrar menos"
            title="Mostrar menos"
          >
            <Icon.Chevron dir="right" size={18} />
          </button>
        )}
        {display.length > 1 ? (
          <div className="history-scroll" ref={wrapRef}>
            <div className="history-grid old" style={{ gridTemplateColumns: `28px repeat(${display.length - 1}, minmax(88px, 1fr))` }}>
              <div className="hcell idx">#</div>
              {display.slice(0, lastIdx).map((h) => (
                <div key={h.session.key} className="hcell head">
                  <div className="date">{labelFor(h)}</div>
                  <div className="yr">{h.session.startTime.getFullYear()}</div>
                  {h.session.title !== currentRoutineTitle && (
                    <div className="rt" title={h.session.title}>{shortRoutine(h.session.title)}</div>
                  )}
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
            Primera sesión registrada<br/><span>sin sesiones anteriores</span>
          </div>
        )}

        <div className="history-current">
          <div className="history-grid cur-grid" style={{ gridTemplateColumns: 'minmax(108px, 1fr)' }}>
            <div className="hcell head cur">
              <div className="date">{labelFor(display[lastIdx])}</div>
              <div className="yr">{display[lastIdx].session.startTime.getFullYear()}</div>
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
    </div>
  );
}

export function SetMini({ set, prev, isTop }) {
  if (!set) return <div className="setmini empty">—</div>;
  const isWarmup = set.setType === 'warmup';
  const isFailure = set.setType === 'failure';
  const isDropset = set.setType === 'dropset';
  const rir = set.rir;
  const rirText = rir != null ? `RIR ${rir}` : (set.rpe != null ? `RPE ${set.rpe}` : '');

  let deltaEl = null;
  if (prev && !isWarmup && prev.setType !== 'warmup') {
    const wDiff = (set.weight || 0) - (prev.weight || 0);
    const rDiff = (set.reps || 0) - (prev.reps || 0);
    let dir = 'flat', text = '=';
    if (wDiff > 0) { dir = 'up'; text = `+${formatNum(wDiff)}kg`; }
    else if (wDiff < 0) { dir = 'down'; text = `${formatNum(wDiff)}kg`; }
    else if (rDiff > 0) { dir = 'up'; text = `+${rDiff}`; }
    else if (rDiff < 0) { dir = 'down'; text = `${rDiff}`; }
    else if (set.rir != null && prev.rir != null) {
      const rirDiff = set.rir - prev.rir;
      if (Math.abs(rirDiff) >= 0.5) {
        const sign = rirDiff > 0 ? '+' : '';
        dir = rirDiff < 0 ? 'up' : 'down';
        text = `${sign}${rirDiff} RIR`;
      }
    }
    const Arrow = dir === 'up' ? Icon.ArrowUp : dir === 'down' ? Icon.ArrowDown : Icon.Equals;
    deltaEl = (
      <span className={'minidelta ' + dir}>
        <Arrow size={9} /> {text}
      </span>
    );
  }

  return (
    <div className={'setmini' + (isWarmup ? ' warmup' : '') + (isTop ? ' top' : '')}>
      <div className="main">
        <strong>{set.reps}</strong>
        <span className="x"> × </span>
        {set.weight != null ? formatNum(set.weight) + 'kg' : ''}
      </div>
      {rirText && <div className="rir">{rirText}</div>}
      <div className="flags">
        {isTop && <span className="flag top-tag">TOP</span>}
        {isWarmup && <span className="flag warm">cal.</span>}
        {isFailure && <span className="flag fail">fallo</span>}
        {isDropset && <span className="flag warm">drop</span>}
        {deltaEl}
      </div>
    </div>
  );
}

function SetsTable({ current, baseline, baselineMode, baselineLabel, notes }) {
  const curSets = current.workSets;
  const baseSets = baseline ? baseline.workSets : [];

  const maxLen = Math.max(curSets.length, baseSets.length);
  const rows = [];
  for (let i = 0; i < maxLen; i++) {
    rows.push({ idx: i + 1, cur: curSets[i], base: baseSets[i] });
  }

  return (
    <div className="sets fade-in">
      {notes && (
        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', padding: '0 4px 10px', borderBottom: '1px solid var(--line)', marginBottom: 10, fontStyle: 'italic' }}>
          "{notes}"
        </div>
      )}
      <div className="head">
        <span>#</span>
        <span>Esta sesión</span>
        <span>{baselineLabel || 'Sin previa'}</span>
      </div>
      {rows.map((r, i) => (
        <div className="row" key={i}>
          <div className="idx">{r.idx}</div>
          <SetCell set={r.cur} compareTo={r.base} side="cur" />
          <SetCell set={r.base} compareTo={r.cur} side="prev" />
        </div>
      ))}
      {baseline ? null : (
        <div style={{ fontSize: 12, color: 'var(--ink-3)', padding: '8px 4px 4px' }}>
          Primera vez registrando este ejercicio en esta rutina.
        </div>
      )}
    </div>
  );
}

function SetCell({ set, compareTo, side }) {
  if (!set) return <div className="cell-set prev"><span className="main">—</span></div>;
  const rir = set.rir;
  const rirText = rir != null ? `RIR ${rir}` : (set.rpe != null ? `RPE ${set.rpe}` : '—');
  const isWarmup = set.setType === 'warmup';
  const isFailure = set.setType === 'failure';
  const isDropset = set.setType === 'dropset';

  return (
    <div className={'cell-set ' + side}>
      <span className="main">
        <strong>{set.reps}</strong>{set.weight != null ? ' × ' + formatNum(set.weight) + 'kg' : ''}
      </span>
      <span className="rir">{rirText}</span>
      {isWarmup && <span className="pill warmup">calentamiento</span>}
      {isFailure && <span className="pill down">al fallo</span>}
      {isDropset && <span className="pill warmup">drop set</span>}
      {side === 'cur' && compareTo && !isWarmup && (
        <SetDeltaPill cur={set} prev={compareTo} />
      )}
    </div>
  );
}

function SetDeltaPill({ cur, prev }) {
  if (!cur || !prev || prev.setType === 'warmup') return null;
  const wDiff = (cur.weight || 0) - (prev.weight || 0);
  const rDiff = (cur.reps || 0) - (prev.reps || 0);
  let dir = 'flat', text = 'igual';
  if (wDiff > 0) { dir = 'up'; text = `+${formatNum(wDiff)}kg`; }
  else if (wDiff < 0) { dir = 'down'; text = `${formatNum(wDiff)}kg`; }
  else if (rDiff > 0) { dir = 'up'; text = `+${rDiff} rep`; }
  else if (rDiff < 0) { dir = 'down'; text = `${rDiff} rep`; }

  if (wDiff === 0 && rDiff === 0 && cur.rir != null && prev.rir != null) {
    const rirDiff = cur.rir - prev.rir;
    if (Math.abs(rirDiff) >= 0.5) {
      const sign = rirDiff > 0 ? '+' : '';
      dir = rirDiff < 0 ? 'up' : 'down';
      text = `${sign}${rirDiff} RIR`;
    }
  }

  const Arrow = dir === 'up' ? Icon.ArrowUp : dir === 'down' ? Icon.ArrowDown : Icon.Equals;
  return <span className={'pill ' + dir}><Arrow size={9} /> {text}</span>;
}

export default DetailScreen;

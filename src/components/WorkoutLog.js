import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Dumbbell, ChevronDown, ChevronUp, Scale, Trophy, Calendar, Edit2, Check, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import SplitGenerator from './SplitGenerator';
import './WorkoutLog.css';

function today() {
  return new Date().toISOString().split('T')[0];
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Maps JS getDay() (0=Sun) to our Mon-first index
function todayDayIndex() {
  const d = new Date().getDay(); // 0=Sun,1=Mon...6=Sat
  return d === 0 ? 6 : d - 1;   // convert to 0=Mon...6=Sun
}

// ── PR TOAST ──────────────────────────────────────────────────────────────────
// Shows a floating congratulations when a new weight PR is hit on any exercise
function PRToast({ prs, onDismiss }) {
  useEffect(() => {
    if (prs.length === 0) return;
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [prs, onDismiss]);

  if (prs.length === 0) return null;

  return (
    <div className="pr-toast fade-in">
      <div className="pr-toast-icon">🏆</div>
      <div className="pr-toast-body">
        <p className="pr-toast-title">New Personal Record{prs.length > 1 ? 's' : ''}!</p>
        {prs.map((pr, i) => (
          <p key={i} className="pr-toast-detail">
            <strong>{pr.exercise}</strong> — {pr.newWeight}lbs
            <span className="pr-toast-prev"> (was {pr.oldWeight}lbs)</span>
          </p>
        ))}
      </div>
      <button className="pr-toast-close" onClick={onDismiss}><X size={14} /></button>
    </div>
  );
}

// ── SPLIT BUILDER ─────────────────────────────────────────────────────────────
function SplitBuilder({ splits, setSplits, activeSplitId, setActiveSplitId }) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [splitName, setSplitName] = useState('');
  const [dayMap, setDayMap] = useState({
    Mon: '', Tue: '', Wed: '', Thu: '', Fri: '', Sat: '', Sun: ''
  });

  const activeSplit = splits.find(s => s.id === activeSplitId);
  const todayIdx = todayDayIndex();
  const todayDayKey = DAYS[todayIdx];
  const todayWorkout = activeSplit?.days?.[todayDayKey] || null;

  function startCreate() {
    setSplitName('');
    setDayMap({ Mon: '', Tue: '', Wed: '', Thu: '', Fri: '', Sat: '', Sun: '' });
    setCreating(true);
    setEditingId(null);
  }

  function startEdit(split) {
    setSplitName(split.name);
    setDayMap({ ...split.days });
    setEditingId(split.id);
    setCreating(false);
  }

  function handleSave() {
    if (!splitName.trim()) return;
    if (editingId) {
      setSplits(prev => prev.map(s =>
        s.id === editingId ? { ...s, name: splitName.trim(), days: dayMap } : s
      ));
      setEditingId(null);
    } else {
      const newSplit = { id: Date.now(), name: splitName.trim(), days: dayMap };
      setSplits(prev => [...prev, newSplit]);
      setActiveSplitId(newSplit.id);
      setCreating(false);
    }
  }

  function handleDelete(id) {
    setSplits(prev => prev.filter(s => s.id !== id));
    if (activeSplitId === id) setActiveSplitId(null);
  }

  function handleCancel() {
    setCreating(false);
    setEditingId(null);
  }

  const isEditing = creating || editingId !== null;

  return (
    <div className="split-builder card">
      {/* Header */}
      <div className="split-header">
        <div className="split-title-row">
          <Calendar size={15} color="var(--accent)" />
          <h3 className="split-title">Weekly Split</h3>
        </div>
        {!isEditing && (
          <button className="btn-ghost split-new-btn" onClick={startCreate}>
            <Plus size={13} /> New Split
          </button>
        )}
      </div>

      {/* Today's workout banner */}
      {activeSplit && !isEditing && (
        <div className="today-banner">
          <div className="today-banner-left">
            <span className="today-banner-label">Today · {DAY_FULL[todayIdx]}</span>
            <span className={'today-banner-workout ' + (todayWorkout === 'Rest' || !todayWorkout ? 'rest' : '')}>
              {todayWorkout || 'No workout assigned'}
            </span>
          </div>
          {todayWorkout && todayWorkout !== 'Rest' && (
            <span className="today-banner-badge">Let's go 💪</span>
          )}
          {(todayWorkout === 'Rest' || !todayWorkout) && (
            <span className="today-banner-badge rest">Rest day 😴</span>
          )}
        </div>
      )}

      {/* Split form */}
      {isEditing && (
        <div className="split-form fade-in">
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="label">Split Name</label>
            <input
              className="input-field"
              placeholder="e.g. Push Pull Legs, Upper Lower, Bro Split..."
              value={splitName}
              onChange={e => setSplitName(e.target.value)}
            />
          </div>
          <p className="label">Assign each day</p>
          <div className="day-grid">
            {DAYS.map((day, i) => (
              <div key={day} className="day-row">
                <span className="day-label">{day}</span>
                <input
                  className="input-field day-input"
                  placeholder={day === 'Sun' || day === 'Thu' ? 'Rest' : 'e.g. Push'}
                  value={dayMap[day]}
                  onChange={e => setDayMap(p => ({ ...p, [day]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className="split-form-actions">
            <button className="btn-primary" onClick={handleSave} disabled={!splitName.trim()}>
              <Check size={14} /> Save Split
            </button>
            <button className="btn-ghost" onClick={handleCancel}>Cancel</button>
          </div>
        </div>
      )}

      {/* Existing splits */}
      {!isEditing && splits.length > 0 && (
        <div className="splits-list">
          {splits.map(split => (
            <div key={split.id} className={'split-item ' + (split.id === activeSplitId ? 'active' : '')}>
              <div className="split-item-top">
                <button
                  className="split-item-name"
                  onClick={() => setActiveSplitId(split.id)}
                >
                  {split.id === activeSplitId && <Check size={12} className="split-check" />}
                  {split.name}
                </button>
                <div className="split-item-actions">
                  <button className="btn-ghost split-edit-btn" onClick={() => startEdit(split)}>
                    <Edit2 size={12} />
                  </button>
                  <button className="btn-danger" onClick={() => handleDelete(split.id)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {/* Week at a glance */}
              {split.id === activeSplitId && (
                <div className="split-week-row">
                  {DAYS.map((day, i) => (
                    <div key={day} className={'split-day-chip ' + (i === todayIdx ? 'today' : '') + (split.days[day] === 'Rest' || !split.days[day] ? ' rest' : '')}>
                      <span className="split-day-name">{day}</span>
                      <span className="split-day-workout">{split.days[day] || '—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!isEditing && splits.length === 0 && (
        <p className="split-empty">No splits yet. Create one to plan your training week.</p>
      )}
    </div>
  );
}

// ── SET ROW ───────────────────────────────────────────────────────────────────
function SetRow({ set, index, onChange, onDelete, isPR }) {
  return (
    <div className={'set-row ' + (isPR ? 'pr-set' : '')}>
      <span className="set-num">Set {index + 1}</span>
      <input
        className="input-field set-input"
        type="number" placeholder="lbs" min="0"
        value={set.weight}
        onChange={e => onChange({ ...set, weight: e.target.value })}
      />
      <span className="set-sep">×</span>
      <input
        className="input-field set-input"
        type="number" placeholder="reps" min="0"
        value={set.reps}
        onChange={e => onChange({ ...set, reps: e.target.value })}
      />
      {isPR && <span className="set-pr-badge" title="New PR!">🏆</span>}
      <button className="btn-danger" onClick={onDelete}><Trash2 size={12} /></button>
    </div>
  );
}

// ── EXERCISE EDITOR ───────────────────────────────────────────────────────────
// prWeights: { [exerciseName]: maxWeightEverLifted } — used to highlight new PRs live
function ExerciseEditor({ exercise, index, onChange, onDelete, prWeights }) {
  function addSet() {
    onChange({ ...exercise, sets: [...exercise.sets, { weight: '', reps: '' }] });
  }
  function updateSet(i, newSet) {
    const sets = [...exercise.sets]; sets[i] = newSet;
    onChange({ ...exercise, sets });
  }
  function deleteSet(i) {
    onChange({ ...exercise, sets: exercise.sets.filter((_, idx) => idx !== i) });
  }

  const exName = exercise.name.trim().toLowerCase();
  const prevBest = prWeights[exName] || 0;

  return (
    <div className="exercise-editor card">
      <div className="exercise-header">
        <input
          className="input-field exercise-name-input"
          placeholder="Exercise name (e.g. Bench Press)"
          value={exercise.name}
          onChange={e => onChange({ ...exercise, name: e.target.value })}
        />
        {prevBest > 0 && exercise.name.trim() && (
          <span className="exercise-prev-best">Best: {prevBest}lbs</span>
        )}
        <button className="btn-danger" onClick={onDelete}><Trash2 size={14} /></button>
      </div>
      <div className="sets-list">
        {exercise.sets.map((set, i) => {
          const isPR = exName && prevBest > 0 && Number(set.weight) > prevBest;
          return (
            <SetRow
              key={i} set={set} index={i}
              onChange={s => updateSet(i, s)}
              onDelete={() => deleteSet(i)}
              isPR={isPR}
            />
          );
        })}
      </div>
      <button className="btn-ghost add-set-btn" onClick={addSet}>
        <Plus size={13} /> Add Set
      </button>
    </div>
  );
}

// ── WORKOUT CARD (past session) ───────────────────────────────────────────────
function WorkoutCard({ workout, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="workout-card card fade-in">
      <div className="workout-card-header" onClick={() => setExpanded(p => !p)}>
        <div className="workout-card-left">
          <div className="workout-icon"><Dumbbell size={15} /></div>
          <div>
            <p className="workout-card-name">{workout.name}</p>
            <p className="workout-card-meta">{workout.date} · {workout.exercises?.length || 0} exercises</p>
          </div>
        </div>
        <div className="workout-card-right">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <button className="btn-danger" onClick={e => { e.stopPropagation(); onDelete(workout.id); }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="workout-card-body fade-in">
          {workout.notes && <p className="workout-notes">{workout.notes}</p>}
          {workout.exercises?.map((ex, i) => (
            <div key={i} className="workout-ex">
              <p className="workout-ex-name">{ex.name}</p>
              <div className="workout-sets">
                {ex.sets?.map((set, j) => (
                  <span key={j} className="set-badge">{set.weight}lbs × {set.reps}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export default function WorkoutLog({
  workoutLog, setWorkoutLog,
  bodyweightLog, setBodyweightLog,
  splits, setSplits,
  activeSplitId, setActiveSplitId,
}) {
  const todayStr = today();
  const activeSplit = splits.find(s => s.id === activeSplitId);

  // Log form state
  const [workoutName, setWorkoutName] = useState('');
  const [workoutDate, setWorkoutDate] = useState(todayStr);
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [exercises, setExercises] = useState([{ name: '', sets: [{ weight: '', reps: '' }] }]);

  // Auto-fill workout name from today's split day
  const todayDayKey = DAYS[todayDayIndex()];
  const todaySplitDay = activeSplit?.days?.[todayDayKey];

  // PR toast state — array of { exercise, newWeight, oldWeight }
  const [prToasts, setPrToasts] = useState([]);

  // Bodyweight
  const [bwDate, setBwDate] = useState(todayStr);
  const [bwValue, setBwValue] = useState('');

  // Build a map of each exercise name → max weight ever lifted (from all past workouts)
  // This is used to show "Best: Xlbs" and highlight new PRs live while entering sets
  const prWeights = useMemo(() => {
    const map = {};
    workoutLog.forEach(w => {
      w.exercises?.forEach(ex => {
        const key = ex.name.trim().toLowerCase();
        if (!key) return;
        ex.sets?.forEach(set => {
          const w = Number(set.weight);
          if (w > (map[key] || 0)) map[key] = w;
        });
      });
    });
    return map;
  }, [workoutLog]);

  function addExercise() {
    setExercises(prev => [...prev, { name: '', sets: [{ weight: '', reps: '' }] }]);
  }

  function updateExercise(i, ex) {
    setExercises(prev => { const n = [...prev]; n[i] = ex; return n; });
  }

  function deleteExercise(i) {
    setExercises(prev => prev.filter((_, idx) => idx !== i));
  }

  function handleSaveWorkout(e) {
    e.preventDefault();
    if (!workoutName.trim()) return;

    // Detect PRs: compare each exercise's max weight in this session vs. all-time best
    const newPRs = [];
    exercises.forEach(ex => {
      const key = ex.name.trim().toLowerCase();
      if (!key) return;
      const sessionMax = Math.max(...ex.sets.map(s => Number(s.weight) || 0));
      const prevBest = prWeights[key] || 0;
      if (sessionMax > prevBest && sessionMax > 0) {
        newPRs.push({ exercise: ex.name.trim(), newWeight: sessionMax, oldWeight: prevBest });
      }
    });

    const workout = {
      id: Date.now(),
      date: workoutDate,
      name: workoutName.trim(),
      notes: workoutNotes.trim(),
      exercises: exercises.filter(ex => ex.name.trim()),
    };

    setWorkoutLog(prev => [...prev, workout]);

    if (newPRs.length > 0) {
      setPrToasts(newPRs);
    }

    // Reset form
    setWorkoutName('');
    setWorkoutNotes('');
    setExercises([{ name: '', sets: [{ weight: '', reps: '' }] }]);
  }

  function handleDeleteWorkout(id) {
    setWorkoutLog(prev => prev.filter(w => w.id !== id));
  }

  function handleAddBodyweight(e) {
    e.preventDefault();
    if (!bwValue) return;
    const entry = { id: Date.now(), date: bwDate, weight: Number(bwValue) };
    setBodyweightLog(prev => [...prev, entry].sort((a, b) => a.date.localeCompare(b.date)));
    setBwValue('');
  }

  const bwChartData = useMemo(() =>
    [...bodyweightLog]
      .sort((a,b) => a.date.localeCompare(b.date))
      .map(e => ({ date: e.date.slice(5), weight: e.weight })),
    [bodyweightLog]
  );

  const sortedWorkouts = useMemo(() =>
    [...workoutLog].sort((a, b) => b.date.localeCompare(a.date)),
    [workoutLog]
  );

  return (
    <div className="workout-log fade-in">
      {/* PR Toast — floats in bottom-right */}
      <PRToast prs={prToasts} onDismiss={() => setPrToasts([])} />

      <div className="page-header">
        <h1 className="page-title">Workout Log</h1>
        <p className="page-sub">Follow your split, track your lifts, and celebrate every PR.</p>
      </div>

      {/* AI Split Generator */}
      <SplitGenerator onSplitSaved={split => {
        setSplits(prev => [...prev, split]);
        setActiveSplitId(split.id);
      }} />

      {/* Manual Split builder — full width above the two-column layout */}
      <SplitBuilder
        splits={splits} setSplits={setSplits}
        activeSplitId={activeSplitId} setActiveSplitId={setActiveSplitId}
      />

      <div className="workout-layout">
        {/* Left column: log form + history */}
        <div className="workout-main">
          <div className="card add-workout-card">
            <h2 className="section-title"><Plus size={16} /> Log a Workout</h2>
            <form onSubmit={handleSaveWorkout}>
              <div className="form-row">
                <div className="form-group flex-3">
                  <label className="label">Workout Name *</label>
                  <input
                    className="input-field"
                    placeholder={todaySplitDay && todaySplitDay !== 'Rest' ? 'e.g. ' + todaySplitDay + ' Day' : 'e.g. Push Day, Leg Day...'}
                    value={workoutName}
                    onChange={e => setWorkoutName(e.target.value)}
                    required
                  />
                  {/* Quick-fill from split */}
                  {todaySplitDay && todaySplitDay !== 'Rest' && !workoutName && (
                    <button
                      type="button"
                      className="split-autofill-btn"
                      onClick={() => setWorkoutName(todaySplitDay + ' Day')}
                    >
                      Use today's split: "{todaySplitDay}" →
                    </button>
                  )}
                </div>
                <div className="form-group flex-1">
                  <label className="label">Date</label>
                  <input
                    type="date" className="input-field date-input"
                    value={workoutDate}
                    onChange={e => setWorkoutDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="label">Session Notes</label>
                <input
                  className="input-field"
                  placeholder="How did the session feel? (optional)"
                  value={workoutNotes}
                  onChange={e => setWorkoutNotes(e.target.value)}
                />
              </div>

              <div className="exercises-section">
                <div className="exercises-section-header">
                  <p className="label">Exercises</p>
                  {Object.keys(prWeights).length > 0 && (
                    <span className="pr-hint">🏆 = new personal record</span>
                  )}
                </div>
                {exercises.map((ex, i) => (
                  <ExerciseEditor
                    key={i} exercise={ex} index={i}
                    onChange={updated => updateExercise(i, updated)}
                    onDelete={() => deleteExercise(i)}
                    prWeights={prWeights}
                  />
                ))}
                <button type="button" className="btn-ghost add-exercise-btn" onClick={addExercise}>
                  <Plus size={14} /> Add Exercise
                </button>
              </div>

              <button className="btn-primary save-workout-btn" type="submit">
                <Dumbbell size={15} /> Save Workout
              </button>
            </form>
          </div>

          {/* Past workouts */}
          <div className="past-workouts-section">
            <h2 className="section-title-bare">Past Workouts</h2>
            {sortedWorkouts.length === 0 ? (
              <div className="empty-state card">
                <Dumbbell size={28} color="var(--border)" />
                <p>No workouts logged yet.</p>
              </div>
            ) : (
              sortedWorkouts.map(w => (
                <WorkoutCard key={w.id} workout={w} onDelete={handleDeleteWorkout} />
              ))
            )}
          </div>
        </div>

        {/* Right column: bodyweight */}
        <div className="workout-side">
          <div className="card bw-card">
            <h2 className="section-title"><Scale size={15} /> Bodyweight Tracker</h2>

            {/* Log new weigh-in */}
            <form className="bw-form" onSubmit={handleAddBodyweight}>
              <div className="form-row">
                <div className="form-group flex-2">
                  <label className="label">Date</label>
                  <input type="date" className="input-field date-input" value={bwDate}
                    onChange={e => setBwDate(e.target.value)} />
                </div>
                <div className="form-group flex-1">
                  <label className="label">Weight (lbs)</label>
                  <input type="number" className="input-field" placeholder="lbs" min="0" step="0.1"
                    value={bwValue} onChange={e => setBwValue(e.target.value)} required />
                </div>
              </div>
              <button className="btn-primary bw-save-btn" type="submit"><Plus size={14} /> Log Weigh-In</button>
            </form>

            {/* Stats strip */}
            {bodyweightLog.length >= 2 && (() => {
              const sorted = [...bodyweightLog].sort((a,b) => a.date.localeCompare(b.date));
              const latest = sorted[sorted.length - 1];
              const first  = sorted[0];
              const diff   = (latest.weight - first.weight).toFixed(1);
              const sign   = diff > 0 ? '+' : '';
              return (
                <div className="bw-stats-strip">
                  <div className="bw-stat">
                    <span className="bw-stat-label">Current</span>
                    <span className="bw-stat-val">{latest.weight} lbs</span>
                  </div>
                  <div className="bw-stat">
                    <span className="bw-stat-label">Starting</span>
                    <span className="bw-stat-val">{first.weight} lbs</span>
                  </div>
                  <div className="bw-stat">
                    <span className="bw-stat-label">Total change</span>
                    <span className={'bw-stat-val ' + (diff < 0 ? 'down' : diff > 0 ? 'up' : '')}>
                      {sign}{diff} lbs
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Trend chart — shows all entries */}
            {bwChartData.length > 1 && (
              <div className="bw-chart-wrap">
                <p className="bw-chart-label">Weight Trend</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={bwChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="bwGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: 'var(--text-muted)' }}
                      formatter={(v) => [v + ' lbs', 'Weight']}
                    />
                    <Line type="monotone" dataKey="weight" stroke="#a78bfa" strokeWidth={2.5}
                      dot={{ r: 3, fill: '#a78bfa', strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: '#a78bfa' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Full history list */}
            <div className="bw-history">
              <p className="bw-chart-label">All Weigh-Ins ({bodyweightLog.length})</p>
              {bodyweightLog.length === 0 ? (
                <p className="bw-empty">Log your first weigh-in above.</p>
              ) : (
                <div className="bw-history-list">
                  {[...bodyweightLog].sort((a,b) => b.date.localeCompare(a.date)).map((e, i, arr) => {
                    // Calculate change vs previous entry (chronologically)
                    const prevEntry = arr[i + 1];
                    const change = prevEntry ? (e.weight - prevEntry.weight).toFixed(1) : null;
                    return (
                      <div key={e.id} className="bw-entry">
                        <span className="bw-entry-date">{e.date}</span>
                        <div className="bw-entry-right">
                          <span className="bw-entry-val">{e.weight} lbs</span>
                          {change !== null && (
                            <span className={'bw-change ' + (change < 0 ? 'down' : change > 0 ? 'up' : 'same')}>
                              {change > 0 ? '+' : ''}{change}
                            </span>
                          )}
                          <button className="btn-danger" onClick={() => setBodyweightLog(prev => prev.filter(b => b.id !== e.id))}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* PR board — shows all-time bests */}
          {Object.keys(prWeights).length > 0 && (
            <div className="card pr-board">
              <h2 className="section-title"><Trophy size={15} color="var(--gold)" /> Personal Records</h2>
              <div className="pr-list">
                {Object.entries(prWeights)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([name, weight]) => (
                    <div key={name} className="pr-entry">
                      <span className="pr-exercise">{name}</span>
                      <span className="pr-weight">{weight} lbs</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

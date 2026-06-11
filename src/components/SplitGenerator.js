import React, { useState } from 'react';
import { Sparkles, ChevronRight, ChevronLeft, Loader, Plus, X, Edit2, Check, RotateCcw } from 'lucide-react';
import './SplitGenerator.css';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const QUESTIONS = [
  {
    id: 'goal',
    question: 'What is your primary goal?',
    sub: 'This determines how we structure your split and rep ranges.',
    options: [
      { value: 'muscle_growth', label: '💪 Muscle Growth', desc: 'Build size and definition (Hypertrophy)' },
      { value: 'strength',      label: '🏋️ Strength',      desc: 'Get stronger on key compound lifts' },
      { value: 'both',          label: '⚖️ Strength + Size', desc: 'Balanced powerbuilding approach' },
      { value: 'fat_loss',      label: '🔥 Fat Loss + Tone', desc: 'Lean out while keeping muscle' },
    ],
  },
  {
    id: 'days',
    question: 'How many days per week can you train?',
    sub: 'Be realistic — consistency beats volume every time.',
    options: [
      { value: '3', label: '3 days', desc: 'Full Body 3x' },
      { value: '4', label: '4 days', desc: 'Upper/Lower split' },
      { value: '5', label: '5 days', desc: 'PPL + Upper/Lower' },
      { value: '6', label: '6 days', desc: 'PPL twice or Arnold split' },
    ],
  },
  {
    id: 'split_style',
    question: 'Do you have a preferred split style?',
    sub: 'We\'ll suggest the best one for your goals, or you can pick.',
    options: [
      { value: 'recommended',   label: '⭐ Recommended for me', desc: 'Let the generator decide based on science' },
      { value: 'ppl',           label: '🔄 Push / Pull / Legs', desc: 'Classic PPL — great for hypertrophy' },
      { value: 'arnold',        label: '🏆 Arnold Split',       desc: 'Chest+Back, Shoulders+Arms, Legs' },
      { value: 'upper_lower',   label: '↕️ Upper / Lower',      desc: 'Simple and effective for strength' },
      { value: 'full_body',     label: '🌐 Full Body',          desc: 'Hit everything each session' },
      { value: 'bro_split',     label: '💪 Bro Split',          desc: 'One muscle group per day' },
    ],
  },
  {
    id: 'experience',
    question: 'What is your training experience?',
    sub: 'Beginners and advanced lifters need different approaches.',
    options: [
      { value: 'beginner',     label: '🌱 Beginner',     desc: 'Less than 1 year training' },
      { value: 'intermediate', label: '📈 Intermediate',  desc: '1–3 years of consistent training' },
      { value: 'advanced',     label: '🔱 Advanced',      desc: '3+ years, know your body well' },
    ],
  },
  {
    id: 'priority',
    question: 'Any muscle groups to prioritize?',
    sub: 'We\'ll add extra volume here based on research.',
    options: [
      { value: 'none',      label: '⚖️ Balanced',    desc: 'No specific priority' },
      { value: 'chest',     label: '🫁 Chest',        desc: 'More chest volume' },
      { value: 'back',      label: '🔙 Back',         desc: 'More back thickness and width' },
      { value: 'legs',      label: '🦵 Legs',         desc: 'More quad and hamstring work' },
      { value: 'shoulders', label: '🏋️ Shoulders',   desc: 'Boulder shoulder focus' },
      { value: 'arms',      label: '💪 Arms',         desc: 'More bicep and tricep volume' },
    ],
  },
  {
    id: 'equipment',
    question: 'What equipment do you have access to?',
    sub: 'This affects which exercises we recommend.',
    options: [
      { value: 'full_gym',   label: '🏢 Full Gym',       desc: 'Barbells, machines, cables, dumbbells' },
      { value: 'dumbbells',  label: '🏠 Dumbbells Only',  desc: 'Home gym setup' },
      { value: 'bodyweight', label: '🤸 Bodyweight',      desc: 'No equipment' },
    ],
  },
];

async function generateSplit(answers) {
  const { goal, days, split_style, experience, priority, equipment } = answers;

  const splitInstructions = split_style === 'arnold'
    ? 'Use the Arnold Split: Chest+Back on Day 1, Shoulders+Arms on Day 2, Legs on Day 3, repeat. Rest on remaining days.'
    : split_style === 'ppl'
    ? 'Use Push/Pull/Legs. Push = Chest/Shoulders/Triceps. Pull = Back/Biceps. Legs = Quads/Hamstrings/Glutes/Calves.'
    : split_style === 'upper_lower'
    ? 'Use Upper/Lower split alternating upper and lower body days.'
    : split_style === 'full_body'
    ? 'Use Full Body training hitting all major muscle groups each session.'
    : split_style === 'bro_split'
    ? 'Use a Bro Split with one major muscle group per day.'
    : 'Choose the most scientifically optimal split for this person\'s profile.';

  const prompt = `You are a modern evidence-based hypertrophy coach. Generate a weekly workout split using the latest sports science.

KEY RESEARCH BASIS:
- Schoenfeld et al. 2017: Training to failure with lower volume (2-3 hard sets) produces equal or greater hypertrophy vs higher volume not taken to failure
- Israetel MRV principles: Most advanced lifters grow better with fewer, harder sets taken close to failure
- Krieger meta-analysis: 2-3 sets per exercise taken to near-failure is optimal for advanced lifters
- Frequency matters: hitting each muscle 2x/week is superior to 1x/week for hypertrophy

Profile:
- Goal: ${goal.replace(/_/g, ' ')}
- Training days: ${days} per week
- Split style: ${splitInstructions}
- Experience: ${experience}
- Priority muscle: ${priority}
- Equipment: ${equipment.replace(/_/g, ' ')}

EXERCISE NAMES — keep simple so the user can pick their own variation:
CHEST: "Incline Chest Press" (user picks machine, dumbbell, or barbell), "Chest Fly" (user picks pec dec or cable — do NOT write both, just say Chest Fly), "Flat Chest Press" only if needed for volume
BACK/LATS: "Lat Pulldown", "Chest-Supported Row", "Seated Cable Row" — these 3 cover lats + upper/mid back fully. Do NOT add pull-ups if equipment is full gym.
SHOULDERS: "Overhead Shoulder Press" (user picks dumbbell or machine), "Lateral Raise" (user picks cable or dumbbell)
TRICEPS: On push days use EITHER "Tricep Pushdown" OR "Overhead Tricep Extension" — not both. Pick the one that fits best.
BICEPS: "Preacher Curl" (user picks machine or dumbbell), "Hammer Curl"
QUADS: "Leg Press", "Leg Extension", "Hack Squat"
HAMSTRINGS: "Romanian Deadlift", "Hamstring Curl"
CALVES: "Calf Raise"
ABS — ONLY on leg days, never push/pull/upper days: "Cable Crunch" (2-3 sets x 15-20 reps), "Decline Crunch" (2-3 sets x 15-20 reps). Higher reps are correct for abs.

CRITICAL EXERCISE RULES:
1. Prioritize UPPER CHEST — always lead chest days with Incline Chest Press. The Chest Fly (pec dec/cable) will hit mid/lower chest.
2. Do NOT add rear delt exercises — they are hit sufficiently through rowing movements (Chest-Supported Row, Seated Cable Row)
3. Keep Lateral Raise on ALL upper body and push days — shoulders need direct lateral head work
4. Do NOT mix tricep exercises within the same split — pick Tricep Pushdown OR Overhead Extension for the whole program and stay consistent
5. Upper body days should hit chest, back, shoulders, biceps AND triceps — they are longer sessions

SET AND REP RULES by goal and experience:
MUSCLE GROWTH (hypertrophy focus):
- Beginner: 2 sets x 10-15 reps, 2-3 RIR (reps in reserve — do not go to complete failure)
- Intermediate: 3 sets x 8-12 reps, 1-2 RIR (very close to failure)
- Advanced: 2-3 sets x 6-10 reps taken to or very close to failure. Research shows fewer hard sets outperform more easy sets.
- Abs always: 2-3 sets x 15-20 reps regardless of experience

STRENGTH ONLY:
- 3-5 sets x 3-6 reps, longer rest periods (3-5 min), barbell movements appropriate here

STRENGTH + SIZE:
- 2-3 sets x 6-10 reps — the sweet spot where strength and hypertrophy overlap maximally per research
- Progressive overload every session is the primary driver

FAT LOSS + TONE:
- 3 sets x 12-15 reps, 60-90s rest, maintain muscle while in deficit

5-DAY SPLITS (exactly 5 training days, 2 rest days):
- Recommended: Push Mon, Pull Tue, Legs Wed, Rest Thu, Upper Fri, Lower Sat, Rest Sun

6-DAY SPLITS (exactly 6 training days, 1 rest day):
- PPL x2: Push Mon, Pull Tue, Legs Wed, Push Thu, Pull Fri, Legs Sat, Rest Sun
- Arnold: Chest+Back Mon, Shoulders+Arms Tue, Legs Wed, Chest+Back Thu, Shoulders+Arms Fri, Legs Sat, Rest Sun

3-DAY: Full Body Mon, Rest Tue, Full Body Wed, Rest Thu, Full Body Fri, Rest Sat, Rest Sun
4-DAY: Upper Mon, Lower Tue, Rest Wed, Upper Thu, Lower Fri, Rest Sat, Rest Sun

Assign exactly ${days} training days and ${7 - parseInt(days)} rest days across the week.
Each training day: 4-6 exercises. Abs ONLY on leg days as the last 2 exercises.

Respond ONLY with valid JSON, no other text:
{
  "splitName": "Name of the split",
  "science": "One sentence citing specific research that justifies this split for their profile",
  "weeklyVolume": "X-Y hard sets per muscle group per week",
  "days": {
    "Mon": { "name": "Push Day", "muscles": "Chest, Shoulders, Triceps", "isRest": false, "tip": "", "exercises": [
      { "name": "Incline Chest Press", "sets": "3", "reps": "6-10", "note": "Lead with upper chest — machine, dumbbell, or barbell" },
      { "name": "Overhead Shoulder Press", "sets": "2-3", "reps": "8-12", "note": "Dumbbell or machine" },
      { "name": "Chest Fly", "sets": "2-3", "reps": "12-15", "note": "Pec dec or cable — focus on stretch" },
      { "name": "Lateral Raise", "sets": "2-3", "reps": "15-20", "note": "Cable or dumbbell" },
      { "name": "Tricep Pushdown", "sets": "2-3", "reps": "10-15", "note": "Rope or straight bar" }
    ]},
    "Tue": { "name": "Rest", "muscles": "", "isRest": true, "tip": "Light walk or mobility work", "exercises": [] },
    "Wed": { "name": "...", "muscles": "...", "isRest": false, "tip": "", "exercises": [] },
    "Thu": { "name": "...", "muscles": "...", "isRest": false, "tip": "", "exercises": [] },
    "Fri": { "name": "...", "muscles": "...", "isRest": false, "tip": "", "exercises": [] },
    "Sat": { "name": "...", "muscles": "...", "isRest": false, "tip": "", "exercises": [] },
    "Sun": { "name": "Rest", "muscles": "", "isRest": true, "tip": "Full recovery day", "exercises": [] }
  }
}`;

  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'API error ' + response.status);
  }

  const data = await response.json();
  const text = data.content?.find(b => b.type === 'text')?.text || '';
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// ── EDITABLE RESULT ───────────────────────────────────────────────────────────
function SplitResult({ result, onSave, onRedo }) {
  const [editResult, setEditResult] = useState(JSON.parse(JSON.stringify(result)));
  const [editingDay, setEditingDay] = useState(null);
  const [editingEx, setEditingEx] = useState(null);

  function updateDayName(day, name) {
    setEditResult(prev => ({
      ...prev,
      days: { ...prev.days, [day]: { ...prev.days[day], name } }
    }));
  }

  function toggleRestDay(day) {
    setEditResult(prev => {
      const d = prev.days[day];
      return {
        ...prev,
        days: { ...prev.days, [day]: { ...d, isRest: !d.isRest, exercises: d.isRest ? [] : d.exercises } }
      };
    });
  }

  function swapDays(day1, day2) {
    setEditResult(prev => {
      const days = { ...prev.days };
      const temp = days[day1];
      days[day1] = days[day2];
      days[day2] = temp;
      return { ...prev, days };
    });
  }

  function updateExercise(day, index, field, value) {
    setEditResult(prev => {
      const exercises = [...prev.days[day].exercises];
      exercises[index] = { ...exercises[index], [field]: value };
      return { ...prev, days: { ...prev.days, [day]: { ...prev.days[day], exercises } } };
    });
  }

  function addExercise(day) {
    setEditResult(prev => {
      const exercises = [...prev.days[day].exercises, { name: 'New Exercise', sets: '3', reps: '10-12', note: '' }];
      return { ...prev, days: { ...prev.days, [day]: { ...prev.days[day], exercises } } };
    });
  }

  function removeExercise(day, index) {
    setEditResult(prev => {
      const exercises = prev.days[day].exercises.filter((_, i) => i !== index);
      return { ...prev, days: { ...prev.days, [day]: { ...prev.days[day], exercises } } };
    });
  }

  return (
    <div className="split-result fade-in">
      <div className="split-result-header">
        <div className="split-result-title-row">
          <Sparkles size={18} color="var(--gold)" />
          <h3 className="split-result-title">{editResult.splitName}</h3>
        </div>
        <p className="split-result-science">📚 {editResult.science}</p>
        {editResult.weeklyVolume && (
          <span className="split-volume-badge">{editResult.weeklyVolume}</span>
        )}
        <p className="split-edit-hint">✏️ Tap any day or exercise to edit — make it yours</p>
      </div>

      {/* Day cards */}
      <div className="split-days-list">
        {DAYS.map((day, dayIdx) => {
          const d = editResult.days[day];
          if (!d) return null;
          const isEditing = editingDay === day;

          return (
            <div key={day} className={'split-day-card-full ' + (d.isRest ? 'rest' : '')}>
              {/* Day header */}
              <div className="split-day-header-full">
                <span className="split-day-label">{day}</span>
                {isEditing ? (
                  <input
                    className="input-field split-day-name-input"
                    value={d.name}
                    onChange={e => updateDayName(day, e.target.value)}
                    autoFocus
                  />
                ) : (
                  <span className="split-day-name-full">{d.name}</span>
                )}
                <div className="split-day-actions">
                  <button
                    className={'split-day-action-btn ' + (d.isRest ? 'active' : '')}
                    onClick={() => toggleRestDay(day)}
                    title={d.isRest ? 'Make training day' : 'Make rest day'}
                  >
                    {d.isRest ? '🏋️' : '😴'}
                  </button>
                  <button
                    className="split-day-action-btn"
                    onClick={() => setEditingDay(isEditing ? null : day)}
                    title="Edit day name"
                  >
                    {isEditing ? <Check size={13} /> : <Edit2 size={13} />}
                  </button>
                  {dayIdx > 0 && (
                    <button className="split-day-action-btn" onClick={() => swapDays(day, DAYS[dayIdx-1])} title="Move up">↑</button>
                  )}
                  {dayIdx < 6 && (
                    <button className="split-day-action-btn" onClick={() => swapDays(day, DAYS[dayIdx+1])} title="Move down">↓</button>
                  )}
                </div>
              </div>

              {/* Rest day */}
              {d.isRest && (
                <p className="split-rest-tip">{d.tip || 'Recovery day — light activity or full rest'}</p>
              )}

              {/* Training day exercises */}
              {!d.isRest && (
                <div className="split-exercises-list">
                  {d.muscles && <p className="split-day-muscles-full">{d.muscles}</p>}
                  {d.exercises?.map((ex, exIdx) => {
                    const isEditingEx = editingEx?.day === day && editingEx?.index === exIdx;
                    return (
                      <div key={exIdx} className="split-ex-row">
                        {isEditingEx ? (
                          <div className="split-ex-edit fade-in">
                            <input
                              className="input-field split-ex-name-input"
                              value={ex.name}
                              onChange={e => updateExercise(day, exIdx, 'name', e.target.value)}
                              placeholder="Exercise name"
                            />
                            <div className="split-ex-edit-row">
                              <input
                                className="input-field split-ex-small"
                                value={ex.sets}
                                onChange={e => updateExercise(day, exIdx, 'sets', e.target.value)}
                                placeholder="Sets"
                              />
                              <span className="split-ex-x">×</span>
                              <input
                                className="input-field split-ex-small"
                                value={ex.reps}
                                onChange={e => updateExercise(day, exIdx, 'reps', e.target.value)}
                                placeholder="Reps"
                              />
                              <input
                                className="input-field split-ex-small"
                                value={ex.weight || ''}
                                onChange={e => updateExercise(day, exIdx, 'weight', e.target.value)}
                                placeholder="Weight"
                              />
                            </div>
                            <div className="split-ex-edit-row">
                              <input
                                className="input-field split-ex-note"
                                value={ex.note || ''}
                                onChange={e => updateExercise(day, exIdx, 'note', e.target.value)}
                                placeholder="Note (optional)"
                              />
                              <button className="btn-primary split-ex-done" onClick={() => setEditingEx(null)}>
                                <Check size={13} /> Save
                              </button>
                              <button className="btn-danger" onClick={() => { removeExercise(day, exIdx); setEditingEx(null); }}>
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="split-ex-display"
                            onClick={() => setEditingEx({ day, index: exIdx })}
                          >
                            <div className="split-ex-left">
                              <span className="split-ex-num">{exIdx + 1}</span>
                              <div className="split-ex-info">
                                <span className="split-ex-name">{ex.name}</span>
                                {ex.note && <span className="split-ex-note-display">· {ex.note}</span>}
                              </div>
                            </div>
                            <div className="split-ex-right-info">
                              {ex.weight && <span className="split-ex-weight-badge">{ex.weight}</span>}
                              <span className="split-ex-sets-badge">{ex.sets}×{ex.reps}</span>
                            </div>
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <button className="split-add-ex-btn" onClick={() => addExercise(day)}>
                    <Plus size={13} /> Add Exercise
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="split-result-actions">
        <button className="btn-primary" onClick={() => onSave(editResult)}>
          <Check size={15} /> Save Split
        </button>
        <button className="btn-ghost" onClick={onRedo}>
          <RotateCcw size={14} /> Generate New
        </button>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function SplitGenerator({ onSplitSaved }) {
  const [step, setStep]       = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState('');
  const [open, setOpen]       = useState(false);

  const currentQ  = QUESTIONS[step];
  const isLastQ   = step === QUESTIONS.length - 1;

  async function handleAnswer(value) {
    const newAnswers = { ...answers, [currentQ.id]: value };
    setAnswers(newAnswers);

    if (isLastQ) {
      setLoading(true);
      setError('');
      try {
        const split = await generateSplit(newAnswers);
        setResult(split);
      } catch (err) {
        setError('Could not generate split: ' + err.message + '. Make sure REACT_APP_ANTHROPIC_KEY is set in Vercel Environment Variables.');
      }
      setLoading(false);
    } else {
      setStep(s => s + 1);
    }
  }

  function handleSave(editedResult) {
    const dayMap = {};
    DAYS.forEach(day => {
      const d = editedResult.days[day];
      dayMap[day] = d ? d.name : '';
    });
    onSplitSaved({
      id: Date.now(),
      name: editedResult.splitName,
      days: dayMap,
      aiGenerated: true,
      exercises: editedResult.days,
    });
    setOpen(false);
    setResult(null);
    setAnswers({});
    setStep(0);
  }

  function handleRedo() {
    setResult(null);
    setAnswers({});
    setStep(0);
    setError('');
  }

  if (!open) {
    return (
      <button className="split-generator-trigger" onClick={() => setOpen(true)}>
        <Sparkles size={15} color="var(--gold)" />
        <span>Generate a Split</span>
        <span className="split-gen-badge">Science-Based</span>
        <ChevronRight size={14} />
      </button>
    );
  }

  return (
    <div className="split-generator card fade-in">
      <div className="split-gen-header">
        <div className="split-gen-title-row">
          <Sparkles size={16} color="var(--gold)" />
          <h3 className="split-gen-title">Split Generator</h3>
          <span className="split-gen-badge">Science-Based</span>
        </div>
        <button className="btn-ghost" onClick={() => setOpen(false)}><X size={16} /></button>
      </div>

      {loading && (
        <div className="split-gen-loading fade-in">
          <Loader size={28} className="split-gen-spinner" />
          <p className="split-gen-loading-text">Building your personalized split...</p>
          <p className="split-gen-loading-sub">Analyzing your goals and applying research-based principles</p>
        </div>
      )}

      {error && !loading && (
        <div className="split-gen-error fade-in">
          <p>{error}</p>
          <button className="btn-primary" onClick={handleRedo}>Try Again</button>
        </div>
      )}

      {result && !loading && (
        <SplitResult result={result} onSave={handleSave} onRedo={handleRedo} />
      )}

      {!loading && !result && !error && (
        <div className="split-gen-questions fade-in">
          <div className="split-gen-progress">
            <div className="split-gen-progress-fill" style={{ width: `${(step / QUESTIONS.length) * 100}%` }} />
          </div>
          <p className="split-gen-step">Question {step + 1} of {QUESTIONS.length}</p>
          <h3 className="split-gen-question">{currentQ.question}</h3>
          <p className="split-gen-sub">{currentQ.sub}</p>
          <div className="split-gen-options">
            {currentQ.options.map(opt => (
              <button
                key={opt.value}
                className={'split-gen-option ' + (answers[currentQ.id] === opt.value ? 'selected' : '')}
                onClick={() => handleAnswer(opt.value)}
              >
                <div className="split-gen-option-text">
                  <span className="split-gen-option-label">{opt.label}</span>
                  <span className="split-gen-option-desc">{opt.desc}</span>
                </div>
                <ChevronRight size={14} className="split-gen-option-arrow" />
              </button>
            ))}
          </div>
          {step > 0 && (
            <button className="btn-ghost split-gen-back" onClick={() => setStep(s => s - 1)}>
              <ChevronLeft size={14} /> Back
            </button>
          )}
        </div>
      )}
    </div>
  );
}

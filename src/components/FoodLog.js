import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Trash2, Flame, Target, Search, Droplets, Loader, ChevronDown, ChevronUp, Settings, Barcode, Check } from 'lucide-react';
import BarcodeScanner from './BarcodeScanner';
import PremiumGate from './PremiumGate';
import './FoodLog.css';

function today() {
  return new Date().toISOString().split('T')[0];
}

// ── FOOD SEARCH — USDA + API Ninjas dual search ─────────────────────────────
// USDA: 380,000+ verified packaged/branded foods
// API Ninjas: Natural language — search "96/4 ground beef 8oz", "grilled chicken", etc.
// No IP restrictions, works everywhere, free tier

const USDA_KEY    = process.env.REACT_APP_USDA_KEY    || 'DEMO_KEY';
function parseUSDAFood(food) {
  const nutrients = {};
  (food.foodNutrients || []).forEach(n => {
    const name = n.nutrientName || n.name || '';
    const val  = n.value ?? n.amount ?? 0;
    if (/energy/i.test(name) && /kcal/i.test(n.unitName || '')) nutrients.calories = val;
    if (/protein/i.test(name)) nutrients.protein = val;
    if (/carbohydrate/i.test(name) && !/fiber/i.test(name)) nutrients.carbs = val;
    if (/total lipid|^fat$/i.test(name)) nutrients.fat = val;
    if (/sugar/i.test(name)) nutrients.sugar = val;
    if (/fiber/i.test(name)) nutrients.fiber = val;
    if (/sodium/i.test(name)) nutrients.sodium = val;
  });
  const servingSize = food.servingSize ? `${food.servingSize}${food.servingSizeUnit || 'g'}` : '100g';
  const scale = food.servingSize ? food.servingSize / 100 : 1;
  return {
    name: food.description || 'Unknown Food',
    brand: food.brandOwner || food.brandName || '',
    servingSize,
    source: 'USDA',
    calories: Math.round((nutrients.calories || 0) * scale),
    protein:  Math.round((nutrients.protein  || 0) * scale * 10) / 10,
    carbs:    Math.round((nutrients.carbs    || 0) * scale * 10) / 10,
    fat:      Math.round((nutrients.fat      || 0) * scale * 10) / 10,
    sugar:    nutrients.sugar  != null ? Math.round(nutrients.sugar  * scale * 10) / 10 : null,
    fiber:    nutrients.fiber  != null ? Math.round(nutrients.fiber  * scale * 10) / 10 : null,
    sodium:   nutrients.sodium != null ? Math.round(nutrients.sodium * scale) : null,
  };
}

function parseNinjasFood(item) {
  // API Ninjas returns per-serving data already scaled to the query
  return {
    name: item.name || 'Unknown Food',
    brand: '',
    servingSize: `${Math.round(item.serving_size_g || 100)}g`,
    source: 'NLP',
    calories: Math.round(item.calories || 0),
    protein:  Math.round((item.protein_g  || 0) * 10) / 10,
    carbs:    Math.round((item.carbohydrates_total_g || 0) * 10) / 10,
    fat:      Math.round((item.fat_total_g || 0) * 10) / 10,
    sugar:    item.sugar_g    != null ? Math.round(item.sugar_g    * 10) / 10 : null,
    fiber:    item.fiber_g    != null ? Math.round(item.fiber_g    * 10) / 10 : null,
    sodium:   item.sodium_mg  != null ? Math.round(item.sodium_mg) : null,
  };
}

function FoodSearch({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState('');
  const [sourceCounts, setSourceCounts] = useState({ usda: 0, nlp: 0 });
  const debounceRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setShowResults(false); setError(''); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { searchFood(query); }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowResults(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function searchFood(q) {
    setLoading(true);
    setError('');
    try {
      const [usdaRes, ninjasRes] = await Promise.allSettled([
        // USDA — great for packaged branded foods
        fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_KEY}&query=${encodeURIComponent(q)}&pageSize=6&dataType=Branded,SR%20Legacy,Foundation`)
          .then(r => r.ok ? r.json() : { foods: [] }),
        // API Ninjas via proxy — natural language, handles "96/4 ground beef 8oz", restaurant foods, etc.
        fetch('/api/nutrition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q }),
        }).then(r => r.ok ? r.json() : []),
      ]);

      const usdaFoods = (usdaRes.status === 'fulfilled'
        ? (usdaRes.value.foods || []).filter(f => f.description)
        : []).map(parseUSDAFood);

      const ninjasFoods = (ninjasRes.status === 'fulfilled' && Array.isArray(ninjasRes.value)
        ? ninjasRes.value
        : []).map(parseNinjasFood).filter(f => f.calories > 0);

      setSourceCounts({ usda: usdaFoods.length, nlp: ninjasFoods.length });

      // NLP results first (more specific to query), then USDA — deduplicate by name
      const seen = new Set();
      const combined = [...ninjasFoods, ...usdaFoods].filter(f => {
        const key = f.name.toLowerCase().slice(0, 25);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 12);

      setResults(combined);
      setShowResults(true);
    } catch (err) {
      setError('Search unavailable — enter manually below.');
      setResults([]);
    }
    setLoading(false);
  }

  function handleSelect(food) {
    onSelect(food);
    setQuery('');
    setResults([]);
    setShowResults(false);
  }

  return (
    <div className="food-search-wrap" ref={wrapRef}>
      <label className="label">
        Search Food Database
        <span className="usda-badge">USDA + Smart Search · 400K+ foods</span>
        {sourceCounts.nlp > 0 && <span className="fs-live-badge">✓ Smart search active</span>}
      </label>
      <div className="food-search-input-wrap">
        <Search size={15} className="search-icon" />
        <input
          className="input-field food-search-input"
          placeholder='Try "96/4 ground beef 8oz", "grilled chicken breast", "Big Mac"...'
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
        />
        {loading && <Loader size={15} className="search-loader" />}
      </div>
      {showResults && results.length > 0 && (
        <div className="food-search-results card">
          {results.map((food, i) => (
            <button key={i} className="food-result-item" onClick={() => handleSelect(food)}>
              <div className="food-result-name">
                {food.name}
                <span className={'food-source-badge ' + (food.source === 'NLP' ? 'nlp' : 'usda')}>
                  {food.source === 'NLP' ? 'Smart' : 'USDA'}
                </span>
              </div>
              <div className="food-result-meta">
                {food.brand && <span className="food-result-brand">{food.brand} · </span>}
                <span className="food-result-macros">
                  {food.calories} cals · P: {food.protein}g · C: {food.carbs}g · F: {food.fat}g
                  <span className="food-result-per"> ({food.servingSize})</span>
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
      {showResults && results.length === 0 && !loading && query.length >= 2 && (
        <div className="food-search-results card">
          <p className="food-no-results">No results — try different keywords or log manually below.</p>
        </div>
      )}
      {error && (
        <div className="food-search-results card">
          <p className="food-no-results">{error}</p>
        </div>
      )}
    </div>
  );
}

// ── MACRO GOALS EDITOR ────────────────────────────────────────────────────────
function MacroGoalsEditor({ macroGoals, setMacroGoals, calorieGoal }) {
  const [local, setLocal] = useState({ ...macroGoals });
  const total = local.protein + local.carbs + local.fat;
  const valid = total === 100;
  const proteinG = Math.round((calorieGoal * local.protein / 100) / 4);
  const carbsG   = Math.round((calorieGoal * local.carbs   / 100) / 4);
  const fatG     = Math.round((calorieGoal * local.fat     / 100) / 9);

  return (
    <div className="macro-goals-editor">
      <div className="macro-sliders">
        {[
          { key: 'protein', label: 'Protein', color: '#a78bfa', g: proteinG },
          { key: 'carbs',   label: 'Carbs',   color: 'var(--accent)', g: carbsG },
          { key: 'fat',     label: 'Fat',      color: 'var(--gold)', g: fatG },
        ].map(({ key, label, color, g }) => (
          <div key={key} className="macro-slider-row">
            <div className="macro-slider-header">
              <span className="macro-slider-label" style={{ color }}>{label}</span>
              <span className="macro-slider-pct">{local[key]}%</span>
              <span className="macro-slider-grams">~{g}g / day</span>
            </div>
            <input
              type="range" min="5" max="80"
              value={local[key]}
              onChange={e => setLocal(p => ({ ...p, [key]: Number(e.target.value) }))}
              className="macro-range"
            />
          </div>
        ))}
      </div>
      <div className="macro-bar-preview">
        <div style={{ width: local.protein + '%', background: '#a78bfa' }} />
        <div style={{ width: local.carbs   + '%', background: 'var(--accent)' }} />
        <div style={{ width: local.fat     + '%', background: 'var(--gold)' }} />
      </div>
      <div className={'macro-total ' + (valid ? 'valid' : 'invalid')}>
        Total: {total}% {valid ? '✓ Looks good!' : '— must equal 100% (currently ' + (total > 100 ? '+' : '') + (total - 100) + '%)'}
      </div>
      <button className="btn-primary" onClick={() => valid && setMacroGoals(local)} disabled={!valid}>
        Save Macro Goals
      </button>
    </div>
  );
}

// ── WATER TRACKER ─────────────────────────────────────────────────────────────
function WaterTracker({ waterLog, setWaterLog, waterGoal, setWaterGoal, selectedDate }) {
  const [ozInput, setOzInput] = useState('');
  const [editGoal, setEditGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(waterGoal);

  const dayWater = waterLog.filter(w => w.date === selectedDate);
  const totalOz  = dayWater.reduce((sum, w) => sum + w.oz, 0);
  const progress = Math.min((totalOz / waterGoal) * 100, 100);

  function addWater(oz) {
    if (!oz || oz <= 0) return;
    setWaterLog(prev => [...prev, { id: Date.now(), date: selectedDate, oz: Number(oz) }]);
    setOzInput('');
  }

  function undoLast() {
    if (dayWater.length === 0) return;
    const last = dayWater[dayWater.length - 1];
    setWaterLog(prev => prev.filter(w => w.id !== last.id));
  }

  return (
    <div className="water-tracker card">
      <div className="water-header">
        <div className="water-title-row">
          <Droplets size={16} color="#38bdf8" />
          <h3 className="water-title">Water Intake</h3>
        </div>
        <button className="btn-ghost water-goal-btn" onClick={() => setEditGoal(p => !p)}>
          Goal: {waterGoal}oz <Settings size={12} />
        </button>
      </div>

      {editGoal && (
        <div className="water-goal-edit fade-in">
          <div className="form-row" style={{ alignItems: 'center' }}>
            <input type="number" className="input-field" style={{ maxWidth: 120 }}
              value={goalInput} onChange={e => setGoalInput(Number(e.target.value))} min="8" max="512" />
            <button className="btn-primary" onClick={() => { setWaterGoal(goalInput); setEditGoal(false); }}>Save</button>
            <button className="btn-ghost" onClick={() => setEditGoal(false)}>Cancel</button>
          </div>
          <p className="water-goal-hint">1 gallon = 128oz &nbsp;·&nbsp; 2L ≈ 67oz &nbsp;·&nbsp; 3L ≈ 101oz</p>
        </div>
      )}

      <div className="water-progress-wrap">
        <div className="water-stats-row">
          <span className="water-stat-main">{totalOz}<span className="water-unit">oz</span></span>
          <span className="water-stat-sep">/</span>
          <span className="water-stat-goal">{waterGoal}oz</span>
          <span className="water-stat-extra">
            {(totalOz / 8).toFixed(1)} cups &nbsp;·&nbsp; {(totalOz * 0.0295735).toFixed(2)}L
          </span>
        </div>
        <div className="water-progress-track">
          <div className="water-progress-fill" style={{ width: progress + '%' }} />
        </div>
        {progress >= 100 && <p className="water-complete">🎉 Daily goal reached!</p>}
      </div>

      <div className="water-quick-row">
        {[8, 12, 16, 20, 24, 32].map(oz => (
          <button key={oz} className="water-quick-btn" onClick={() => addWater(oz)}>+{oz}oz</button>
        ))}
      </div>
      <div className="water-custom-row">
        <input type="number" className="input-field water-custom-input" placeholder="Custom oz"
          value={ozInput} min="1" onChange={e => setOzInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addWater(ozInput)} />
        <button className="btn-primary" onClick={() => addWater(ozInput)}>Add</button>
        {dayWater.length > 0 && <button className="btn-ghost" onClick={undoLast}>Undo last</button>}
      </div>

      <div className="water-drops">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className={'water-drop ' + ((i / 8) * 100 < progress ? 'filled' : '')}>💧</span>
        ))}
      </div>
    </div>
  );
}

// ── MACRO PROGRESS BARS ───────────────────────────────────────────────────────
function MacroBars({ dayEntries, calorieGoal, macroGoals }) {
  const totals = dayEntries.reduce((acc, e) => ({
    protein: acc.protein + (Number(e.protein) || 0),
    carbs:   acc.carbs   + (Number(e.carbs)   || 0),
    fat:     acc.fat     + (Number(e.fat)      || 0),
    sugar:   acc.sugar   + (Number(e.sugar)    || 0),
    fiber:   acc.fiber   + (Number(e.fiber)    || 0),
    sodium:  acc.sodium  + (Number(e.sodium)   || 0),
  }), { protein: 0, carbs: 0, fat: 0, sugar: 0, fiber: 0, sodium: 0 });

  const proteinGoal = Math.round((calorieGoal * macroGoals.protein / 100) / 4);
  const carbsGoal   = Math.round((calorieGoal * macroGoals.carbs   / 100) / 4);
  const fatGoal     = Math.round((calorieGoal * macroGoals.fat     / 100) / 9);

  const macros = [
    { label: 'Protein', val: totals.protein, goal: proteinGoal, color: '#a78bfa' },
    { label: 'Carbs',   val: totals.carbs,   goal: carbsGoal,   color: 'var(--accent)' },
    { label: 'Fat',     val: totals.fat,     goal: fatGoal,     color: 'var(--gold)' },
  ];

  return (
    <div className="macro-bars-card card">
      <h3 className="macro-bars-title">Macros Today</h3>
      <div className="macro-bars-list">
        {macros.map(({ label, val, goal, color }) => {
          const pct = goal > 0 ? Math.min((val / goal) * 100, 100) : 0;
          const over = val > goal && goal > 0;
          return (
            <div key={label} className="macro-bar-row">
              <div className="macro-bar-info">
                <span className="macro-bar-label" style={{ color }}>{label}</span>
                <span className="macro-bar-val">
                  <strong>{Math.round(val)}g</strong>
                  <span className="macro-bar-goal"> / {goal}g</span>
                  {over && <span className="macro-bar-over"> over</span>}
                </span>
              </div>
              <div className="macro-bar-track">
                <div className="macro-bar-fill"
                  style={{ width: pct + '%', background: over ? 'var(--red)' : color }} />
              </div>
            </div>
          );
        })}
      </div>

      <details className="micros-dropdown macro-micros-dropdown">
        <summary className="micros-summary">Micronutrients (sugar, fiber, sodium)</summary>
        <div className="micro-grid">
          <div className="micro-item">
            <span className="micro-label">Sugar</span>
            <span className="micro-val">{Math.round(totals.sugar)}g</span>
            <span className="micro-note">aim &lt; 50g/day</span>
          </div>
          <div className="micro-item">
            <span className="micro-label">Fiber</span>
            <span className="micro-val">{Math.round(totals.fiber)}g</span>
            <span className="micro-note">aim &gt; 25g/day</span>
          </div>
          <div className="micro-item">
            <span className="micro-label">Sodium</span>
            <span className="micro-val">{Math.round(totals.sodium)}mg</span>
            <span className="micro-note">aim &lt; 2300mg/day</span>
          </div>
        </div>
      </details>
    </div>
  );
}

// ── FOOD ENTRY ROW ────────────────────────────────────────────────────────────
// Unit conversion helpers
const OZ_TO_G = 28.3495;
const G_TO_OZ = 1 / OZ_TO_G;

function parseServingInfo(servingSize) {
  // Parse serving size string like "100g", "8oz", "1 cup", "227g"
  if (!servingSize || servingSize === '1') return { amount: 100, unit: 'g' };
  const lower = servingSize.toLowerCase().trim();
  const ozMatch = lower.match(/^([\d.]+)\s*oz/);
  const gMatch  = lower.match(/^([\d.]+)\s*g/);
  if (ozMatch) return { amount: parseFloat(ozMatch[1]), unit: 'oz' };
  if (gMatch)  return { amount: parseFloat(gMatch[1]),  unit: 'g' };
  // Fallback — try to extract any leading number
  const numMatch = lower.match(/^([\d.]+)/);
  return { amount: numMatch ? parseFloat(numMatch[1]) : 100, unit: 'g' };
}

function scaleNutrients(entry, multiplier) {
  // Scale all nutrients by multiplier relative to the original 1 serving
  const s = n => n != null ? Math.round(Number(n) * multiplier * 10) / 10 : null;
  return {
    calories: Math.round(Number(entry.calories) * multiplier),
    protein:  s(entry.protein),
    carbs:    s(entry.carbs),
    fat:      s(entry.fat),
    sugar:    s(entry.sugar),
    fiber:    s(entry.fiber),
    sodium:   entry.sodium != null ? Math.round(Number(entry.sodium) * multiplier) : null,
  };
}

function FoodEntry({ entry, onDelete, onUpdate }) {
  const [expanded, setExpanded] = useState(false);

  const parsed = parseServingInfo(entry.servingSize);

  // Serving state
  const FRACTIONS = [
    { label: '1/4', value: 0.25 },
    { label: '1/3', value: 0.333 },
    { label: '1/2', value: 0.5 },
    { label: '2/3', value: 0.667 },
    { label: '3/4', value: 0.75 },
    { label: '1',   value: 1 },
    { label: '1.5', value: 1.5 },
    { label: '2',   value: 2 },
    { label: '3',   value: 3 },
  ];

  const [servingFraction, setServingFraction] = useState(1); // multiplier e.g. 0.5 = half
  const [displayUnit, setDisplayUnit] = useState(parsed.unit); // 'g' or 'oz' for display

  // Compute multiplier from fraction
  const multiplier = servingFraction;
  const scaled = scaleNutrients(entry, multiplier);

  // Conversion display
  const baseInG  = parsed.unit === 'oz' ? parsed.amount * OZ_TO_G : parsed.amount;
  const scaledG  = Math.round(baseInG * multiplier * 10) / 10;
  const scaledOz = Math.round(baseInG * multiplier * G_TO_OZ * 10) / 10;
  const convertedDisplay = displayUnit === 'oz'
    ? `${scaledOz}oz`
    : `${scaledG}g`;

  const totalMacroCals = (Number(entry.protein)||0)*4 + (Number(entry.carbs)||0)*4 + (Number(entry.fat)||0)*9;
  const scaledMacroCals = (scaled.protein||0)*4 + (scaled.carbs||0)*4 + (scaled.fat||0)*9;
  const pPct = scaledMacroCals > 0 ? Math.round(((scaled.protein||0)*4 / scaledMacroCals)*100) : 0;
  const cPct = scaledMacroCals > 0 ? Math.round(((scaled.carbs||0)*4   / scaledMacroCals)*100) : 0;
  const fPct = scaledMacroCals > 0 ? Math.round(((scaled.fat||0)*9     / scaledMacroCals)*100) : 0;

  const isAdjusted = Math.abs(multiplier - 1) > 0.01;
  const displayCals = scaled.calories;

  function handleSave() {
    if (onUpdate) {
      onUpdate(entry.id, { ...entry, ...scaled, servingSize: convertedDisplay });
    }
    setExpanded(false);
  }

  return (
    <div className="food-entry fade-in">
      {/* Collapsed row */}
      <div className="food-entry-main" onClick={() => setExpanded(p => !p)} style={{ cursor: 'pointer' }}>
        <div className="food-entry-info">
          <span className="food-entry-name">{entry.name}</span>
          {entry.servingSize && entry.servingSize !== '1' && (
            <span className="food-entry-serving">
              {isAdjusted ? `${servingFraction}× (${convertedDisplay})` : entry.servingSize}
            </span>
          )}
        </div>
        <div className="food-entry-right-col">
          <span className="food-macro-chip cal">{displayCals} cals</span>
          <span className="food-expand-icon">
            {expanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
          </span>
        </div>
        <button className="btn-danger" onClick={e => { e.stopPropagation(); onDelete(entry.id); }}>
          <Trash2 size={13} />
        </button>
      </div>

      {expanded && (
        <div className="food-entry-detail fade-in">

          {/* Serving adjuster */}
          <div className="serving-adjuster-section">
            <div className="serving-row-label">Servings</div>
            {/* Fraction buttons */}
            <div className="serving-fraction-row">
              {FRACTIONS.map(f => (
                <button
                  key={f.label}
                  className={'serving-frac-btn ' + (Math.abs(servingFraction - f.value) < 0.01 ? 'active' : '')}
                  onClick={() => setServingFraction(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {/* Custom input */}
            <div className="serving-custom-row">
              <span className="serving-adjuster-label">Custom</span>
              <input
                className="input-field serving-qty-input"
                type="number"
                min="0.1"
                step="0.1"
                value={servingFraction}
                onChange={e => setServingFraction(parseFloat(e.target.value) || 1)}
              />
              <span className="serving-adjuster-label">serving(s)</span>
            </div>
            {/* Conversion display */}
            <div className="serving-conversion-row">
              <span className="serving-conversion-label">
                {servingFraction === 1 ? '1 serving' : `${servingFraction} serving${servingFraction !== 1 ? 's' : ''}`}
                {entry.servingSize && entry.servingSize !== '1' ? ` (${entry.servingSize} each)` : ''}
                {' = '}
                <strong>{convertedDisplay}</strong>
              </span>
              <div className="serving-unit-toggle">
                <button
                  className={'serving-unit-btn ' + (displayUnit === 'g' ? 'active' : '')}
                  onClick={() => setDisplayUnit('g')}
                >g</button>
                <button
                  className={'serving-unit-btn ' + (displayUnit === 'oz' ? 'active' : '')}
                  onClick={() => setDisplayUnit('oz')}
                >oz</button>
              </div>
            </div>
          </div>

          {/* Macro breakdown */}
          {totalMacroCals > 0 && (
            <div className="food-detail-macros">
              <div className="food-detail-macro-row">
                <span className="food-detail-macro-item protein">
                  <span className="food-detail-macro-label">Protein</span>
                  <span className="food-detail-macro-val">{scaled.protein}g</span>
                  <span className="food-detail-macro-pct">{pPct}%</span>
                </span>
                <span className="food-detail-macro-item carbs">
                  <span className="food-detail-macro-label">Carbs</span>
                  <span className="food-detail-macro-val">{scaled.carbs}g</span>
                  <span className="food-detail-macro-pct">{cPct}%</span>
                </span>
                <span className="food-detail-macro-item fat">
                  <span className="food-detail-macro-label">Fat</span>
                  <span className="food-detail-macro-val">{scaled.fat}g</span>
                  <span className="food-detail-macro-pct">{fPct}%</span>
                </span>
              </div>
              <div className="food-detail-split-bar">
                {pPct > 0 && <div className="split-bar-protein" style={{width: pPct + '%'}} />}
                {cPct > 0 && <div className="split-bar-carbs"   style={{width: cPct + '%'}} />}
                {fPct > 0 && <div className="split-bar-fat"     style={{width: fPct + '%'}} />}
              </div>
            </div>
          )}

          {/* Micros */}
          {(entry.sugar != null || entry.fiber != null || entry.sodium != null) && (
            <div className="food-detail-micros">
              {scaled.sugar  != null && <span className="food-detail-micro">🍬 Sugar <strong>{scaled.sugar}g</strong></span>}
              {scaled.fiber  != null && <span className="food-detail-micro">🌾 Fiber <strong>{scaled.fiber}g</strong></span>}
              {scaled.sodium != null && <span className="food-detail-micro">🧂 Sodium <strong>{scaled.sodium}mg</strong></span>}
            </div>
          )}

          {/* Save */}
          {isAdjusted && (
            <button className="btn-primary serving-save-btn" onClick={handleSave}>
              <Check size={13} /> Save — {servingFraction === 1 ? '' : `${servingFraction}× `}{convertedDisplay} · {scaled.calories} cals
            </button>
          )}
        </div>
      )}
    </div>
  );
}


// ── RECENT FOODS ─────────────────────────────────────────────────────────────
// Reads from localStorage and shows one-click re-log buttons for past foods.
// This makes logging repeated meals (like your morning oats) super fast.
function RecentFoods({ onSelect }) {
  const [recents, setRecents] = React.useState([]);

  React.useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('wf_recent_foods') || '[]');
      setRecents(stored);
    } catch { setRecents([]); }
  }, []);

  if (recents.length === 0) return null;

  return (
    <details className="recent-foods-dropdown">
      <summary className="recent-foods-summary">
        <span>Recent Foods</span>
        <span className="recent-foods-count">{recents.length}</span>
      </summary>
      <div className="recent-foods-list">
        {recents.map((food, i) => (
          <button
            key={i}
            className="recent-food-row"
            onClick={() => onSelect(food)}
          >
            <div className="recent-food-row-info">
              <span className="recent-food-name">{food.name}</span>
              <span className="recent-food-macros">
                P:{food.protein}g · C:{food.carbs}g · F:{food.fat}g
              </span>
            </div>
            <span className="recent-food-cal">{food.calories} cals</span>
          </button>
        ))}
      </div>
    </details>
  );
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export default function FoodLog({
  foodLog, setFoodLog, calorieGoal, setCalorieGoal,
  waterLog, setWaterLog, waterGoal, setWaterGoal,
  macroGoals, setMacroGoals,
  isPremium, setIsPremium,
}) {
  const todayStr = today();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [goalInput, setGoalInput] = useState(calorieGoal);
  const [showMacroEditor, setShowMacroEditor] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showPremiumGate, setShowPremiumGate] = useState(false);
  const [form, setForm] = useState({
    name: '', calories: '', protein: '', carbs: '', fat: '',
    sugar: '', fiber: '', sodium: '', notes: '', servingSize: '', meal: 'Breakfast',
  });
  const [activeMeal, setActiveMeal] = useState('Breakfast'); // which meal tab is selected

  function handleFoodSelect(food) {
    setForm({
      name: food.name, calories: food.calories, protein: food.protein,
      carbs: food.carbs, fat: food.fat, sugar: food.sugar || '',
      fiber: food.fiber || '', sodium: food.sodium || '', notes: '', servingSize: food.servingSize || '100g',
      meal: activeMeal,
    });
  }

  // Called from BarcodeScanner after user confirms the product
  function handleBarcodeFound(food) {
    handleFoodSelect(food);
    setShowBarcodeScanner(false);
  }

  function handleAdd(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.calories) return;
    const entry = {
      id: Date.now(), date: selectedDate,
      meal: form.meal || activeMeal,
      name: form.name.trim(), calories: Number(form.calories),
      protein: form.protein ? Number(form.protein) : 0,
      carbs:   form.carbs   ? Number(form.carbs)   : 0,
      fat:     form.fat     ? Number(form.fat)     : 0,
      sugar:   form.sugar   ? Number(form.sugar)   : null,
      fiber:   form.fiber   ? Number(form.fiber)   : null,
      sodium:  form.sodium  ? Number(form.sodium)  : null,
      notes: form.notes.trim(), servingSize: form.servingSize,
    };
    setFoodLog(prev => [...prev, entry]);

    // Save to recent foods (no date/id — just the template)
    const recentEntry = {
      name: entry.name, calories: entry.calories,
      protein: entry.protein, carbs: entry.carbs, fat: entry.fat,
      sugar: entry.sugar, fiber: entry.fiber, sodium: entry.sodium,
      servingSize: entry.servingSize,
      lastUsed: Date.now(),
    };
    const stored = JSON.parse(localStorage.getItem('wf_recent_foods') || '[]');
    // Remove duplicate name if already exists, then prepend new entry, keep top 20
    const deduped = stored.filter(r => r.name.toLowerCase() !== recentEntry.name.toLowerCase());
    localStorage.setItem('wf_recent_foods', JSON.stringify([recentEntry, ...deduped].slice(0, 20)));

    setForm({ name:'', calories:'', protein:'', carbs:'', fat:'', sugar:'', fiber:'', sodium:'', notes:'', servingSize:'', meal: activeMeal });
  }

  const dayEntries = useMemo(() => foodLog.filter(e => e.date === selectedDate), [foodLog, selectedDate]);
  const totalCalories = dayEntries.reduce((sum, e) => sum + Number(e.calories || 0), 0);
  const progress = Math.min((totalCalories / calorieGoal) * 100, 100);
  const over = totalCalories > calorieGoal;

  return (
    <div className="food-log fade-in">
      <div className="page-header">
        <h1 className="page-title">Food Log</h1>
        <p className="page-sub">Search millions of foods or log manually. Track calories, macros, and water.</p>
      </div>

      <div className="food-controls">
        <div className="date-picker-wrap">
          <label className="label">Date</label>
          <input type="date" className="input-field date-input" value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)} />
        </div>
        <div className="goal-display" onClick={() => setShowGoalEdit(p => !p)}>
          <Target size={14} />
          <span>Calorie goal: <strong>{calorieGoal.toLocaleString()} cals</strong></span>
          <span className="goal-edit-hint">edit</span>
        </div>
        <div className="goal-display" onClick={() => setShowMacroEditor(p => !p)}>
          <Settings size={14} />
          <span>Macros: <strong>{macroGoals.protein}% P / {macroGoals.carbs}% C / {macroGoals.fat}% F</strong></span>
          <span className="goal-edit-hint">edit</span>
        </div>
      </div>

      {showGoalEdit && (
        <div className="card goal-edit-card fade-in">
          <label className="label">Daily Calorie Goal</label>
          <div className="goal-edit-row">
            <input type="number" className="input-field" value={goalInput} style={{ maxWidth: 160 }}
              onChange={e => setGoalInput(e.target.value)} min="500" max="10000" />
            <button className="btn-primary" onClick={() => { setCalorieGoal(Number(goalInput)); setShowGoalEdit(false); }}>Save</button>
            <button className="btn-ghost" onClick={() => setShowGoalEdit(false)}>Cancel</button>
          </div>
        </div>
      )}

      {showMacroEditor && (
        <div className="card macro-editor-card fade-in">
          <h3 className="macro-editor-title">Macro Split Goals</h3>
          <p className="macro-editor-sub">Set the % of your daily calories that come from each macro. Must total 100%.</p>
          <MacroGoalsEditor
            macroGoals={macroGoals}
            setMacroGoals={g => { setMacroGoals(g); setShowMacroEditor(false); }}
            calorieGoal={calorieGoal}
          />
        </div>
      )}

      <div className="card calorie-progress-card">
        <div className="calorie-progress-header">
          <span className="calorie-progress-label"><Flame size={14} /> {totalCalories.toLocaleString()} / {calorieGoal.toLocaleString()} cals</span>
          <span className={'calorie-progress-status ' + (over ? 'over' : '')}>
            {over ? (totalCalories - calorieGoal).toLocaleString() + ' over' : (calorieGoal - totalCalories).toLocaleString() + ' left'}
          </span>
        </div>
        <div className="progress-bar-track">
          <div className={'progress-bar-fill ' + (over ? 'over' : '')} style={{ width: progress + '%' }} />
        </div>
      </div>

      <div className="foodlog-two-col">
        {/* LEFT: main food logging */}
        <div className="foodlog-left-col">
          <MacroBars dayEntries={dayEntries} calorieGoal={calorieGoal} macroGoals={macroGoals} />

          <div className="card add-food-card">
        <div className="add-food-header">
          <h2 className="section-title" style={{ marginBottom: 0 }}><Search size={15} /> Add Food</h2>
          <button
            className="btn-barcode"
            onClick={() => isPremium ? setShowBarcodeScanner(true) : setShowPremiumGate(true)}
            title={isPremium ? 'Scan a barcode' : 'Premium feature'}
          >
            <Barcode size={15} /> Scan Barcode {!isPremium && <span className="premium-lock-icon">🔒</span>}
          </button>
        </div>

        {/* Premium gate modal */}
        {showPremiumGate && (
          <PremiumGate
            featureName="Barcode Scanner"
            onUnlock={() => { setIsPremium(true); setShowPremiumGate(false); setShowBarcodeScanner(true); }}
            onClose={() => setShowPremiumGate(false)}
          />
        )}

        {/* Barcode scanner modal — only shown after premium check */}
        {showBarcodeScanner && isPremium && (
          <BarcodeScanner
            onFoodFound={handleBarcodeFound}
            onClose={() => setShowBarcodeScanner(false)}
          />
        )}

        {/* Recent foods — loaded from localStorage */}
        <RecentFoods onSelect={handleFoodSelect} />
        <FoodSearch onSelect={handleFoodSelect} />
        <div className="manual-divider"><span>or enter manually below</span></div>

        {/* Meal selector — which meal are you logging for? */}
        <div className="meal-tabs">
          {['Breakfast','Lunch','Dinner','Snacks'].map(meal => (
            <button
              key={meal}
              type="button"
              className={'meal-tab ' + (activeMeal === meal ? 'active' : '')}
              onClick={() => { setActiveMeal(meal); setForm(p => ({ ...p, meal })); }}
            >
              {{'Breakfast':'🌅','Lunch':'☀️','Dinner':'🌙','Snacks':'⭐'}[meal]} {meal}
            </button>
          ))}
        </div>

        <form className="food-form" onSubmit={handleAdd}>
          <div className="form-row">
            <div className="form-group flex-3">
              <label className="label">Food Name *</label>
              <input className="input-field" placeholder="e.g. Chicken Breast" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="form-group flex-1">
              <label className="label">Serving Size</label>
              <input className="input-field" placeholder="e.g. 100g" value={form.servingSize}
                onChange={e => setForm(p => ({ ...p, servingSize: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group flex-1">
              <label className="label">Calories *</label>
              <input className="input-field" type="number" placeholder="kcal" min="0" value={form.calories}
                onChange={e => setForm(p => ({ ...p, calories: e.target.value }))} required />
            </div>
            <div className="form-group flex-1">
              <label className="label" style={{color:'#a78bfa'}}>Protein (g)</label>
              <input className="input-field" type="number" placeholder="0" min="0" step="0.1" value={form.protein}
                onChange={e => setForm(p => ({ ...p, protein: e.target.value }))} />
            </div>
            <div className="form-group flex-1">
              <label className="label" style={{color:'var(--accent)'}}>Carbs (g)</label>
              <input className="input-field" type="number" placeholder="0" min="0" step="0.1" value={form.carbs}
                onChange={e => setForm(p => ({ ...p, carbs: e.target.value }))} />
            </div>
            <div className="form-group flex-1">
              <label className="label" style={{color:'var(--gold)'}}>Fat (g)</label>
              <input className="input-field" type="number" placeholder="0" min="0" step="0.1" value={form.fat}
                onChange={e => setForm(p => ({ ...p, fat: e.target.value }))} />
            </div>
          </div>
          {/* Collapsible micros */}
          <details className="micros-dropdown">
            <summary className="micros-summary">More details (sugar, fiber, sodium)</summary>
            <div className="form-row micros-row">
              <div className="form-group flex-1">
                <label className="label">Sugar (g)</label>
                <input className="input-field" type="number" placeholder="0" min="0" step="0.1" value={form.sugar}
                  onChange={e => setForm(p => ({ ...p, sugar: e.target.value }))} />
              </div>
              <div className="form-group flex-1">
                <label className="label">Fiber (g)</label>
                <input className="input-field" type="number" placeholder="0" min="0" step="0.1" value={form.fiber}
                  onChange={e => setForm(p => ({ ...p, fiber: e.target.value }))} />
              </div>
              <div className="form-group flex-1">
                <label className="label">Sodium (mg)</label>
                <input className="input-field" type="number" placeholder="0" min="0" value={form.sodium}
                  onChange={e => setForm(p => ({ ...p, sodium: e.target.value }))} />
              </div>
            </div>
          </details>
          <button className="btn-primary add-food-btn" type="submit">
            <Plus size={15} /> Log Food
          </button>
        </form>
      </div>

      <div className="card food-entries-card">
        <div className="entries-header">
          <h2 className="section-title" style={{marginBottom:0}}>
            {selectedDate === todayStr ? "Today's Log" : 'Log for ' + selectedDate}
            <span className="entry-count">{dayEntries.length} items · {totalCalories.toLocaleString()} cals</span>
          </h2>
        </div>

        {dayEntries.length === 0 ? (
          <div className="empty-state">
            <Flame size={32} color="var(--border)" />
            <p>No food logged yet — search above or fill in manually.</p>
          </div>
        ) : (
          <div className="meal-groups">
            {['Breakfast','Lunch','Dinner','Snacks'].map(meal => {
              const mealEntries = dayEntries.filter(e => (e.meal || 'Breakfast') === meal);
              if (mealEntries.length === 0) return null;
              const mealCals = mealEntries.reduce((s,e) => s + Number(e.calories||0), 0);
              const mealProtein = mealEntries.reduce((s,e) => s + Number(e.protein||0), 0);
              const mealCarbs = mealEntries.reduce((s,e) => s + Number(e.carbs||0), 0);
              const mealFat = mealEntries.reduce((s,e) => s + Number(e.fat||0), 0);
              const mealEmoji = {Breakfast:'🌅',Lunch:'☀️',Dinner:'🌙',Snacks:'⭐'}[meal];
              const mealColor = 'var(--border)';
              return (
                <div key={meal} className="meal-block">
                  {/* Meal header */}
                  <div className="meal-block-header" style={{ borderLeftColor: mealColor }}>
                    <div className="meal-block-title-row">
                      <span className="meal-block-emoji">{mealEmoji}</span>
                      <span className="meal-block-name">{meal}</span>
                    </div>
                    <div className="meal-block-totals">
                      <span className="meal-block-cal">{mealCals.toLocaleString()} cals</span>
                      {mealProtein > 0 && <span className="meal-block-macro meal-protein">P {Math.round(mealProtein)}g</span>}
                      {mealCarbs > 0 && <span className="meal-block-macro meal-carbs">C {Math.round(mealCarbs)}g</span>}
                      {mealFat > 0 && <span className="meal-block-macro meal-fat">F {Math.round(mealFat)}g</span>}
                    </div>
                  </div>
                  {/* Food items */}
                  <div className="meal-block-items">
                    {mealEntries.map(entry => (
                      <FoodEntry key={entry.id} entry={entry} onDelete={id => setFoodLog(prev => prev.filter(e => e.id !== id))} onUpdate={(id, updated) => setFoodLog(prev => prev.map(e => e.id === id ? updated : e))} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>{/* end foodlog-left-col */}

      <div className="foodlog-right-col">
        <WaterTracker waterLog={waterLog} setWaterLog={setWaterLog}
          waterGoal={waterGoal} setWaterGoal={setWaterGoal} selectedDate={selectedDate} />
      </div>
    </div>{/* end foodlog-two-col */}
    </div>
  );
}

import React, { useState, useMemo, useRef } from 'react';
import { Plus, Trash2, Wallet, ShoppingCart, Camera, Loader, CheckCircle, XCircle, Upload, X } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import PremiumGate from './PremiumGate';
import './Expenses.css';

function today() {
  return new Date().toISOString().split('T')[0];
}

function formatMoney(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const CATEGORIES = [
  'Groceries', 'Gym / Membership', 'Supplements', 'Meal Prep',
  'Protein / Powder', 'Equipment', 'Doctor / Healthcare', 'Other',
];

const CATEGORY_COLORS = {
  'Groceries': 'var(--accent)',
  'Gym / Membership': '#a78bfa',
  'Supplements': 'var(--gold)',
  'Meal Prep': '#60d394',
  'Protein / Powder': '#ff8c42',
  'Equipment': '#38bdf8',
  'Doctor / Healthcare': '#f87171',
  'Other': 'var(--text-muted)',
};

// ── RECEIPT SCANNER ───────────────────────────────────────────────────────────
function ReceiptScanner({ onItemsConfirmed, defaultDate }) {
  const [step, setStep] = useState('idle');
  const [imageData, setImageData] = useState(null);
  const [imageType, setImageType] = useState('image/jpeg');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [scannedItems, setScannedItems] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [storeName, setStoreName] = useState('');
  const [receiptDate, setReceiptDate] = useState(defaultDate);
  const fileRef = useRef(null);

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImageType(file.type || 'image/jpeg');
    // Create a preview URL for display
    setPreviewUrl(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = ev => {
      setImageData(ev.target.result.split(',')[1]);
      setStep('preview');
    };
    reader.readAsDataURL(file);
  }

  async function handleScan() {
    if (!imageData) return;
    setStep('scanning');
    setErrorMsg('');

    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: imageType, data: imageData },
              },
              {
                type: 'text',
                text: `You are a receipt parser for a health and fitness expense tracker.

Look at this receipt and extract every line item with a price. Skip tax, subtotal, total, and tip lines.

For each item assign one category:
- Groceries (food, produce, meat, dairy, drinks, snacks)
- Supplements (vitamins, protein powder, pre-workout, creatine)
- Meal Prep (prepared meals, meal kits)
- Protein / Powder (protein bars, shakes, protein-specific products)
- Equipment (gym gear, fitness accessories)
- Gym / Membership (gym fees, fitness classes)
- Doctor / Healthcare (medical, pharmacy)
- Other (anything else)

Also extract store name and date if visible on the receipt.

Respond ONLY with this exact JSON format, no other text, no markdown:
{"store":"Store Name","date":"YYYY-MM-DD or null","items":[{"name":"Item name","price":4.99,"category":"Groceries"}]}`
              }
            ]
          }]
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `API error ${response.status}`);
      }

      const data = await response.json();
      const text = data.content?.find(b => b.type === 'text')?.text || '';

      let parsed;
      try {
        const clean = text.replace(/```json|```/g, '').trim();
        parsed = JSON.parse(clean);
      } catch {
        throw new Error('Could not read the receipt. Try a clearer photo with better lighting.');
      }

      if (!parsed.items || parsed.items.length === 0) {
        throw new Error('No items found. Make sure the receipt is flat, well-lit, and fully in frame.');
      }

      setScannedItems(parsed.items.map((item, i) => ({
        ...item, id: i, selected: true, price: Number(item.price) || 0,
      })));
      setStoreName(parsed.store || '');
      if (parsed.date && parsed.date !== 'null') setReceiptDate(parsed.date);
      setStep('review');

    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
      setStep('error');
    }
  }

  function toggleItem(id) {
    setScannedItems(prev => prev.map(item => item.id === id ? { ...item, selected: !item.selected } : item));
  }

  function updateItem(id, field, value) {
    setScannedItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  }

  function handleConfirm() {
    const selected = scannedItems.filter(i => i.selected);
    if (selected.length === 0) return;
    onItemsConfirmed(selected.map(item => ({
      id: Date.now() + Math.random(),
      name: item.name,
      amount: Number(item.price),
      category: item.category,
      date: receiptDate,
      notes: storeName ? 'Receipt: ' + storeName : 'Receipt scan',
      calories: null,
    })));
    setStep('idle');
    setImageData(null);
    setPreviewUrl(null);
    setScannedItems([]);
    setStoreName('');
    setReceiptDate(defaultDate);
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleReset() {
    setStep('idle');
    setImageData(null);
    setPreviewUrl(null);
    setScannedItems([]);
    setErrorMsg('');
    if (fileRef.current) fileRef.current.value = '';
  }

  const selectedTotal = scannedItems.filter(i => i.selected).reduce((sum, i) => sum + Number(i.price), 0);

  return (
    <div className="receipt-scanner card">
      <div className="scanner-header">
        <div className="scanner-title-row">
          <Camera size={16} color="var(--accent)" />
          <h3 className="scanner-title">Scan a Receipt</h3>
          <span className="scanner-badge">AI-Powered</span>
        </div>
        <p className="scanner-sub">Upload a clear photo of any receipt — AI reads every line item and price automatically.</p>
      </div>

      {step === 'idle' && (
        <div className="scanner-upload-zone" onClick={() => fileRef.current?.click()}>
          <Upload size={28} color="var(--text-muted)" />
          <p className="scanner-upload-label">Click to upload receipt photo</p>
          <p className="scanner-upload-hint">JPG, PNG, HEIC · Works best with flat, well-lit receipts</p>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        </div>
      )}

      {step === 'preview' && (
        <div className="scanner-preview fade-in">
          <img src={previewUrl} alt="Receipt" className="scanner-preview-img" />
          <div className="scanner-preview-actions">
            <button className="btn-primary" onClick={handleScan}><Camera size={15} /> Scan This Receipt</button>
            <button className="btn-ghost" onClick={handleReset}>Choose Different Photo</button>
          </div>
        </div>
      )}

      {step === 'scanning' && (
        <div className="scanner-loading fade-in">
          <Loader size={32} className="scanner-spinner" />
          <p className="scanner-loading-text">Reading your receipt...</p>
          <p className="scanner-loading-sub">AI is extracting every item and price</p>
        </div>
      )}

      {step === 'error' && (
        <div className="scanner-error fade-in">
          <XCircle size={28} color="var(--red)" />
          <p className="scanner-error-text">{errorMsg}</p>
          <div className="scanner-error-tips">
            <p className="scanner-tips-title">Tips for a better scan:</p>
            <ul>
              <li>Lay the receipt flat with no crumples</li>
              <li>Use good lighting — avoid shadows</li>
              <li>Capture the full receipt in frame</li>
              <li>Make sure all text is in focus</li>
            </ul>
          </div>
          <button className="btn-primary" onClick={handleReset}>Try Again</button>
        </div>
      )}

      {step === 'review' && (
        <div className="scanner-review fade-in">
          <div className="scanner-review-header">
            <div className="scanner-review-meta">
              <CheckCircle size={16} color="var(--accent)" />
              <span className="scanner-found-text">
                Found {scannedItems.length} items{storeName ? ' from ' + storeName : ''}
              </span>
            </div>
            <div className="scanner-review-date">
              <label className="label" style={{ marginBottom: 0 }}>Date</label>
              <input type="date" className="input-field" style={{ width: 'auto', padding: '6px 10px', fontSize: 13 }}
                value={receiptDate} onChange={e => setReceiptDate(e.target.value)} />
            </div>
          </div>
          <p className="scanner-review-hint">Uncheck items to skip. Edit anything that looks wrong.</p>
          <div className="scanned-items-list">
            {scannedItems.map(item => (
              <div key={item.id} className={'scanned-item ' + (item.selected ? 'selected' : 'deselected')}>
                <input type="checkbox" checked={item.selected} onChange={() => toggleItem(item.id)} className="scanned-item-check" />
                <div className="scanned-item-fields">
                  <input className="input-field scanned-name-input" value={item.name}
                    onChange={e => updateItem(item.id, 'name', e.target.value)} disabled={!item.selected} />
                  <select className="input-field scanned-cat-input" value={item.category}
                    onChange={e => updateItem(item.id, 'category', e.target.value)} disabled={!item.selected}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="scanned-price-wrap">
                    <span className="scanned-price-dollar">$</span>
                    <input className="input-field scanned-price-input" type="number" min="0" step="0.01"
                      value={item.price} onChange={e => updateItem(item.id, 'price', e.target.value)} disabled={!item.selected} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="scanner-confirm-row">
            <div className="scanner-total">
              <span className="scanner-total-label">{scannedItems.filter(i => i.selected).length} of {scannedItems.length} selected</span>
              <span className="scanner-total-val">{formatMoney(selectedTotal)}</span>
            </div>
            <div className="scanner-confirm-actions">
              <button className="btn-primary" onClick={handleConfirm} disabled={scannedItems.filter(i => i.selected).length === 0}>
                <Plus size={15} /> Add to Expenses
              </button>
              <button className="btn-ghost" onClick={handleReset}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN EXPENSES ─────────────────────────────────────────────────────────────
export default function Expenses({ expenses, setExpenses, foodLog, isPremium, setIsPremium }) {
  const todayStr = today();
  const monthStr = todayStr.slice(0, 7);

  const [form, setForm] = useState({
    name: '', amount: '', category: 'Groceries', date: todayStr, notes: ''
  });
  const [activeTab, setActiveTab] = useState('scanner');
  const [showPremiumGate, setShowPremiumGate] = useState(false);

  function handleAdd(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.amount) return;
    setExpenses(prev => [...prev, {
      id: Date.now(), name: form.name.trim(), amount: Number(form.amount),
      category: form.category, date: form.date, notes: form.notes.trim(),
      calories: null,
    }]);
    setForm({ name: '', amount: '', category: 'Groceries', date: todayStr, notes: '' });
  }

  function handleScannedItems(entries) {
    setExpenses(prev => [...prev, ...entries]);
  }

  function handleDelete(id) {
    setExpenses(prev => prev.filter(e => e.id !== id));
  }

  const monthExpenses = useMemo(() => expenses.filter(e => e.date.startsWith(monthStr)), [expenses, monthStr]);
  const totalMonth = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const byCategory = useMemo(() => {
    const map = {};
    CATEGORIES.forEach(c => { map[c] = 0; });
    monthExpenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([name, total]) => ({ name: name.split(' / ')[0], total, fullName: name }))
      .sort((a, b) => b.total - a.total);
  }, [monthExpenses]);

  const monthFoodSpending = monthExpenses
    .filter(e => ['Groceries', 'Meal Prep', 'Protein / Powder'].includes(e.category))
    .reduce((sum, e) => sum + e.amount, 0);

  const monthCalories = useMemo(() => {
    const start = monthStr + '-01';
    return foodLog.filter(e => e.date >= start && e.date.startsWith(monthStr))
      .reduce((sum, e) => sum + Number(e.calories || 0), 0);
  }, [foodLog, monthStr]);

  const costPerKcal = monthCalories > 0 ? (monthFoodSpending / monthCalories).toFixed(4) : null;
  const sortedExpenses = useMemo(() => [...expenses].sort((a, b) => b.date.localeCompare(a.date)), [expenses]);
  const topCat = byCategory[0];

  return (
    <div className="expenses fade-in">
      <div className="page-header">
        <h1 className="page-title">Expenses</h1>
        <p className="page-sub">Scan receipts with AI or log manually. Track what your health actually costs.</p>
      </div>

      <div className="expense-summary">
        <div className="card expense-summary-card">
          <p className="summary-label">This Month</p>
          <p className="summary-value gold">{formatMoney(totalMonth)}</p>
          <p className="summary-sub">{monthExpenses.length} transactions</p>
        </div>
        <div className="card expense-summary-card">
          <p className="summary-label">Cost per Calorie</p>
          {costPerKcal
            ? <><p className="summary-value accent">${costPerKcal}</p><p className="summary-sub">per kcal from food budget</p></>
            : <><p className="summary-value muted">—</p><p className="summary-sub">Log food + food expenses to unlock</p></>}
        </div>
        <div className="card expense-summary-card">
          <p className="summary-label">Top Category</p>
          {topCat
            ? <><p className="summary-value" style={{ color: CATEGORY_COLORS[topCat.fullName] || 'var(--text-primary)' }}>{topCat.name}</p><p className="summary-sub">{formatMoney(topCat.total)} this month</p></>
            : <><p className="summary-value muted">—</p><p className="summary-sub">No expenses yet</p></>}
        </div>
      </div>

      <div className="expenses-layout">
        <div className="expenses-main">
          <div className="add-expense-tabs">
            <button
              className={'expense-tab ' + (activeTab === 'scanner' ? 'active' : '')}
              onClick={() => isPremium ? setActiveTab('scanner') : setShowPremiumGate(true)}
            >
              <Camera size={14} /> Scan Receipt {!isPremium && <span style={{ fontSize: 12 }}>🔒</span>}
            </button>
            <button
              className={'expense-tab ' + (activeTab === 'manual' ? 'active' : '')}
              onClick={() => setActiveTab('manual')}
            >
              <Plus size={14} /> Manual Entry
            </button>
          </div>

          {showPremiumGate && (
            <PremiumGate
              featureName="Receipt Scanner"
              onUnlock={() => { setIsPremium(true); setShowPremiumGate(false); setActiveTab('scanner'); }}
              onClose={() => setShowPremiumGate(false)}
            />
          )}

          {activeTab === 'scanner' && isPremium && (
            <ReceiptScanner onItemsConfirmed={handleScannedItems} defaultDate={todayStr} />
          )}

          {activeTab === 'manual' && (
            <div className="card add-expense-card fade-in">
              <h2 className="section-title"><Plus size={16} /> Log an Expense</h2>
              <form onSubmit={handleAdd}>
                <div className="form-row">
                  <div className="form-group flex-3">
                    <label className="label">Description *</label>
                    <input className="input-field" placeholder="e.g. Whole Foods grocery run"
                      value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                  </div>
                  <div className="form-group flex-1">
                    <label className="label">Amount ($) *</label>
                    <input className="input-field" type="number" placeholder="0.00" min="0" step="0.01"
                      value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group flex-2">
                    <label className="label">Category</label>
                    <select className="input-field" value={form.category}
                      onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group flex-1">
                    <label className="label">Date</label>
                    <input type="date" className="input-field date-input" value={form.date}
                      onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                  </div>

                </div>
                <div className="form-row">
                  <div className="form-group flex-3">
                    <label className="label">Notes</label>
                    <input className="input-field" placeholder="optional"
                      value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
                  </div>
                  <div className="form-group flex-1" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center', padding: '11px 20px' }}>
                      <Plus size={15} /> Add
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          <div className="card expense-list-card">
            <h2 className="section-title">
              All Expenses <span className="entry-count">{expenses.length} total</span>
            </h2>
            {sortedExpenses.length === 0 ? (
              <div className="empty-state">
                <Wallet size={28} color="var(--border)" />
                <p>No expenses logged yet.</p>
                <p className="empty-sub">Scan a receipt or add one manually above.</p>
              </div>
            ) : (
              <div className="expense-list">
                {sortedExpenses.map(exp => (
                  <div key={exp.id} className="expense-entry fade-in">
                    <div className="expense-dot" style={{ background: CATEGORY_COLORS[exp.category] || 'var(--text-muted)' }} />
                    <div className="expense-info">
                      <span className="expense-name">{exp.name}</span>
                      <span className="expense-meta">{exp.category} · {exp.date}{exp.notes ? ' · ' + exp.notes : ''}</span>
                    </div>
                    <div className="expense-right">
                      <span className="expense-amount">{formatMoney(exp.amount)}</span>
                      {exp.calories && <span className="expense-cpc">${(exp.amount / exp.calories).toFixed(4)}/kcal</span>}
                      <button className="btn-danger" onClick={() => handleDelete(exp.id)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="expenses-side">
          <div className="card category-chart-card">
            <h2 className="section-title" style={{marginBottom:8}}>This Month</h2>
            {byCategory.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '24px 0', textAlign: 'center' }}>No expenses this month yet.</p>
            ) : (
              <>
                {/* Donut pie chart */}
                <div className="pie-chart-wrap">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={byCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="total"
                        nameKey="name"
                      >
                        {byCategory.map((entry, index) => (
                          <Cell key={index} fill={CATEGORY_COLORS[entry.fullName] || '#555'} strokeWidth={0} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [formatMoney(value), name]}
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: 'var(--text-muted)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Total in center */}
                  <div className="pie-center-label">
                    <span className="pie-total-val">{formatMoney(totalMonth)}</span>
                    <span className="pie-total-sub">total</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="pie-legend">
                  {byCategory.map((entry, i) => {
                    const pct = Math.round((entry.total / totalMonth) * 100);
                    return (
                      <div key={i} className="pie-legend-row">
                        <span className="pie-legend-dot" style={{ background: CATEGORY_COLORS[entry.fullName] || '#555' }} />
                        <span className="pie-legend-name">{entry.name}</span>
                        <span className="pie-legend-pct">{pct}%</span>
                        <span className="pie-legend-amt">{formatMoney(entry.total)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {costPerKcal && (
            <div className="card insight-card fade-in">
              <div className="insight-header"><ShoppingCart size={15} /><span>Cost Insight</span></div>
              <p className="insight-text">You're spending <strong style={{ color: 'var(--accent)' }}>${costPerKcal}</strong> per calorie this month.</p>
              <p className="insight-sub">Food spending: {formatMoney(monthFoodSpending)} · Calories: {monthCalories.toLocaleString()} cals</p>
            </div>
          )}

          <div className="card scanner-tip-card">
            <div className="insight-header"><Camera size={15} /><span>Receipt Scan Tips</span></div>
            <ul className="scanner-tips-list">
              <li>Lay receipt flat, no crumples</li>
              <li>Good lighting, no shadows</li>
              <li>Capture the full receipt in frame</li>
              <li>Works best with grocery & supplement stores</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

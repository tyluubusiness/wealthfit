import React, { useMemo } from 'react';
import { Apple, Dumbbell, Wallet, Flame, TrendingUp, TrendingDown, Droplets, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

// Returns today's date as YYYY-MM-DD string
function today() {
  return new Date().toISOString().split('T')[0];
}

// Format currency nicely: 1234.5 → "$1,234.50"
function formatMoney(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// A single stat card at the top of the dashboard
function StatCard({ label, value, sub, icon: Icon, color, onClick }) {
  return (
    <div className="stat-card card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="stat-icon" style={{ background: color + '20', color }}>
        <Icon size={18} />
      </div>
      <div className="stat-body">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        {sub && <p className="stat-sub">{sub}</p>}
      </div>
    </div>
  );
}

// Custom tooltip for the calorie chart
function CalTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip card">
      <p className="chart-tooltip-date">{label}</p>
      <p className="chart-tooltip-val">{payload[0].value} cals</p>
    </div>
  );
}

export default function Dashboard({ foodLog, workoutLog, expenses, calorieGoal, setActiveTab, waterLog, waterGoal, splits, activeSplitId }) {
  const todayStr = today();

  // Sum today's calories
  const todayCalories = useMemo(() =>
    foodLog
      .filter(e => e.date === todayStr)
      .reduce((sum, e) => sum + Number(e.calories || 0), 0),
    [foodLog, todayStr]
  );

  // Count workouts this week
  const weekStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split('T')[0];
  }, []);

  const workoutsThisWeek = useMemo(() =>
    workoutLog.filter(w => w.date >= weekStart).length,
    [workoutLog, weekStart]
  );

  // Sum this month's expenses
  const monthStr = todayStr.slice(0, 7); // "YYYY-MM"
  const monthExpenses = useMemo(() =>
    expenses
      .filter(e => e.date.startsWith(monthStr))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [expenses, monthStr]
  );

  // Last 7 days of calorie data for the chart
  const calChartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      const cals = foodLog
        .filter(e => e.date === dateStr)
        .reduce((sum, e) => sum + Number(e.calories || 0), 0);
      days.push({ date: label, calories: cals });
    }
    return days;
  }, [foodLog]);

  const calorieProgress = Math.min((todayCalories / calorieGoal) * 100, 100);
  const calorieLeft = calorieGoal - todayCalories;

  // Water today
  const todayWaterOz = (waterLog || [])
    .filter(w => w.date === todayStr)
    .reduce((sum, w) => sum + w.oz, 0);
  const waterProgress = Math.min((todayWaterOz / (waterGoal || 128)) * 100, 100);

  // Today's split day
  const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const jsDay = new Date().getDay();
  const todayIdx = jsDay === 0 ? 6 : jsDay - 1;
  const todayDayKey = DAYS_SHORT[todayIdx];
  const activeSplit = (splits || []).find(s => s.id === activeSplitId);
  const todayWorkout = activeSplit?.days?.[todayDayKey] || null;

  return (
    <div className="dashboard fade-in">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-date">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        <StatCard
          label="Calories Today"
          value={`${todayCalories.toLocaleString()} cals`}
          sub={calorieLeft >= 0 ? `${calorieLeft} remaining` : `${Math.abs(calorieLeft)} over goal`}
          icon={Flame}
          color="var(--accent)"
          onClick={() => setActiveTab('food')}
        />
        <StatCard
          label="Workouts This Week"
          value={workoutsThisWeek}
          sub={workoutsThisWeek === 1 ? 'session logged' : 'sessions logged'}
          icon={Dumbbell}
          color="#a78bfa"
          onClick={() => setActiveTab('workout')}
        />
        <StatCard
          label="Health Spending"
          value={formatMoney(monthExpenses)}
          sub="this month"
          icon={Wallet}
          color="var(--gold)"
          onClick={() => setActiveTab('expenses')}
        />
      </div>

      {/* Water + Today's Workout row */}
      <div className="dashboard-quick-row">
        {/* Water progress bar */}
        <div className="card dashboard-water-card" onClick={() => setActiveTab('food')} style={{cursor:'pointer'}}>
          <div className="dash-water-header">
            <div className="dash-water-title">
              <Droplets size={15} color="#38bdf8" />
              <span>Water Today</span>
            </div>
            <span className="dash-water-val">{todayWaterOz}<span className="dash-water-unit">oz</span> / {waterGoal || 128}oz</span>
          </div>
          <div className="dash-water-track">
            <div className="dash-water-fill" style={{ width: waterProgress + '%' }} />
          </div>
          <p className="dash-water-sub">{(todayWaterOz / 8).toFixed(1)} cups · {(todayWaterOz * 0.0295735).toFixed(2)}L {waterProgress >= 100 ? '🎉 Goal reached!' : ''}</p>
        </div>

        {/* Today's workout from split */}
        {activeSplit ? (
          <div className={'card dashboard-today-card ' + (!todayWorkout || todayWorkout === 'Rest' ? 'rest' : '')}
            onClick={() => setActiveTab('workout')} style={{cursor:'pointer'}}>
            <div className="dash-today-label">
              <Calendar size={13} />
              <span>Today · {new Date().toLocaleDateString('en-US', { weekday: 'long' })}</span>
            </div>
            <p className="dash-today-workout">{todayWorkout || 'No workout set'}</p>
            <p className="dash-today-split">{activeSplit.name}</p>
          </div>
        ) : (
          <div className="card dashboard-today-card rest" onClick={() => setActiveTab('workout')} style={{cursor:'pointer'}}>
            <div className="dash-today-label"><Calendar size={13} /><span>Today's Workout</span></div>
            <p className="dash-today-workout" style={{color:'var(--text-muted)'}}>No split active</p>
            <p className="dash-today-split">Go to Workouts to create one</p>
          </div>
        )}
      </div>

      {/* Calorie Progress + Chart */}
      <div className="dashboard-grid">
        {/* Progress ring section */}
        <div className="card dashboard-calorie-card">
          <h2 className="section-title">Today's Calorie Goal</h2>
          <div className="calorie-ring-wrap">
            {/* SVG progress ring */}
            <svg className="calorie-ring" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--border)" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="50"
                fill="none"
                stroke={calorieLeft < 0 ? 'var(--red)' : 'var(--accent)'}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 50}`}
                strokeDashoffset={`${2 * Math.PI * 50 * (1 - calorieProgress / 100)}`}
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
              <text x="60" y="54" textAnchor="middle" fill="var(--text-primary)" fontSize="14" fontWeight="700" fontFamily="Space Grotesk, sans-serif">
                {Math.round(calorieProgress)}%
              </text>
              <text x="60" y="70" textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="Inter, sans-serif">
                of {calorieGoal}
              </text>
            </svg>
          </div>
          <div className="calorie-breakdown">
            <div className="calorie-stat">
              <span className="calorie-stat-label">Consumed</span>
              <span className="calorie-stat-val accent">{todayCalories.toLocaleString()}</span>
            </div>
            <div className="calorie-stat">
              <span className="calorie-stat-label">{calorieLeft >= 0 ? 'Remaining' : 'Over by'}</span>
              <span className={`calorie-stat-val ${calorieLeft < 0 ? 'red' : ''}`}>
                {Math.abs(calorieLeft).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* 7-day calorie chart */}
        <div className="card dashboard-chart-card">
          <h2 className="section-title">7-Day Calorie Trend</h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={calChartData} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CalTooltip />} />
              <Area type="monotone" dataKey="calories" stroke="var(--accent)" strokeWidth={2} fill="url(#calGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          {/* Goal line label */}
          <p className="chart-goal-note">Daily goal: {calorieGoal.toLocaleString()} cals</p>
        </div>
      </div>

      {/* Recent activity */}
      <div className="card recent-card">
        <h2 className="section-title">Recent Activity</h2>
        {foodLog.length === 0 && workoutLog.length === 0 && expenses.length === 0 ? (
          <div className="empty-state">
            <p>Nothing logged yet — start tracking your food, workouts, or expenses!</p>
          </div>
        ) : (
          <div className="recent-list">
            {[
              ...foodLog.slice(-3).map(e => ({ type: 'food', icon: Apple, label: e.name, sub: `${e.calories} kcal`, date: e.date, color: 'var(--accent)' })),
              ...workoutLog.slice(-2).map(w => ({ type: 'workout', icon: Dumbbell, label: w.name, sub: `${w.exercises?.length || 0} exercises`, date: w.date, color: '#a78bfa' })),
              ...expenses.slice(-2).map(e => ({ type: 'expense', icon: Wallet, label: e.name, sub: formatMoney(e.amount), date: e.date, color: 'var(--gold)' })),
            ]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5)
              .map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="recent-item">
                    <div className="recent-icon" style={{ background: item.color + '20', color: item.color }}>
                      <Icon size={14} />
                    </div>
                    <div className="recent-text">
                      <span className="recent-name">{item.label}</span>
                      <span className="recent-meta">{item.sub}</span>
                    </div>
                    <span className="recent-date">{item.date}</span>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

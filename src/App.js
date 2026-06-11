import React, { useState } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import FoodLog from './components/FoodLog';
import WorkoutLog from './components/WorkoutLog';
import Expenses from './components/Expenses';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

  // Premium access — persists across sessions
  const [isPremium, setIsPremium] = useLocalStorage('wf_premium', false);

  // Food & nutrition data
  const [foodLog, setFoodLog] = useLocalStorage('wf_food', []);
  const [calorieGoal, setCalorieGoal] = useLocalStorage('wf_calorie_goal', 2000);
  const [waterLog, setWaterLog] = useLocalStorage('wf_water', []); // { id, date, oz }
  const [waterGoal, setWaterGoal] = useLocalStorage('wf_water_goal', 128); // oz (1 gallon = 128oz)

  // Macro split goals: percentages that add to 100
  const [macroGoals, setMacroGoals] = useLocalStorage('wf_macro_goals', {
    protein: 30,
    carbs: 45,
    fat: 25,
  });

  // Workout data
  const [workoutLog, setWorkoutLog] = useLocalStorage('wf_workouts', []);
  const [bodyweightLog, setBodyweightLog] = useLocalStorage('wf_bodyweight', []);
  // splits: array of { id, name, days: { Mon, Tue, Wed, Thu, Fri, Sat, Sun } }
  const [splits, setSplits] = useLocalStorage('wf_splits', []);
  const [activeSplitId, setActiveSplitId] = useLocalStorage('wf_active_split', null);

  // Expense data
  const [expenses, setExpenses] = useLocalStorage('wf_expenses', []);

  function renderPage() {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            foodLog={foodLog}
            workoutLog={workoutLog}
            expenses={expenses}
            calorieGoal={calorieGoal}
            setActiveTab={setActiveTab}
            waterLog={waterLog}
            waterGoal={waterGoal}
            splits={splits}
            activeSplitId={activeSplitId}
          />
        );
      case 'food':
        return (
          <FoodLog
            foodLog={foodLog}
            setFoodLog={setFoodLog}
            calorieGoal={calorieGoal}
            setCalorieGoal={setCalorieGoal}
            waterLog={waterLog}
            setWaterLog={setWaterLog}
            waterGoal={waterGoal}
            setWaterGoal={setWaterGoal}
            macroGoals={macroGoals}
            setMacroGoals={setMacroGoals}
            isPremium={isPremium}
            setIsPremium={setIsPremium}
          />
        );
      case 'workout':
        return (
          <WorkoutLog
            workoutLog={workoutLog}
            setWorkoutLog={setWorkoutLog}
            bodyweightLog={bodyweightLog}
            setBodyweightLog={setBodyweightLog}
            splits={splits}
            setSplits={setSplits}
            activeSplitId={activeSplitId}
            setActiveSplitId={setActiveSplitId}
          />
        );
      case 'expenses':
        return (
          <Expenses
            expenses={expenses}
            setExpenses={setExpenses}
            foodLog={foodLog}
            isPremium={isPremium}
            setIsPremium={setIsPremium}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="app-shell">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onToggle={setSidebarOpen} />
      <main className={'app-main ' + (sidebarOpen ? '' : 'sidebar-collapsed')}>
        <div className="app-content">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

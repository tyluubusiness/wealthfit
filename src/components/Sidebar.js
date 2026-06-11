import React, { useState, useEffect } from 'react';
import { Apple, Dumbbell, Wallet, LayoutDashboard, TrendingUp, Menu, X, ChevronLeft } from 'lucide-react';
import './Sidebar.css';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'food',      label: 'Food Log',  icon: Apple },
  { id: 'workout',   label: 'Workouts',  icon: Dumbbell },
  { id: 'expenses',  label: 'Expenses',  icon: Wallet },
];

export default function Sidebar({ activeTab, setActiveTab, onToggle }) {
  const [open, setOpen] = useState(window.innerWidth > 768);

  useEffect(() => {
    if (onToggle) onToggle(open);
  }, [open, onToggle]);

  useEffect(() => {
    function handleResize() {
      setOpen(window.innerWidth > 768);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (window.innerWidth <= 768 && open && !e.target.closest('.sidebar') && !e.target.closest('.mobile-menu-btn')) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [open]);

  function handleNav(id) {
    setActiveTab(id);
    if (window.innerWidth <= 768) setOpen(false);
  }

  return (
    <>
      {/* MOBILE: top bar with hamburger */}
      <div className="mobile-topbar">
        <div className="mobile-logo">
          <div className="logo-icon"><TrendingUp size={16} /></div>
          <span className="logo-name">WealthFit</span>
        </div>
        <button className="mobile-menu-btn" onClick={() => setOpen(p => !p)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* MOBILE: dark overlay behind open sidebar */}
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}

      {/* SIDEBAR */}
      <aside className={'sidebar ' + (open ? 'sidebar-open' : 'sidebar-closed')}>

        {/* Logo row + collapse button */}
        <div className="sidebar-logo">
          <div className="logo-icon"><TrendingUp size={18} /></div>
          <div className="logo-text">
            <span className="logo-name">WealthFit</span>
            <span className="logo-tagline">Health × Finance</span>
          </div>
          {/* Desktop: collapse arrow | Mobile: X close */}
          <button
            className="sidebar-toggle-btn"
            onClick={() => setOpen(p => !p)}
            title={open ? 'Collapse' : 'Expand'}
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={'nav-item ' + (activeTab === id ? 'active' : '')}
              onClick={() => handleNav(id)}
            >
              <Icon size={18} />
              <span className="nav-label">{label}</span>
              {activeTab === id && <div className="nav-indicator" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-footer-text">Data stored locally</span>
        </div>
      </aside>

      {/* DESKTOP: floating re-open button — only shows when sidebar is closed */}
      {!open && (
        <button className="sidebar-reopen-btn" onClick={() => setOpen(true)} title="Open sidebar">
          <Menu size={18} />
        </button>
      )}
    </>
  );
}

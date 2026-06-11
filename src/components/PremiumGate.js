import React, { useState } from 'react';
import { Lock, Zap, X, CheckCircle, ChevronRight } from 'lucide-react';
import './PremiumGate.css';

const BYPASS_CODE = 'tyler';

const PREMIUM_FEATURES = [
  { icon: '📷', label: 'Receipt Scanner',    desc: 'AI reads every line item on your receipts' },
  { icon: '🔍', label: 'Barcode Scanner',    desc: 'Scan any food package for instant macros' },
  { icon: '📊', label: 'Advanced Analytics', desc: 'Deep insights into your health trends' },
  { icon: '☁️', label: 'Cloud Sync',         desc: 'Access your data on any device' },
];

export default function PremiumGate({ onUnlock, onClose, featureName }) {
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode]   = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  function handleCodeSubmit(e) {
    e.preventDefault();
    if (code.trim().toLowerCase() === BYPASS_CODE) {
      onUnlock();
    } else {
      setError('Invalid code. Please try again.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setCode('');
    }
  }

  return (
    <div className="premium-gate-overlay">
      <div className={'premium-gate-modal card ' + (shake ? 'shake' : '')}>

        {onClose && (
          <button className="premium-gate-close btn-ghost" onClick={onClose}>
            <X size={16} />
          </button>
        )}

        <div className="premium-gate-top">
          <div className="premium-gate-icon-wrap">
            <Lock size={28} color="var(--gold)" />
          </div>
          <div className="premium-gate-badge">
            <Zap size={11} /> Premium
          </div>
        </div>

        <h2 className="premium-gate-title">
          {featureName ? `${featureName} is a Premium Feature` : 'Upgrade to WealthFit Premium'}
        </h2>
        <p className="premium-gate-sub">
          Unlock AI-powered scanning, advanced analytics, and cloud sync — for less than a protein bar a week.
        </p>

        <div className="premium-price-card">
          <div className="premium-price-row">
            <span className="premium-price">$14.99</span>
            <span className="premium-price-period">/ month</span>
          </div>
          <p className="premium-price-note">Cancel anytime · No commitment</p>
        </div>

        <div className="premium-features-list">
          {PREMIUM_FEATURES.map((f, i) => (
            <div key={i} className="premium-feature-row">
              <span className="premium-feature-icon">{f.icon}</span>
              <div className="premium-feature-text">
                <span className="premium-feature-label">{f.label}</span>
                <span className="premium-feature-desc">{f.desc}</span>
              </div>
              <CheckCircle size={15} color="var(--accent)" />
            </div>
          ))}
        </div>

        <button
          className="btn-premium-cta"
          onClick={() => alert('Payment integration coming soon!\n\nUse an access code below to unlock now.')}
        >
          <Zap size={15} /> Upgrade Now — $14.99/mo <ChevronRight size={15} />
        </button>

        {!showCodeInput ? (
          <button className="premium-code-link" onClick={() => setShowCodeInput(true)}>
            Have an access code?
          </button>
        ) : (
          <form className="premium-code-form fade-in" onSubmit={handleCodeSubmit}>
            <div className="premium-code-input-row">
              <input
                className={'input-field premium-code-input ' + (error ? 'has-error' : '')}
                type="text"
                placeholder="Enter access code"
                value={code}
                onChange={e => { setCode(e.target.value); setError(''); }}
                autoFocus
                autoComplete="off"
              />
              <button className="btn-primary premium-code-submit" type="submit">
                Apply
              </button>
            </div>
            {error && <p className="premium-code-error">{error}</p>}
            <button
              type="button"
              className="premium-code-cancel"
              onClick={() => { setShowCodeInput(false); setError(''); setCode(''); }}
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

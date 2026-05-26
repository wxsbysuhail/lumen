import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, CheckCircle2, Edit2, Trash2, AlertCircle, X } from 'lucide-react';


interface SavingsBucket {
  id: string;
  name: string;
  target: number;
  current: number;
  monthlyContribution: number;
  priority?: 'high' | 'medium' | 'low';
}

interface RecurringItem {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
}

interface SavingsTrackerProps {
  buckets: SavingsBucket[];
  generalBalance: number;
  recurringIncomeItems: RecurringItem[];
  recurringExpenseItems: RecurringItem[];
  onAddBucket: (name: string, target: number, monthly: number, priority: 'high' | 'medium' | 'low') => void;
  onDepositToBucket: (id: string, amount: number) => void;
  onUpdateBucket: (id: string, name: string, target: number, monthly: number, priority: 'high' | 'medium' | 'low') => void;
  onDeleteBucket: (id: string) => void;
}

export const SavingsTracker: React.FC<SavingsTrackerProps> = ({
  buckets,
  generalBalance,
  recurringIncomeItems,
  recurringExpenseItems,
  onAddBucket,
  onDepositToBucket,
  onUpdateBucket,
  onDeleteBucket,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [monthly, setMonthly] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');

  const [depositBucketId, setDepositBucketId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositError, setDepositError] = useState('');

  // Edit and Delete states
  const [editingBucket, setEditingBucket] = useState<SavingsBucket | null>(null);
  const [editName, setEditName] = useState('');
  const [editTarget, setEditTarget] = useState('');
  const [editMonthly, setEditMonthly] = useState('');
  const [editPriority, setEditPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Auto-Allocation Calculator Baseline Logic
  const salaryItem = recurringIncomeItems.find(item => 
    /base|salary/i.test(item.description)
  );
  const leaseItem = recurringExpenseItems.find(item => 
    /lease/i.test(item.description)
  );
  const baseSalary = salaryItem ? salaryItem.amount : 30000;
  const leaseExpense = leaseItem ? leaseItem.amount : 10000;
  
  const coreDisposable = Math.max(0, baseSalary - leaseExpense);

  const getOtherBucketsContributionSum = (excludeId?: string) => {
    return buckets
      .filter(b => b.id !== excludeId)
      .reduce((sum, b) => sum + b.monthlyContribution, 0);
  };

  const getSuggestedMax = (p: 'high' | 'medium' | 'low', remaining: number) => {
    const pct = p === 'high' ? 0.7 : p === 'medium' ? 0.35 : 0.15;
    return Math.round(remaining * pct);
  };

  // Helper to format currency user input with commas
  const handleCurrencyChange = (value: string, setter: (val: string) => void) => {
    const clean = value.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) return; // ignore multiple decimals
    
    // Add thousands separators to the integer part
    const formattedInt = parts[0] ? parseInt(parts[0], 10).toLocaleString('en-US') : '';
    const formatted = parts[1] !== undefined ? `${formattedInt}.${parts[1].slice(0, 2)}` : formattedInt;
    
    setter(clean === '' ? '' : formatted);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !target) return;
    const parsedTarget = parseFloat(target.replace(/,/g, '')) || 0;
    const parsedMonthly = parseFloat(monthly.replace(/,/g, '')) || 0;
    onAddBucket(name, parsedTarget, parsedMonthly, priority);
    setName('');
    setTarget('');
    setMonthly('');
    setPriority('medium');
    setShowAddForm(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBucket || !editName || !editTarget) return;
    const parsedTarget = parseFloat(editTarget.replace(/,/g, '')) || 0;
    const parsedMonthly = parseFloat(editMonthly.replace(/,/g, '')) || 0;
    onUpdateBucket(editingBucket.id, editName, parsedTarget, parsedMonthly, editPriority);
    setEditingBucket(null);
  };

  const handleDeleteSubmit = () => {
    if (!editingBucket) return;
    onDeleteBucket(editingBucket.id);
    setEditingBucket(null);
    setShowDeleteConfirm(false);
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositBucketId || !depositAmount) return;
    const amount = parseFloat(depositAmount.replace(/,/g, '')) || 0;
    if (amount > generalBalance) {
      setDepositError("Insufficient available cash balance.");
      return;
    }
    onDepositToBucket(depositBucketId, amount);
    setDepositAmount('');
    setDepositError('');
    setDepositBucketId(null);
  };

  // Helper to calculate project completion date
  const calculateProjection = (current: number, target: number, monthly: number) => {
    if (current >= target) return 'Completed';
    if (monthly <= 0) return 'No active contributions';
    
    const remaining = target - current;
    const months = Math.ceil(remaining / monthly);
    
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    
    return `Projected: ${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} (${months} mo)`;
  };

  // SVG Progress Ring calculations
  const radius = 32;
  const circumference = 2 * Math.PI * radius;

  // ── Shared modal style constants ────────────────────────────────────────────
  const BACKDROP: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem',
  };
  const MODAL_PANEL: React.CSSProperties = {
    background: 'var(--card-bg)', border: '1px solid var(--border-color)',
    borderRadius: '1.5rem', padding: '1.5rem', width: '100%', maxWidth: '460px',
    overflowY: 'auto', maxHeight: '90vh', position: 'relative', zIndex: 1001,
  };
  const PRIORITY_COLORS: Record<string, { color: string; bg: string }> = {
    low:    { color: 'var(--emerald-gains)', bg: 'var(--emerald-gains-bg)' },
    medium: { color: '#B45309',             bg: 'rgba(228,168,59,0.1)' },
    high:   { color: 'var(--coral-losses)', bg: 'var(--coral-losses-bg)' },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
    >
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--ink-color)', margin: 0 }}>Savings Targets</h1>
          <p style={{ color: 'var(--ink-light)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
            Allocate cash to goal buckets. Track progress rings and completion timelines.
          </p>
        </div>
        <button
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
          onClick={() => setShowAddForm(true)}
        >
          <Plus size={15} /> New Bucket
        </button>
      </div>

      {/* Available Balance Card */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--ink-light)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Available Cash Balance</span>
          <h2 className="num" style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--ink-color)', marginTop: '2px', marginBottom: 0 }}>
            Rs. {generalBalance.toLocaleString('en-US')}
          </h2>
        </div>
        <p style={{ color: 'var(--ink-light)', fontSize: '0.82rem', margin: 0 }}>
          Transfer into buckets below to reserve funds toward each goal.
        </p>
      </div>

      {/* Grid of Buckets */}
      {buckets.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem', gap: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>🪣</div>
          <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ink-color)', margin: 0 }}>No savings buckets yet</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', margin: 0 }}>Create a bucket to start allocating cash toward your goals.</p>
          <button
            className="btn btn-primary"
            style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setShowAddForm(true)}
          >
            <Plus size={15} /> Create First Bucket
          </button>
        </div>
      ) : (
        <div className="grid grid-2 gap-6">
          {buckets.map((bucket) => {
            const pct = Math.min(100, Math.max(0, (bucket.current / bucket.target) * 100));
            const strokeDashoffset = circumference - (pct / 100) * circumference;
            const ringColor = pct >= 100 ? 'var(--emerald-gains)' : pct >= 60 ? 'var(--emerald-gains)' : pct >= 25 ? '#E2A83B' : 'var(--coral-losses)';
            const priorityStyle = bucket.priority ? PRIORITY_COLORS[bucket.priority] : PRIORITY_COLORS.medium;

            return (
              <div key={bucket.id} className="card flex flex-col justify-between" style={{ minHeight: '275px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 650, marginBottom: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bucket.name}</h3>
                        <button type="button" className="icon-btn" title="Edit Goal"
                          onClick={() => { setEditingBucket(bucket); setEditName(bucket.name); setEditTarget(bucket.target.toLocaleString('en-US')); setEditMonthly(bucket.monthlyContribution.toLocaleString('en-US')); setEditPriority(bucket.priority || 'medium'); setShowDeleteConfirm(false); }}>
                          <Edit2 size={14} />
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '6px' }}>
                        {bucket.priority && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 7px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 700, background: priorityStyle.bg, color: priorityStyle.color, width: 'fit-content' }}>
                            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: priorityStyle.color, flexShrink: 0 }} />
                            {bucket.priority.toUpperCase()} PRIORITY
                          </div>
                        )}
                        <span className="num" style={{ fontSize: '0.75rem', color: 'var(--ink-light)' }}>
                          {calculateProjection(bucket.current, bucket.target, bucket.monthlyContribution)}
                        </span>
                      </div>
                    </div>

                    {/* SVG progress ring — starts at 12 o'clock */}
                    <div style={{ position: 'relative', width: '76px', height: '76px', flexShrink: 0 }}>
                      <svg width="76" height="76" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="40" cy="40" r={radius} fill="transparent" stroke="var(--border-color)" strokeWidth="8" />
                        <circle cx="40" cy="40" r={radius} fill="transparent" stroke={ringColor} strokeWidth="8"
                          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
                          style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease' }}
                        />
                      </svg>
                      <div className="num" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.82rem', fontWeight: 700, color: ringColor }}>
                        {Math.round(pct)}%
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--ink-muted)' }}>Accumulated</span>
                      <span className="num" style={{ fontWeight: 600 }}>Rs. {bucket.current.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--ink-muted)' }}>Target Goal</span>
                      <span className="num" style={{ fontWeight: 600 }}>Rs. {bucket.target.toLocaleString()}</span>
                    </div>
                    {/* Linear progress bar */}
                    <div style={{ height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden', margin: '2px 0' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: ringColor, borderRadius: '2px', transition: 'width 0.8s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--ink-muted)' }}>Monthly Share</span>
                      <span className="num" style={{ fontWeight: 600 }}>Rs. {bucket.monthlyContribution.toLocaleString()} / mo</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 'var(--space-4)' }}>
                  {bucket.current >= bucket.target ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--emerald-gains)', fontSize: '0.9rem', fontWeight: 600 }}>
                      <CheckCircle2 size={16} /> Goal Completed
                    </div>
                  ) : (
                    <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.85rem' }}
                      onClick={() => { setDepositBucketId(bucket.id); setDepositAmount(''); setDepositError(''); }}>
                      Transfer Cash
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Bucket Modal */}
      {showAddForm && (
        <div style={BACKDROP}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onClick={() => setShowAddForm(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={MODAL_PANEL}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink-color)', margin: 0 }}>New Savings Bucket</h3>
              <button type="button" className="icon-btn" onClick={() => setShowAddForm(false)}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">Bucket Label</label>
                <input type="text" placeholder="e.g. Emergency Fund, Japan Trip" value={name} onChange={(e) => setName(e.target.value)} className="input-field" required autoFocus />
              </div>

              <div className="input-group">
                <label className="input-label">Target Amount (MUR)</label>
                <input type="text" placeholder="e.g. 100,000" value={target} onChange={(e) => handleCurrencyChange(e.target.value, setTarget)} className="input-field num-input" required />
              </div>

              <div className="input-group">
                <label className="input-label">Goal Priority</label>
                <div style={{ display: 'flex', background: 'var(--nav-pill-bg)', padding: '3px', borderRadius: '9999px', gap: '3px' }}>
                  {(['low', 'medium', 'high'] as const).map((p) => {
                    const isActive = priority === p;
                    return (
                      <button key={p} type="button" onClick={() => setPriority(p)}
                        style={{ flex: 1, padding: '8px 0', borderRadius: '9999px', fontSize: '0.82rem', fontWeight: isActive ? 650 : 500, border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: isActive ? PRIORITY_COLORS[p].bg : 'transparent', color: isActive ? PRIORITY_COLORS[p].color : 'var(--ink-muted)', boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auto-Allocation Advisor */}
              {(() => {
                const otherContributions = getOtherBucketsContributionSum();
                const remaining = Math.max(0, coreDisposable - otherContributions);
                let suggestedMax = getSuggestedMax(priority, remaining);
                const targetVal = parseFloat(target.replace(/,/g, '')) || 0;
                if (targetVal > 0 && suggestedMax > targetVal) suggestedMax = targetVal;
                const currentMonthlyInput = parseFloat(monthly.replace(/,/g, '')) || 0;
                const isExceeded = currentMonthlyInput > suggestedMax;
                return (
                  <div style={{ background: 'var(--nav-pill-bg)', border: '1px solid var(--border-color)', borderRadius: '1rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Auto-Allocation Advisor</span>
                      <button type="button" style={{ fontSize: '0.75rem', color: 'var(--emerald-gains)', fontWeight: 650, background: 'none', border: 'none', cursor: 'pointer' }}
                        onClick={() => setMonthly(suggestedMax.toLocaleString('en-US'))} disabled={suggestedMax <= 0}>
                        Apply Max (Rs. {suggestedMax.toLocaleString()})
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.78rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--ink-muted)' }}>Baseline:</span>
                        <span className="num" style={{ color: 'var(--ink-color)' }}>Rs. {baseSalary.toLocaleString()} − Rs. {leaseExpense.toLocaleString()} = Rs. {coreDisposable.toLocaleString()}</span>
                      </div>
                      {otherContributions > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--ink-muted)' }}>Other buckets:</span>
                          <span className="num" style={{ color: 'var(--coral-losses)' }}>−Rs. {otherContributions.toLocaleString()} / mo</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '5px', borderTop: '1px solid var(--border-color)', fontWeight: 600 }}>
                        <span style={{ color: 'var(--ink-color)' }}>Remaining Pool:</span>
                        <span className="num" style={{ color: 'var(--ink-color)' }}>Rs. {remaining.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--ink-muted)' }}>Suggested ({priority === 'high' ? '70%' : priority === 'medium' ? '35%' : '15%'}):</span>
                        <span className="num" style={{ color: 'var(--emerald-gains)', fontWeight: 650 }}>Rs. {suggestedMax.toLocaleString()} / mo</span>
                      </div>
                    </div>
                    {isExceeded && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', padding: '8px 10px', background: 'rgba(228,168,59,0.08)', border: '1px solid rgba(228,168,59,0.25)', borderRadius: '8px', fontSize: '0.75rem', color: '#B45309' }}>
                        <AlertCircle size={12} style={{ flexShrink: 0 }} /><span>Exceeds safe suggested monthly maximum.</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="input-group">
                <label className="input-label">Monthly Contribution (MUR)</label>
                <input type="text" placeholder="e.g. 5,000" value={monthly} onChange={(e) => handleCurrencyChange(e.target.value, setMonthly)} className="input-field num-input" />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Create Bucket</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Deposit to Bucket Modal */}
      {depositBucketId && (() => {
        const depositBucket = buckets.find(b => b.id === depositBucketId);
        const depositAmt = parseFloat(depositAmount.replace(/,/g, '')) || 0;
        return (
          <div style={BACKDROP}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onClick={() => setDepositBucketId(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              style={MODAL_PANEL}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink-color)', margin: 0 }}>Transfer Cash</h3>
                <button type="button" className="icon-btn" onClick={() => setDepositBucketId(null)}><X size={16} /></button>
              </div>

              {depositBucket && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--nav-pill-bg)', borderRadius: '10px', marginBottom: '1rem', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink-color)' }}>{depositBucket.name}</span>
                  <span className="num" style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                    Rs. {depositBucket.current.toLocaleString()} / Rs. {depositBucket.target.toLocaleString()}
                  </span>
                </div>
              )}

              <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginBottom: '1rem' }}>
                General cash will be deducted and deposited directly into this bucket.
              </p>

              <form onSubmit={handleDepositSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label">Transfer Amount (MUR)</label>
                  <input type="text" placeholder="e.g. 10,000" value={depositAmount}
                    onChange={(e) => { handleCurrencyChange(e.target.value, setDepositAmount); setDepositError(''); }}
                    className="input-field num-input" required autoFocus />
                  <span className="num" style={{ fontSize: '0.75rem', color: 'var(--ink-light)', marginTop: '4px', display: 'block' }}>
                    Available: Rs. {generalBalance.toLocaleString('en-US')}
                  </span>
                </div>

                {depositError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'var(--coral-losses-bg)', border: '1px solid var(--coral-losses)', borderRadius: '10px', fontSize: '0.82rem', color: 'var(--coral-losses)' }}>
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />{depositError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDepositBucketId(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={!depositAmount || depositAmt > generalBalance}>
                    Confirm Transfer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        );
      })()}

      {/* Edit Bucket Modal */}
      {editingBucket && (
        <div style={BACKDROP}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onClick={() => { setEditingBucket(null); setShowDeleteConfirm(false); }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={MODAL_PANEL}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink-color)', margin: 0 }}>
                {showDeleteConfirm ? 'Delete Bucket?' : 'Edit Savings Goal'}
              </h3>
              <button type="button" className="icon-btn" onClick={() => { setEditingBucket(null); setShowDeleteConfirm(false); }}><X size={16} /></button>
            </div>

            {showDeleteConfirm ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--ink-color)', lineHeight: 1.5 }}>
                  Delete <strong>"{editingBucket.name}"</strong>? This cannot be undone.
                </p>
                <div style={{ background: 'var(--coral-losses-bg)', border: '1px solid var(--coral-losses)', padding: '14px', borderRadius: '12px', fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--ink-color)' }}>
                  <strong style={{ color: 'var(--coral-losses)' }}>Refund: </strong>
                  Accumulated savings of <span className="num" style={{ fontWeight: 700 }}>Rs. {editingBucket.current.toLocaleString()}</span> will be returned to your General Cash Balance.
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                  <button type="button" style={{ flex: 2, background: 'var(--coral-losses)', color: '#fff', border: 'none', borderRadius: '9999px', padding: '12px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }} onClick={handleDeleteSubmit}>
                    Confirm Delete
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label">Bucket Label</label>
                  <input type="text" placeholder="e.g. Emergency Fund" value={editName} onChange={(e) => setEditName(e.target.value)} className="input-field" required autoFocus />
                </div>

                <div className="input-group">
                  <label className="input-label">Target Amount (MUR)</label>
                  <input type="text" placeholder="e.g. 100,000" value={editTarget} onChange={(e) => handleCurrencyChange(e.target.value, setEditTarget)} className="input-field num-input" required />
                </div>

                <div className="input-group">
                  <label className="input-label">Goal Priority</label>
                  <div style={{ display: 'flex', background: 'var(--nav-pill-bg)', padding: '3px', borderRadius: '9999px', gap: '3px' }}>
                    {(['low', 'medium', 'high'] as const).map((p) => {
                      const isActive = editPriority === p;
                      return (
                        <button key={p} type="button" onClick={() => setEditPriority(p)}
                          style={{ flex: 1, padding: '8px 0', borderRadius: '9999px', fontSize: '0.82rem', fontWeight: isActive ? 650 : 500, border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: isActive ? PRIORITY_COLORS[p].bg : 'transparent', color: isActive ? PRIORITY_COLORS[p].color : 'var(--ink-muted)', boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Auto-Allocation Advisor */}
                {(() => {
                  const otherContributions = getOtherBucketsContributionSum(editingBucket?.id);
                  const remaining = Math.max(0, coreDisposable - otherContributions);
                  let suggestedMax = getSuggestedMax(editPriority, remaining);
                  const targetVal = parseFloat(editTarget.replace(/,/g, '')) || 0;
                  const currentAccumulated = editingBucket ? editingBucket.current : 0;
                  const remainingTarget = Math.max(0, targetVal - currentAccumulated);
                  if (remainingTarget > 0 && suggestedMax > remainingTarget) suggestedMax = remainingTarget;
                  else if (remainingTarget === 0) suggestedMax = 0;
                  const currentMonthlyInput = parseFloat(editMonthly.replace(/,/g, '')) || 0;
                  const isExceeded = currentMonthlyInput > suggestedMax;
                  return (
                    <div style={{ background: 'var(--nav-pill-bg)', border: '1px solid var(--border-color)', borderRadius: '1rem', padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Auto-Allocation Advisor</span>
                        <button type="button" style={{ fontSize: '0.75rem', color: 'var(--emerald-gains)', fontWeight: 650, background: 'none', border: 'none', cursor: 'pointer' }}
                          onClick={() => setEditMonthly(suggestedMax.toLocaleString('en-US'))} disabled={suggestedMax <= 0}>
                          Apply Max (Rs. {suggestedMax.toLocaleString()})
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.78rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--ink-muted)' }}>Baseline:</span>
                          <span className="num" style={{ color: 'var(--ink-color)' }}>Rs. {baseSalary.toLocaleString()} − Rs. {leaseExpense.toLocaleString()} = Rs. {coreDisposable.toLocaleString()}</span>
                        </div>
                        {otherContributions > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--ink-muted)' }}>Other buckets:</span>
                            <span className="num" style={{ color: 'var(--coral-losses)' }}>−Rs. {otherContributions.toLocaleString()} / mo</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '5px', borderTop: '1px solid var(--border-color)', fontWeight: 600 }}>
                          <span style={{ color: 'var(--ink-color)' }}>Remaining Pool:</span>
                          <span className="num" style={{ color: 'var(--ink-color)' }}>Rs. {remaining.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--ink-muted)' }}>Suggested ({editPriority === 'high' ? '70%' : editPriority === 'medium' ? '35%' : '15%'}):</span>
                          <span className="num" style={{ color: 'var(--emerald-gains)', fontWeight: 650 }}>Rs. {suggestedMax.toLocaleString()} / mo</span>
                        </div>
                      </div>
                      {isExceeded && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', padding: '8px 10px', background: 'rgba(228,168,59,0.08)', border: '1px solid rgba(228,168,59,0.25)', borderRadius: '8px', fontSize: '0.75rem', color: '#B45309' }}>
                          <AlertCircle size={12} style={{ flexShrink: 0 }} /><span>Exceeds safe suggested monthly maximum.</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="input-group">
                  <label className="input-label">Monthly Contribution (MUR)</label>
                  <input type="text" placeholder="e.g. 5,000" value={editMonthly} onChange={(e) => handleCurrencyChange(e.target.value, setEditMonthly)} className="input-field num-input" />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '0.5rem' }}>
                  <button type="button"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '8px 14px', background: 'var(--coral-losses-bg)', color: 'var(--coral-losses)', border: '1px solid var(--coral-losses)', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => setShowDeleteConfirm(true)}>
                    <Trash2 size={13} /> Delete
                  </button>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setEditingBucket(null)}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Save Changes</button>
                  </div>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, CheckCircle2, Edit2, Trash2, AlertCircle } from 'lucide-react';

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-8"
    >
      <div className="flex justify-between align-start gap-4">
        <div className="flex flex-col gap-2" style={{ flex: 1 }}>
          <h1 className="serif-title" style={{ fontSize: '2.5rem', fontWeight: 400, fontStyle: 'italic', lineHeight: 1.1, marginBottom: '4px' }}>Savings Targets</h1>
          <p style={{ color: 'var(--ink-muted)' }}>
            Allocate funds to separate goal buckets. Monitor progress rings and timelines.
          </p>
        </div>
        <button className="btn btn-primary" style={{ flexShrink: 0, marginTop: '4px', whiteSpace: 'nowrap' }} onClick={() => setShowAddForm(true)}>
          <Plus size={16} /> New Bucket
        </button>
      </div>

      {/* General Balance Bar */}
      <div className="card flex justify-between align-center" style={{ backgroundColor: 'var(--card-bg)' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', fontWeight: 600 }}>AVAILABLE GENERAL CASH BALANCE</span>
          <h2 className="num" style={{ fontSize: '1.8rem', fontWeight: 550, marginTop: '2px' }}>
            Rs. {generalBalance.toLocaleString('en-US')}
          </h2>
        </div>
        <div style={{ color: 'var(--ink-light)', fontSize: '0.85rem' }}>
          Move general cash into goals below to reserve funds.
        </div>
      </div>

      {/* Grid of Buckets */}
      <div className="grid grid-2 gap-6">
        {buckets.map((bucket) => {
          const pct = Math.min(100, Math.max(0, (bucket.current / bucket.target) * 100));
          const strokeDashoffset = circumference - (pct / 100) * circumference;
          
          return (
            <div key={bucket.id} className="card flex flex-col justify-between" style={{ minHeight: '275px' }}>
              <div>
                <div className="flex justify-between align-start" style={{ marginBottom: 'var(--space-4)' }}>
                  <div>
                    <div className="flex align-center gap-2" style={{ flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 650, marginBottom: '2px' }}>{bucket.name}</h3>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => {
                          setEditingBucket(bucket);
                          setEditName(bucket.name);
                          setEditTarget(bucket.target.toLocaleString('en-US'));
                          setEditMonthly(bucket.monthlyContribution.toLocaleString('en-US'));
                          setEditPriority(bucket.priority || 'medium');
                          setShowDeleteConfirm(false);
                        }}
                        title="Edit Goal"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                    <div className="flex flex-col gap-1" style={{ marginTop: '2px' }}>
                      {bucket.priority && (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 6px',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          backgroundColor: bucket.priority === 'high' ? 'rgba(232, 93, 93, 0.06)' : bucket.priority === 'medium' ? 'rgba(245, 158, 11, 0.06)' : 'rgba(10, 10, 10, 0.04)',
                          color: bucket.priority === 'high' ? 'var(--coral-losses)' : bucket.priority === 'medium' ? '#B45309' : 'var(--ink-muted)',
                          width: 'fit-content',
                        }}>
                          <span style={{
                            width: '4px',
                            height: '4px',
                            borderRadius: '50%',
                            backgroundColor: bucket.priority === 'high' ? 'var(--coral-losses)' : bucket.priority === 'medium' ? '#F59E0B' : 'var(--ink-muted)',
                          }} />
                          {bucket.priority.toUpperCase()} PRIORITY
                        </div>
                      )}
                      <span className="num" style={{ fontSize: '0.78rem', color: 'var(--ink-light)' }}>
                        {calculateProjection(bucket.current, bucket.target, bucket.monthlyContribution)}
                      </span>
                    </div>
                  </div>
                  
                  {/* SVG progress ring */}
                  <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                    <svg width="80" height="80" viewBox="0 0 80 80">
                      <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        fill="transparent"
                        stroke="var(--border-color)"
                        strokeWidth="4"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        fill="transparent"
                        stroke="var(--emerald-gains)"
                        strokeWidth="4"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="progress-ring-circle"
                      />
                    </svg>
                    <div className="num" style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      fontSize: '0.85rem',
                      fontWeight: 650,
                    }}>
                      {Math.round(pct)}%
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1" style={{ marginTop: 'var(--space-2)' }}>
                  <div className="flex justify-between" style={{ fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--ink-muted)' }}>Accumulated</span>
                    <span className="num" style={{ fontWeight: 600 }}>Rs. {bucket.current.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between" style={{ fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--ink-muted)' }}>Target Goal</span>
                    <span className="num" style={{ fontWeight: 600 }}>Rs. {bucket.target.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between" style={{ fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--ink-muted)' }}>Monthly Share</span>
                    <span className="num" style={{ fontWeight: 600 }}>Rs. {bucket.monthlyContribution.toLocaleString()} / mo</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2" style={{ marginTop: 'var(--space-4)' }}>
                {bucket.current >= bucket.target ? (
                  <div className="flex align-center gap-1 text-gain" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                    <CheckCircle2 size={16} /> Goal Completed
                  </div>
                ) : (
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '8px 0', fontSize: '0.85rem' }}
                    onClick={() => {
                      setDepositBucketId(bucket.id);
                      setDepositAmount('');
                      setDepositError('');
                    }}
                  >
                    Transfer Cash
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Bucket Modal */}
      {showAddForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(10, 10, 10, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 'var(--space-4)',
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="card"
            style={{
              width: '100%',
              maxWidth: '400px',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 20px 40px rgba(0,0,0,0.06)',
            }}
          >
            <h3 className="serif-title" style={{ fontSize: '1.6rem', marginBottom: 'var(--space-4)' }}>Create Savings Bucket</h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="input-group">
                <label className="input-label">Bucket Label</label>
                <input
                  type="text"
                  placeholder="e.g. Emergency Fund, Japan Trip"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Target Amount (MUR)</label>
                <input
                  type="text"
                  placeholder="e.g. 100,000"
                  value={target}
                  onChange={(e) => handleCurrencyChange(e.target.value, setTarget)}
                  className="input-field num-input"
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Goal Importance / Priority</label>
                <div className="flex gap-2" style={{ marginTop: '4px' }}>
                  {(['low', 'medium', 'high'] as const).map((p) => {
                    const label = p.charAt(0).toUpperCase() + p.slice(1);
                    const isActive = priority === p;
                    const activeBg = p === 'high' ? 'rgba(232, 93, 93, 0.08)' : p === 'medium' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(10, 10, 10, 0.04)';
                    const activeBorder = p === 'high' ? 'var(--coral-losses)' : p === 'medium' ? 'var(--amber-warning)' : 'var(--border-color)';
                    const activeColor = p === 'high' ? 'var(--coral-losses)' : p === 'medium' ? '#B45309' : 'var(--ink-color)';
                    const dotColor = p === 'high' ? 'var(--coral-losses)' : p === 'medium' ? '#F59E0B' : 'var(--ink-muted)';
                    
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          backgroundColor: isActive ? activeBg : 'rgba(10, 10, 10, 0.01)',
                          border: `1px solid ${isActive ? activeBorder : 'var(--border-color)'}`,
                          color: isActive ? activeColor : 'var(--ink-muted)',
                        }}
                      >
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: dotColor,
                        }} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auto-Allocation Recommendation panel */}
              {(() => {
                const otherContributions = getOtherBucketsContributionSum();
                const remaining = Math.max(0, coreDisposable - otherContributions);
                let suggestedMax = getSuggestedMax(priority, remaining);

                // Cap the suggested maximum by the target amount to avoid over-allocating beyond the goal size
                const targetVal = parseFloat(target.replace(/,/g, '')) || 0;
                if (targetVal > 0 && suggestedMax > targetVal) {
                  suggestedMax = targetVal;
                }

                const currentMonthlyInput = parseFloat(monthly.replace(/,/g, '')) || 0;
                const isExceeded = currentMonthlyInput > suggestedMax;
                
                return (
                  <div className="card" style={{
                    backgroundColor: 'rgba(10, 10, 10, 0.02)',
                    border: '1px dashed var(--border-color)',
                    padding: '12px var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.82rem',
                    color: 'var(--ink-color)',
                  }}>
                    <div className="flex justify-between align-center" style={{ marginBottom: '8px' }}>
                      <strong style={{ fontWeight: 650, color: 'var(--ink-muted)' }}>Auto-Allocation Advisor</strong>
                      <button
                        type="button"
                        style={{
                          fontSize: '0.78rem',
                          background: 'none',
                          border: 'none',
                          color: 'var(--emerald-gains)',
                          textDecoration: 'underline',
                          cursor: suggestedMax > 0 ? 'pointer' : 'default',
                          opacity: suggestedMax > 0 ? 1 : 0.5,
                          padding: 0,
                          fontWeight: 600,
                        }}
                        onClick={() => setMonthly(suggestedMax.toLocaleString('en-US'))}
                        disabled={suggestedMax <= 0}
                      >
                        Apply Max (Rs. {suggestedMax.toLocaleString()})
                      </button>
                    </div>
                    
                    <div className="flex flex-col gap-1" style={{ color: 'var(--ink-muted)', fontSize: '0.78rem' }}>
                      <div className="flex justify-between">
                        <span>Baseline:</span>
                        <span className="num">Rs. {baseSalary.toLocaleString()} (Salary) - Rs. {leaseExpense.toLocaleString()} (Lease) = Rs. {coreDisposable.toLocaleString()}</span>
                      </div>
                      {otherContributions > 0 && (
                        <div className="flex justify-between">
                          <span>Other Buckets:</span>
                          <span className="num" style={{ color: 'var(--coral-losses)' }}>- Rs. {otherContributions.toLocaleString()} / mo</span>
                        </div>
                      )}
                      <div className="flex justify-between" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '4px', marginTop: '2px', fontWeight: 600 }}>
                        <span>Remaining Pool:</span>
                        <span className="num" style={{ color: 'var(--ink-color)' }}>Rs. {remaining.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between" style={{ marginTop: '2px' }}>
                        <span>Suggested ({priority === 'high' ? '70%' : priority === 'medium' ? '35%' : '15%'}):</span>
                        <span className="num" style={{ fontWeight: 650, color: 'var(--emerald-gains)' }}>Rs. {suggestedMax.toLocaleString()} / mo</span>
                      </div>
                    </div>

                    {isExceeded && (
                      <div style={{
                        backgroundColor: 'rgba(245, 158, 11, 0.05)',
                        border: '1px solid rgba(245, 158, 11, 0.15)',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        color: '#B45309',
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '10px',
                      }}>
                        <AlertCircle size={12} style={{ flexShrink: 0 }} />
                        <span>Warning: Exceeds safe suggested monthly maximum.</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="input-group">
                <label className="input-label">Monthly Target Contribution (MUR)</label>
                <input
                  type="text"
                  placeholder="e.g. 5,000"
                  value={monthly}
                  onChange={(e) => handleCurrencyChange(e.target.value, setMonthly)}
                  className="input-field num-input"
                />
              </div>

              <div className="flex justify-between" style={{ marginTop: 'var(--space-4)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Bucket
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Deposit to Bucket Modal */}
      {depositBucketId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(10, 10, 10, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 'var(--space-4)',
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="card"
            style={{
              width: '100%',
              maxWidth: '400px',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 20px 40px rgba(0,0,0,0.06)',
            }}
          >
            <h3 className="serif-title" style={{ fontSize: '1.6rem', marginBottom: 'var(--space-2)' }}>Transfer Cash to Bucket</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginBottom: 'var(--space-4)' }}>
              General cash will be deducted and allocated directly into this bucket.
            </p>
            
            <form onSubmit={handleDepositSubmit} className="flex flex-col gap-4">
              <div className="input-group">
                <label className="input-label">Transfer Amount (MUR)</label>
                <input
                  type="text"
                  placeholder="e.g. 10,000"
                  value={depositAmount}
                  onChange={(e) => {
                    handleCurrencyChange(e.target.value, setDepositAmount);
                    setDepositError('');
                  }}
                  className="input-field num-input"
                  required
                  autoFocus
                />
                <span className="num" style={{ fontSize: '0.78rem', color: 'var(--ink-light)', marginTop: '2px' }}>
                  Available: Rs. {generalBalance.toLocaleString()}
                </span>
              </div>

              {depositError && (
                <div style={{
                  backgroundColor: 'rgba(232, 93, 93, 0.05)',
                  border: '1px solid rgba(232, 93, 93, 0.15)',
                  padding: '10px var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--coral-losses)',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '-4px',
                }}>
                  <AlertCircle size={14} />
                  {depositError}
                </div>
              )}

              <div className="flex justify-between" style={{ marginTop: 'var(--space-4)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setDepositBucketId(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={!depositAmount || (parseFloat(depositAmount.replace(/,/g, '')) || 0) > generalBalance}>
                  Confirm Transfer
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Bucket Modal */}
      {editingBucket && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(10, 10, 10, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 'var(--space-4)',
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="card"
            style={{
              width: '100%',
              maxWidth: '400px',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 20px 40px rgba(0,0,0,0.06)',
            }}
          >
            {showDeleteConfirm ? (
              <div className="flex flex-col gap-4">
                <h3 className="serif-title text-loss" style={{ fontSize: '1.6rem', marginBottom: 'var(--space-1)' }}>Delete Goal Bucket?</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--ink-color)', lineHeight: 1.4 }}>
                  Are you sure you want to delete the goal bucket <strong>"{editingBucket.name}"</strong>?
                </p>
                <div style={{
                  backgroundColor: 'rgba(232, 93, 93, 0.04)',
                  border: '1px dashed var(--border-color)',
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  lineHeight: 1.4,
                  color: 'var(--ink-color)',
                }}>
                  <strong style={{ color: 'var(--coral-losses)' }}>Refund Policy:</strong> Accumulated savings of <span className="num" style={{ fontWeight: 650 }}>Rs. {editingBucket.current.toLocaleString()}</span> will be returned directly back into your General Cash Balance.
                </div>
                <div className="flex justify-between gap-3" style={{ marginTop: 'var(--space-4)' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowDeleteConfirm(false)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" style={{ flex: 1.5, backgroundColor: 'var(--coral-losses)', color: '#FFFFFF', border: 'none' }} onClick={handleDeleteSubmit}>
                    Confirm Delete
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
                <h3 className="serif-title" style={{ fontSize: '1.6rem', marginBottom: 'var(--space-2)' }}>Edit Savings Goal</h3>
                
                <div className="input-group">
                  <label className="input-label">Bucket Label</label>
                  <input
                    type="text"
                    placeholder="e.g. Emergency Fund"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Target Amount (MUR)</label>
                  <input
                    type="text"
                    placeholder="e.g. 100,000"
                    value={editTarget}
                    onChange={(e) => handleCurrencyChange(e.target.value, setEditTarget)}
                    className="input-field num-input"
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Goal Importance / Priority</label>
                  <div className="flex gap-2" style={{ marginTop: '4px' }}>
                    {(['low', 'medium', 'high'] as const).map((p) => {
                      const label = p.charAt(0).toUpperCase() + p.slice(1);
                      const isActive = editPriority === p;
                      const activeBg = p === 'high' ? 'rgba(232, 93, 93, 0.08)' : p === 'medium' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(10, 10, 10, 0.04)';
                      const activeBorder = p === 'high' ? 'var(--coral-losses)' : p === 'medium' ? 'var(--amber-warning)' : 'var(--border-color)';
                      const activeColor = p === 'high' ? 'var(--coral-losses)' : p === 'medium' ? '#B45309' : 'var(--ink-color)';
                      const dotColor = p === 'high' ? 'var(--coral-losses)' : p === 'medium' ? '#F59E0B' : 'var(--ink-muted)';
                      
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setEditPriority(p)}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            backgroundColor: isActive ? activeBg : 'rgba(10, 10, 10, 0.01)',
                            border: `1px solid ${isActive ? activeBorder : 'var(--border-color)'}`,
                            color: isActive ? activeColor : 'var(--ink-muted)',
                          }}
                        >
                          <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: dotColor,
                          }} />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Auto-Allocation Recommendation panel */}
                {(() => {
                  const otherContributions = getOtherBucketsContributionSum(editingBucket?.id);
                  const remaining = Math.max(0, coreDisposable - otherContributions);
                  let suggestedMax = getSuggestedMax(editPriority, remaining);

                  // Cap the suggested maximum by the remaining target to save (target - current accumulated)
                  const targetVal = parseFloat(editTarget.replace(/,/g, '')) || 0;
                  const currentAccumulated = editingBucket ? editingBucket.current : 0;
                  const remainingTarget = Math.max(0, targetVal - currentAccumulated);
                  if (remainingTarget > 0 && suggestedMax > remainingTarget) {
                    suggestedMax = remainingTarget;
                  } else if (remainingTarget === 0) {
                    suggestedMax = 0;
                  }

                  const currentMonthlyInput = parseFloat(editMonthly.replace(/,/g, '')) || 0;
                  const isExceeded = currentMonthlyInput > suggestedMax;
                  
                  return (
                    <div className="card" style={{
                      backgroundColor: 'rgba(10, 10, 10, 0.02)',
                      border: '1px dashed var(--border-color)',
                      padding: '12px var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.82rem',
                      color: 'var(--ink-color)',
                    }}>
                      <div className="flex justify-between align-center" style={{ marginBottom: '8px' }}>
                        <strong style={{ fontWeight: 650, color: 'var(--ink-muted)' }}>Auto-Allocation Advisor</strong>
                        <button
                          type="button"
                          style={{
                            fontSize: '0.78rem',
                            background: 'none',
                            border: 'none',
                            color: 'var(--emerald-gains)',
                            textDecoration: 'underline',
                            cursor: suggestedMax > 0 ? 'pointer' : 'default',
                            opacity: suggestedMax > 0 ? 1 : 0.5,
                            padding: 0,
                            fontWeight: 600,
                          }}
                          onClick={() => setEditMonthly(suggestedMax.toLocaleString('en-US'))}
                          disabled={suggestedMax <= 0}
                        >
                          Apply Max (Rs. {suggestedMax.toLocaleString()})
                        </button>
                      </div>
                      
                      <div className="flex flex-col gap-1" style={{ color: 'var(--ink-muted)', fontSize: '0.78rem' }}>
                        <div className="flex justify-between">
                          <span>Baseline:</span>
                          <span className="num">Rs. {baseSalary.toLocaleString()} (Salary) - Rs. {leaseExpense.toLocaleString()} (Lease) = Rs. {coreDisposable.toLocaleString()}</span>
                        </div>
                        {otherContributions > 0 && (
                          <div className="flex justify-between">
                            <span>Other Buckets:</span>
                            <span className="num" style={{ color: 'var(--coral-losses)' }}>- Rs. {otherContributions.toLocaleString()} / mo</span>
                          </div>
                        )}
                        <div className="flex justify-between" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '4px', marginTop: '2px', fontWeight: 600 }}>
                          <span>Remaining Pool:</span>
                          <span className="num" style={{ color: 'var(--ink-color)' }}>Rs. {remaining.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between" style={{ marginTop: '2px' }}>
                          <span>Suggested ({editPriority === 'high' ? '70%' : editPriority === 'medium' ? '35%' : '15%'}):</span>
                          <span className="num" style={{ fontWeight: 650, color: 'var(--emerald-gains)' }}>Rs. {suggestedMax.toLocaleString()} / mo</span>
                        </div>
                      </div>

                      {isExceeded && (
                        <div style={{
                          backgroundColor: 'rgba(245, 158, 11, 0.05)',
                          border: '1px solid rgba(245, 158, 11, 0.15)',
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-sm)',
                          color: '#B45309',
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '10px',
                        }}>
                          <AlertCircle size={12} style={{ flexShrink: 0 }} />
                          <span>Warning: Exceeds safe suggested monthly maximum.</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="input-group">
                  <label className="input-label">Monthly Target Contribution (MUR)</label>
                  <input
                    type="text"
                    placeholder="e.g. 5,000"
                    value={editMonthly}
                    onChange={(e) => handleCurrencyChange(e.target.value, setEditMonthly)}
                    className="input-field num-input"
                  />
                </div>

                <div className="flex justify-between align-center" style={{ marginTop: 'var(--space-2)' }}>
                  <button type="button" className="btn btn-text text-loss" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', paddingLeft: 0 }} onClick={() => setShowDeleteConfirm(true)}>
                    <Trash2 size={14} /> Delete Bucket
                  </button>
                  
                  <div className="flex gap-2">
                    <button type="button" className="btn btn-secondary" onClick={() => setEditingBucket(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Save Changes
                    </button>
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

import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Plus, Calendar, TrendingUp, Edit2, ChevronDown, Search } from 'lucide-react';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
}

interface DashboardProps {
  income: number;
  balance: number;
  generalBalance: number;
  onUpdateGeneralBalance: (newBalance: number) => void;
  goal: string;
  transactions: Transaction[];
  onAddTransaction: (desc: string, amount: number, type: 'income' | 'expense', category: string) => void;
  savingsRate: number;
}

// Custom Motion Count-up Component
const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => 
    Math.round(latest).toLocaleString('en-US')
  );

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.8,
      ease: [0.16, 1, 0.3, 1], // Slow, confident easing
    });
    return controls.stop;
  }, [value, count]);

  return <motion.span className="num">{rounded}</motion.span>;
};

export const Dashboard: React.FC<DashboardProps> = ({
  income,
  balance,
  generalBalance,
  onUpdateGeneralBalance,
  goal,
  transactions,
  onAddTransaction,
  savingsRate,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('');

  // Balance adjust modal states
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [newBalanceInput, setNewBalanceInput] = useState('');

  // Category select dropdown states
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Calculate totals
  const totalIn = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalOut = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  
  // Suggested categories based on type
  const categories = type === 'income' 
    ? ['Salary', 'Freelance', 'Investments', 'Other In']
    : ['Rent & Housing', 'Groceries', 'Utilities', 'Dining Out', 'Leisure', 'Transport', 'Other Out'];

  useEffect(() => {
    if (categories.length > 0 && !category) {
      setCategory(categories[0]);
    }
  }, [type, category]);

  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType);
    const defaultCats = newType === 'income' 
      ? ['Salary', 'Freelance', 'Investments', 'Other In']
      : ['Rent & Housing', 'Groceries', 'Utilities', 'Dining Out', 'Leisure', 'Transport', 'Other Out'];
    setCategory(defaultCats[0]);
    setSearchQuery('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !amount) return;
    const parsedAmount = parseFloat(amount.replace(/,/g, '')) || 0;
    onAddTransaction(desc, parsedAmount, type, category);
    setDesc('');
    setAmount('');
    setSearchQuery('');
    setShowAddModal(false);
  };

  const handleSaveBalanceAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedBalance = parseFloat(newBalanceInput.replace(/,/g, '')) || 0;
    onUpdateGeneralBalance(parsedBalance);
    setShowAdjustModal(false);
  };

  const getGoalLabel = (g: string) => {
    switch (g) {
      case 'save': return 'Save Money';
      case 'invest': return 'Grow Investments';
      case 'debt': return 'Pay Off Debt';
      case 'wealth': return 'Build Wealth';
      default: return 'Finance Focus';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-6"
    >
      {/* Hero Net Worth Section */}
      <div className="card" style={{
        padding: 'var(--space-8) var(--space-6)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 'var(--space-2)',
        backgroundColor: '#FFFFFF',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Soft emerald pulse glow positioned directly behind the hero net worth */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '250px',
          height: '150px',
          background: 'radial-gradient(circle, rgba(15, 122, 92, 0.05) 0%, rgba(255, 255, 255, 0) 70%)',
          pointerEvents: 'none',
          zIndex: -1,
        }} />
        
        <div className="flex align-center justify-center gap-2" style={{ position: 'relative', width: '100%' }}>
          <span className="card-title" style={{ margin: 0 }}>NET WORTH</span>
          <button 
            type="button" 
            onClick={() => {
              setNewBalanceInput(generalBalance.toLocaleString('en-US'));
              setShowAdjustModal(true);
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: '2px',
              cursor: 'pointer',
              color: 'var(--ink-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.6,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
            title="Adjust Available Cash"
          >
            <Edit2 size={12} />
          </button>
        </div>
        <div className="flex align-center justify-center gap-2">
          <span className="serif-title" style={{ fontSize: '2.5rem', fontStyle: 'italic', fontWeight: 300, color: 'var(--ink-light)', marginTop: '-8px' }}>
            Rs.
          </span>
          <h1 className="hero-num">
            <AnimatedNumber value={balance} />
          </h1>
        </div>
        <div className="flex align-center gap-2" style={{ marginTop: 'var(--space-2)' }}>
          <span className="badge badge-gain">
            <TrendingUp size={12} style={{ marginRight: '4px' }} /> Focus: {getGoalLabel(goal)}
          </span>
        </div>
      </div>

      {/* Cash Flow and Savings rate Grid */}
      <div className="grid grid-2 gap-6">
        {/* Monthly Cash Flow Card */}
        <div className="card flex flex-col justify-between" style={{ minHeight: '220px' }}>
          <div>
            <div className="card-title">Monthly Cash Flow</div>
            <div className="flex justify-between align-center" style={{ marginBottom: 'var(--space-6)' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>Inflow</span>
                <h3 className="num" style={{ fontSize: '1.25rem', fontWeight: 600 }}>Rs. {(income + totalIn).toLocaleString('en-US')}</h3>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>Outflow</span>
                <h3 className="num" style={{ fontSize: '1.25rem', fontWeight: 600 }}>Rs. {totalOut.toLocaleString('en-US')}</h3>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <div style={{
              height: '4px',
              width: '100%',
              backgroundColor: 'var(--border-color)',
              borderRadius: '2px',
              overflow: 'hidden',
              display: 'flex',
            }}>
              <div style={{
                height: '100%',
                backgroundColor: 'var(--emerald-gains)',
                width: `${(income + totalIn) > 0 ? Math.min(100, ((income + totalIn) / ((income + totalIn) + totalOut)) * 100) : 50}%`,
              }} />
              <div style={{
                height: '100%',
                backgroundColor: 'var(--coral-losses)',
                width: `${totalOut > 0 ? Math.min(100, (totalOut / ((income + totalIn) + totalOut)) * 100) : 50}%`,
              }} />
            </div>
            <div className="flex justify-between" style={{ fontSize: '0.78rem', color: 'var(--ink-light)' }}>
              <span>{(income + totalIn) > 0 ? Math.round(((income + totalIn) / ((income + totalIn) + totalOut)) * 100) : 50}% In</span>
              <span>{totalOut > 0 ? Math.round((totalOut / ((income + totalIn) + totalOut)) * 100) : 50}% Out</span>
            </div>
          </div>
        </div>

        {/* Savings Rate Card */}
        <div className="card flex flex-col justify-between" style={{ minHeight: '220px' }}>
          <div>
            <div className="card-title">Savings Rate</div>
            <div className="flex align-center gap-4">
              <h2 className="num" style={{ fontSize: '3rem', fontWeight: 400, letterSpacing: '-0.04em', lineHeight: 1 }}>
                {Math.round(savingsRate)}%
              </h2>
              <span className="badge badge-gain" style={{ height: 'fit-content' }}>
                {savingsRate >= 20 ? 'Optimal' : 'Healthy'}
              </span>
            </div>
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', marginTop: 'var(--space-2)' }}>
              You are retaining Rs. {Math.max(0, (income + totalIn - totalOut)).toLocaleString('en-US')} of your income this month.
            </p>
          </div>

          <div style={{ width: '100%', position: 'relative', height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, savingsRate))}%` }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              style={{
                height: '100%',
                backgroundColor: 'var(--emerald-gains)',
                borderRadius: '4px',
              }}
            />
          </div>
        </div>
      </div>

      {/* Snapshot / Transactions list */}
      <div className="card">
        <div className="flex justify-between align-center" style={{ marginBottom: 'var(--space-4)' }}>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '0.85rem' }} 
            onClick={() => {
              setDesc('');
              setAmount('');
              setType('expense');
              setCategory('Rent & Housing');
              setSearchQuery('');
              setShowAddModal(true);
            }}
          >
            <Plus size={14} /> Log Transaction
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="flex flex-col align-center justify-center" style={{ padding: 'var(--space-8) 0', color: 'var(--ink-light)', gap: 'var(--space-2)' }}>
            <Calendar size={24} style={{ opacity: 0.5 }} />
            <p style={{ fontSize: '0.9rem' }}>No logged entries for this month yet.</p>
          </div>
        ) : (
          <div className="flex flex-col" style={{ borderTop: '1px solid var(--border-color)' }}>
            {transactions.map((tx) => (
              <div key={tx.id} className="flex justify-between align-center" style={{
                padding: 'var(--space-4) 0',
                borderBottom: '1px solid var(--border-color)',
              }}>
                <div className="flex flex-col">
                  <span style={{ fontWeight: 550, fontSize: '0.95rem' }}>{tx.description}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                    {tx.category} • {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex align-center gap-2">
                  <span className={`num ${tx.type === 'income' ? 'text-gain' : 'text-loss'}`} style={{ fontWeight: 600 }}>
                    {tx.type === 'income' ? '+' : '-'} Rs. {tx.amount.toLocaleString('en-US')}
                  </span>
                  {tx.type === 'income' ? (
                    <ArrowUpRight size={14} className="text-gain" />
                  ) : (
                    <ArrowDownRight size={14} className="text-loss" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
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
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="card"
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: 'var(--space-6)',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 20px 40px rgba(0,0,0,0.06)',
              overflow: 'visible',
            }}
          >
            <h3 className="serif-title" style={{ fontSize: '1.6rem', marginBottom: 'var(--space-4)' }}>Log Entry</h3>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="input-group">
                <label className="input-label">Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn"
                    style={{
                      flex: 1,
                      backgroundColor: type === 'expense' ? 'var(--ink-color)' : 'var(--bg-color)',
                      color: type === 'expense' ? 'var(--bg-color)' : 'var(--ink-color)',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.85rem',
                      padding: '8px 0',
                    }}
                    onClick={() => handleTypeChange('expense')}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    className="btn"
                    style={{
                      flex: 1,
                      backgroundColor: type === 'income' ? 'var(--ink-color)' : 'var(--bg-color)',
                      color: type === 'income' ? 'var(--bg-color)' : 'var(--ink-color)',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.85rem',
                      padding: '8px 0',
                    }}
                    onClick={() => handleTypeChange('income')}
                  >
                    Income
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Weekly Groceries"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Amount (MUR)</label>
                <input
                  type="text"
                  placeholder="2,500"
                  value={amount}
                  onChange={(e) => handleCurrencyChange(e.target.value, setAmount)}
                  className="input-field num-input"
                  required
                />
              </div>

              <div className="input-group" style={{ position: 'relative' }}>
                <label className="input-label">Category</label>
                <button
                  type="button"
                  className="input-field flex justify-between align-center"
                  style={{
                    background: 'var(--bg-color)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 'var(--space-3) var(--space-4)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    width: '100%',
                  }}
                  onClick={() => {
                    setDropdownOpen(!dropdownOpen);
                    setSearchQuery('');
                  }}
                >
                  <span style={{ fontWeight: 550 }}>{category || 'Select category'}</span>
                  <ChevronDown size={16} style={{ color: 'var(--ink-muted)', transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

                {dropdownOpen && (
                  <>
                    <div
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 99,
                      }}
                      onClick={() => setDropdownOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.98 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid rgba(10, 10, 10, 0.08)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: '0 8px 24px rgba(10, 10, 10, 0.08)',
                        zIndex: 100,
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      {/* Search Input */}
                      <div className="flex align-center gap-2" style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        backgroundColor: 'var(--bg-color)',
                      }}>
                        <Search size={14} style={{ color: 'var(--ink-muted)' }} />
                        <input
                          type="text"
                          placeholder="Search or type custom..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          style={{
                            border: 'none',
                            outline: 'none',
                            background: 'transparent',
                            fontSize: '0.85rem',
                            width: '100%',
                            color: 'var(--ink-color)',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      {/* Suggestions list */}
                      <div style={{ maxHeight: '150px', overflowY: 'auto' }} className="flex flex-col gap-1">
                        {/* Custom option if query doesn't match */}
                        {searchQuery.trim() !== '' && !categories.some(c => c.toLowerCase() === searchQuery.trim().toLowerCase()) && (
                          <button
                            type="button"
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '8px 10px',
                              border: 'none',
                              background: 'rgba(15, 122, 92, 0.05)',
                              color: 'var(--emerald-gains)',
                              fontSize: '0.82rem',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                            onClick={() => {
                              setCategory(searchQuery.trim());
                              setDropdownOpen(false);
                            }}
                          >
                            + Create "{searchQuery.trim()}"
                          </button>
                        )}

                        {categories
                          .filter(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((c) => {
                            const isSelected = category === c;
                            return (
                              <button
                                key={c}
                                type="button"
                                style={{
                                  width: '100%',
                                  textAlign: 'left',
                                  padding: '8px 10px',
                                  border: 'none',
                                  background: isSelected ? 'rgba(10, 10, 10, 0.04)' : 'none',
                                  color: 'var(--ink-color)',
                                  fontSize: '0.82rem',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  transition: 'background 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(10, 10, 10, 0.02)';
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                                onClick={() => {
                                  setCategory(c);
                                  setDropdownOpen(false);
                                }}
                              >
                                <span style={{ fontWeight: isSelected ? 600 : 400 }}>{c}</span>
                              </button>
                            );
                          })}
                      </div>
                    </motion.div>
                  </>
                )}
              </div>

              <div className="flex justify-between" style={{ marginTop: 'var(--space-4)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Log Entry
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {/* Adjust Cash Modal */}
      {showAdjustModal && (
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
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="card"
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: 'var(--space-6)',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 20px 40px rgba(0,0,0,0.06)',
            }}
          >
            <h3 className="serif-title" style={{ fontSize: '1.6rem', marginBottom: 'var(--space-2)' }}>Adjust Available Cash</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', marginBottom: 'var(--space-4)', lineHeight: 1.4 }}>
              Manually adjust the cash held in your bank account. Your total Net Worth will be updated dynamically below.
            </p>

            <form onSubmit={handleSaveBalanceAdjust} className="flex flex-col gap-4">
              <div className="input-group">
                <label className="input-label">Available Bank Cash (MUR)</label>
                <input
                  type="text"
                  placeholder="e.g. 50,000"
                  value={newBalanceInput}
                  onChange={(e) => handleCurrencyChange(e.target.value, setNewBalanceInput)}
                  className="input-field num-input"
                  required
                  autoFocus
                />
              </div>

              <div style={{
                backgroundColor: 'var(--bg-color)',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div className="flex justify-between" style={{ fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--ink-muted)' }}>Other Assets:</span>
                  <span className="num" style={{ fontWeight: 550 }}>
                    Rs. {Math.max(0, balance - generalBalance).toLocaleString('en-US')}
                  </span>
                </div>
                <div className="flex justify-between" style={{ fontSize: '0.85rem', paddingTop: '4px', borderTop: '1px solid var(--border-color)' }}>
                  <span style={{ fontWeight: 600 }}>Forecasted Net Worth:</span>
                  <span className="num" style={{ fontWeight: 700, color: 'var(--emerald-gains)' }}>
                    Rs. {((parseFloat(newBalanceInput.replace(/,/g, '')) || 0) + Math.max(0, balance - generalBalance)).toLocaleString('en-US')}
                  </span>
                </div>
              </div>

              <div className="flex justify-between" style={{ marginTop: 'var(--space-4)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdjustModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Balance
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

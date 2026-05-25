import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Edit2, ChevronDown, Search } from 'lucide-react';

interface RecurringItem {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
}

interface CashFlowProps {
  incomeItems: RecurringItem[];
  expenseItems: RecurringItem[];
  onAddRecurring: (desc: string, amount: number, type: 'income' | 'expense', category: string) => void;
  onRemoveRecurring: (id: string) => void;
  onUpdateRecurring: (id: string, desc: string, amount: number, type: 'income' | 'expense', category: string) => void;
}

const STANDARD_CATEGORIES = {
  needs: ['Rent', 'Lease', 'Groceries', 'Utilities', 'Transport', 'Insurance', 'Medical', 'Other Need'],
  wants: ['Dining Out', 'Leisure', 'Subscriptions', 'Gym & Fitness', 'Shopping', 'Travel', 'Other Want'],
  savings: ['SIP & Investment', 'Pension & Retirement', 'Emergency Fund', 'Other Saving'],
};

const parseCategory = (cat: string) => {
  if (!cat) return { classification: 'needs', name: 'Needs' };
  if (cat.includes(':')) {
    const [classification, name] = cat.split(':');
    return { classification, name };
  }
  return { classification: cat, name: cat.charAt(0).toUpperCase() + cat.slice(1) };
};

const renderCategoryDisplay = (catString: string) => {
  const { classification, name } = parseCategory(catString);
  if (catString === 'income') return 'Income';
  return (
    <div className="flex align-center justify-between" style={{ width: '100%', gap: '8px' }}>
      <span style={{ fontWeight: 500 }}>{name}</span>
      <span style={{
        fontSize: '0.65rem',
        color: classification === 'needs' ? 'var(--coral-losses)' : classification === 'wants' ? '#e2a83b' : 'var(--emerald-gains)',
        textTransform: 'uppercase',
        fontWeight: 700,
        letterSpacing: '0.04em',
        padding: '2px 6px',
        borderRadius: '4px',
        backgroundColor: 'rgba(10, 10, 10, 0.03)',
      }}>
        {classification}
      </span>
    </div>
  );
};

export const CashFlow: React.FC<CashFlowProps> = ({
  incomeItems,
  expenseItems,
  onAddRecurring,
  onRemoveRecurring,
  onUpdateRecurring,
}) => {
  // 50/30/20 customization
  const [needsPct, setNeedsPct] = useState(50);
  const [wantsPct, setWantsPct] = useState(30);
  const [savingsPct, setSavingsPct] = useState(20);

  // New item form
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState<string>('needs:Other Need');

  // Custom dropdown states
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'needs' | 'wants' | 'savings'>('needs');

  // Edit and Delete states
  const [editingItem, setEditingItem] = useState<RecurringItem | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Salary breakdown state
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salaryBaseInput, setSalaryBaseInput] = useState('');
  const [salaryTransportInput, setSalaryTransportInput] = useState('');
  const [salaryMraInput, setSalaryMraInput] = useState('');

  // Extract base salary, transport allowance, and MRA money from income items
  const baseItem = incomeItems.find(i => i.description.toLowerCase().includes('base salary') || i.description.toLowerCase().includes('corporate salary'));
  const transportItem = incomeItems.find(i => i.description.toLowerCase().includes('transport'));
  const mraItem = incomeItems.find(i => i.description.toLowerCase().includes('mra'));

  const baseVal = baseItem ? baseItem.amount : (incomeItems.length === 1 && !transportItem && !mraItem ? incomeItems[0].amount : 0);
  const transportVal = transportItem ? transportItem.amount : 0;
  const mraVal = mraItem ? mraItem.amount : 0;

  const openSalaryModal = () => {
    setSalaryBaseInput(baseVal.toLocaleString('en-US'));
    setSalaryTransportInput(transportVal.toLocaleString('en-US'));
    setSalaryMraInput(mraVal.toLocaleString('en-US'));
    setShowSalaryModal(true);
  };

  const handleSaveSalaryBreakdown = (e: React.FormEvent) => {
    e.preventDefault();
    const newBase = parseFloat(salaryBaseInput.replace(/,/g, '')) || 0;
    const newTransport = parseFloat(salaryTransportInput.replace(/,/g, '')) || 0;
    const newMra = parseFloat(salaryMraInput.replace(/,/g, '')) || 0;

    // Remove any existing salary items
    const itemsToRemove = incomeItems.filter(item => 
      item.description.toLowerCase().includes('base salary') ||
      item.description.toLowerCase().includes('corporate salary') ||
      item.description.toLowerCase().includes('transport') ||
      item.description.toLowerCase().includes('mra')
    );

    // Call removal
    itemsToRemove.forEach(item => onRemoveRecurring(item.id));

    // Add new items
    if (newBase > 0) {
      onAddRecurring("Base Salary", newBase, "income", "income");
    }
    if (newTransport > 0) {
      onAddRecurring("Transport Allowance", newTransport, "income", "income");
    }
    if (newMra > 0) {
      onAddRecurring("MRA Allowance (10th/11th)", newMra, "income", "income");
    }

    setShowSalaryModal(false);
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

  // Sums
  const totalIncome = incomeItems.reduce((acc, item) => acc + item.amount, 0);
  const totalExpenses = expenseItems.reduce((acc, item) => acc + item.amount, 0);
  const disposableIncome = Math.max(0, totalIncome - totalExpenses);

  // Handle slider changes with auto-balance (to sum to 100%)
  const handleSliderChange = (slider: 'needs' | 'wants' | 'savings', val: number) => {
    if (slider === 'needs') {
      const remaining = 100 - val;
      const totalOthers = wantsPct + savingsPct;
      if (totalOthers === 0) {
        setNeedsPct(val);
        setWantsPct(remaining / 2);
        setSavingsPct(remaining / 2);
      } else {
        setNeedsPct(val);
        setWantsPct(Math.round((wantsPct / totalOthers) * remaining));
        setSavingsPct(100 - val - Math.round((wantsPct / totalOthers) * remaining));
      }
    } else if (slider === 'wants') {
      const remaining = 100 - val;
      const totalOthers = needsPct + savingsPct;
      if (totalOthers === 0) {
        setWantsPct(val);
        setNeedsPct(remaining / 2);
        setSavingsPct(remaining / 2);
      } else {
        setWantsPct(val);
        setNeedsPct(Math.round((needsPct / totalOthers) * remaining));
        setSavingsPct(100 - val - Math.round((needsPct / totalOthers) * remaining));
      }
    } else {
      const remaining = 100 - val;
      const totalOthers = needsPct + wantsPct;
      if (totalOthers === 0) {
        setSavingsPct(val);
        setNeedsPct(remaining / 2);
        setWantsPct(remaining / 2);
      } else {
        setSavingsPct(val);
        setNeedsPct(Math.round((needsPct / totalOthers) * remaining));
        setWantsPct(100 - val - Math.round((needsPct / totalOthers) * remaining));
      }
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !amount) return;
    const parsedAmount = parseFloat(amount.replace(/,/g, '')) || 0;
    const targetCategory = type === 'income' ? 'income' : category;
    
    if (editingItem) {
      onUpdateRecurring(editingItem.id, desc, parsedAmount, type, targetCategory);
      setEditingItem(null);
    } else {
      onAddRecurring(desc, parsedAmount, type, targetCategory);
    }
    
    setDesc('');
    setAmount('');
  };

  const startEdit = (item: RecurringItem) => {
    setEditingItem(item);
    setDesc(item.description);
    setAmount(item.amount.toLocaleString('en-US'));
    setType(item.type);
    setCategory(item.category);
    
    const parsed = parseCategory(item.category);
    setSearchQuery(parsed.name === 'Needs' || parsed.name === 'Wants' || parsed.name === 'Savings' ? '' : parsed.name);
    if (parsed.classification !== 'income') {
      setActiveTab(parsed.classification as any);
    }
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setDesc('');
    setAmount('');
    setType('expense');
    setCategory('needs:Other Need');
    setSearchQuery('');
  };

  // Calculations for Actuals vs Suggestions
  const suggestedNeeds = (totalIncome * needsPct) / 100;
  const suggestedWants = (totalIncome * wantsPct) / 100;
  const suggestedSavings = (totalIncome * savingsPct) / 100;

  const actualNeeds = expenseItems.filter(e => parseCategory(e.category).classification === 'needs').reduce((acc, e) => acc + e.amount, 0);
  const actualWants = expenseItems.filter(e => parseCategory(e.category).classification === 'wants').reduce((acc, e) => acc + e.amount, 0);
  const actualSavings = expenseItems.filter(e => parseCategory(e.category).classification === 'savings').reduce((acc, e) => acc + e.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-8"
    >
      <div className="flex flex-col gap-2">
        <h1 className="serif-title" style={{ fontSize: '2.5rem', fontWeight: 400, fontStyle: 'italic' }}>Cash Flow Planner</h1>
        <p style={{ color: 'var(--ink-muted)' }}>
          Review your recurring allocations, adjust your budget boundaries, and unlock disposable cash.
        </p>
      </div>

      {/* Top Summaries Row */}
      <div className="grid grid-2 gap-6">
        {/* Disposable Income Card */}
        <div className="card flex flex-col justify-between" style={{ backgroundColor: 'var(--card-bg)' }}>
          <div className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Cash Flow Summary</div>
          
          <div className="flex flex-col gap-3">
            <div className="flex justify-between align-center" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-2)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>Total Inflows</span>
              <span className="num text-gain" style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                Rs. {totalIncome.toLocaleString('en-US')}
              </span>
            </div>
            <div className="flex justify-between align-center" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-2)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>Total Outflows</span>
              <span className="num text-loss" style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                Rs. {totalExpenses.toLocaleString('en-US')}
              </span>
            </div>
            <div className="flex justify-between align-center">
              <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', fontWeight: 600 }}>Disposable Cash</span>
              <span className="num" style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                Rs. {disposableIncome.toLocaleString('en-US')}
              </span>
            </div>
          </div>
        </div>

        {/* Salary Breakdown Card */}
        <div className="card flex flex-col justify-between" style={{ backgroundColor: 'var(--card-bg)' }}>
          <div>
            <div className="flex justify-between align-center">
              <span className="card-title" style={{ margin: 0 }}>Salary Components</span>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '2px 8px', fontSize: '0.75rem' }} 
                onClick={openSalaryModal}
              >
                Configure Breakdown
              </button>
            </div>
            
            <div style={{ marginTop: 'var(--space-2)' }}>
              <h2 className="num" style={{ fontSize: '1.5rem', fontWeight: 650 }}>
                Rs. {(baseVal + transportVal + mraVal).toLocaleString('en-US')}
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>Combined monthly salary package</span>
            </div>

            {/* Stacked Proportional Progress Bar */}
            {(baseVal + transportVal + mraVal) > 0 ? (
              <div style={{ 
                display: 'flex', 
                height: '8px', 
                borderRadius: '4px', 
                overflow: 'hidden', 
                marginTop: 'var(--space-3)', 
                marginBottom: 'var(--space-3)',
                backgroundColor: 'var(--border-color)' 
              }}>
                {baseVal > 0 && (
                  <div style={{ 
                    width: `${(baseVal / (baseVal + transportVal + mraVal)) * 100}%`, 
                    backgroundColor: 'var(--ink-color)' 
                  }} title={`Base Salary: ${((baseVal / (baseVal + transportVal + mraVal)) * 100).toFixed(0)}%`} />
                )}
                {transportVal > 0 && (
                  <div style={{ 
                    width: `${(transportVal / (baseVal + transportVal + mraVal)) * 100}%`, 
                    backgroundColor: 'var(--emerald-gains)' 
                  }} title={`Transport Allowance: ${((transportVal / (baseVal + transportVal + mraVal)) * 100).toFixed(0)}%`} />
                )}
                {mraVal > 0 && (
                  <div style={{ 
                    width: `${(mraVal / (baseVal + transportVal + mraVal)) * 100}%`, 
                    backgroundColor: '#3B82F6' 
                  }} title={`MRA Allowance: ${((mraVal / (baseVal + transportVal + mraVal)) * 100).toFixed(0)}%`} />
                )}
              </div>
            ) : (
              <div style={{ height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', marginTop: 'var(--space-3)', marginBottom: 'var(--space-3)' }} />
            )}

            {/* Breakdown items list */}
            <div className="flex flex-col gap-2" style={{ fontSize: '0.82rem' }}>
              <div className="flex justify-between align-center">
                <div className="flex align-center gap-2">
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--ink-color)' }} />
                  <span style={{ color: 'var(--ink-muted)' }}>Base Salary</span>
                </div>
                <span className="num" style={{ fontWeight: 600 }}>Rs. {baseVal.toLocaleString('en-US')}</span>
              </div>
              <div className="flex justify-between align-center">
                <div className="flex align-center gap-2">
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--emerald-gains)' }} />
                  <span style={{ color: 'var(--ink-muted)' }}>Transport Allowance</span>
                </div>
                <span className="num" style={{ fontWeight: 600 }}>Rs. {transportVal.toLocaleString('en-US')}</span>
              </div>
              <div className="flex justify-between align-center">
                <div className="flex align-center gap-2">
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B82F6' }} />
                  <span style={{ color: 'var(--ink-muted)' }}>MRA Money</span>
                </div>
                <div className="flex align-center gap-2">
                  <span style={{ fontSize: '0.72rem', color: '#3B82F6', fontWeight: 555, backgroundColor: 'rgba(59, 130, 246, 0.08)', padding: '1px 6px', borderRadius: '4px' }}>10th/11th</span>
                  <span className="num" style={{ fontWeight: 600 }}>Rs. {mraVal.toLocaleString('en-US')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Budget rule configuration */}
      <div className="grid grid-2 gap-6">
        {/* Sliders Card */}
        <div className="card flex flex-col justify-between" style={{ minHeight: '340px' }}>
          <div>
            <div className="card-title">Custom Allocation Rule</div>
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', marginBottom: 'var(--space-4)' }}>
              Adjust target parameters to split income. Sliders balance to total 100%.
            </p>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col">
                <div className="flex justify-between align-center" style={{ fontSize: '0.9rem', fontWeight: 550 }}>
                  <span>Needs (Essential)</span>
                  <span className="num">{needsPct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={needsPct}
                  onChange={(e) => handleSliderChange('needs', parseInt(e.target.value))}
                  className="custom-slider"
                />
              </div>

              <div className="flex flex-col">
                <div className="flex justify-between align-center" style={{ fontSize: '0.9rem', fontWeight: 550 }}>
                  <span>Wants (Lifestyle)</span>
                  <span className="num">{wantsPct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={wantsPct}
                  onChange={(e) => handleSliderChange('wants', parseInt(e.target.value))}
                  className="custom-slider"
                />
              </div>

              <div className="flex flex-col">
                <div className="flex justify-between align-center" style={{ fontSize: '0.9rem', fontWeight: 550 }}>
                  <span>Savings / Invest</span>
                  <span className="num">{savingsPct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={savingsPct}
                  onChange={(e) => handleSliderChange('savings', parseInt(e.target.value))}
                  className="custom-slider"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Visual Allocation Target Comparison */}
        <div className="card flex flex-col justify-between" style={{ minHeight: '340px' }}>
          <div>
            <div className="card-title">Target vs. Actual Outflows</div>
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', marginBottom: 'var(--space-6)' }}>
              How your current monthly commitments align with your target rule.
            </p>

            <div className="flex flex-col gap-4">
              {/* Needs comparison */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between" style={{ fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 550 }}>Needs</span>
                  <span className="num" style={{ color: actualNeeds > suggestedNeeds ? 'var(--coral-losses)' : 'var(--ink-muted)' }}>
                    Rs. {actualNeeds.toLocaleString()} / Rs. {suggestedNeeds.toLocaleString()}
                  </span>
                </div>
                <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    height: '100%',
                    backgroundColor: actualNeeds > suggestedNeeds ? 'var(--coral-losses)' : 'var(--ink-color)',
                    width: `${Math.min(100, (actualNeeds / (suggestedNeeds || 1)) * 100)}%`,
                    borderRadius: '3px',
                  }} />
                </div>
              </div>

              {/* Wants comparison */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between" style={{ fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 550 }}>Wants</span>
                  <span className="num" style={{ color: actualWants > suggestedWants ? 'var(--coral-losses)' : 'var(--ink-muted)' }}>
                    Rs. {actualWants.toLocaleString()} / Rs. {suggestedWants.toLocaleString()}
                  </span>
                </div>
                <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    height: '100%',
                    backgroundColor: actualWants > suggestedWants ? 'var(--coral-losses)' : 'var(--ink-color)',
                    width: `${Math.min(100, (actualWants / (suggestedWants || 1)) * 100)}%`,
                    borderRadius: '3px',
                  }} />
                </div>
              </div>

              {/* Savings comparison */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between" style={{ fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 550 }}>Savings & Investment</span>
                  <span className="num" style={{ color: 'var(--emerald-gains)' }}>
                    Rs. {actualSavings.toLocaleString()} / Rs. {suggestedSavings.toLocaleString()}
                  </span>
                </div>
                <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    height: '100%',
                    backgroundColor: 'var(--emerald-gains)',
                    width: `${Math.min(100, (actualSavings / (suggestedSavings || 1)) * 100)}%`,
                    borderRadius: '3px',
                  }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inputs for adding entries */}
      <div className="grid grid-2 gap-6">
        {/* Left: Logger */}
        <div className="card" style={{ overflow: 'visible' }}>
          <div className="card-title">{editingItem ? 'Edit Recurring Contract' : 'Add Recurring Contract'}</div>
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
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
                  onClick={() => { setType('expense'); setCategory('needs:Other Need'); }}
                >
                  Monthly Outflow
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
                  onClick={() => { setType('income'); setCategory('income'); }}
                >
                  Monthly Inflow
                </button>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Label / Name</label>
              <input
                type="text"
                placeholder="e.g. Salary, Rent, Gym, Insurance"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Amount (MUR / Month)</label>
              <input
                type="text"
                placeholder="Rs. 5,000"
                value={amount}
                onChange={(e) => handleCurrencyChange(e.target.value, setAmount)}
                className="input-field num-input"
                required
              />
            </div>

            {type === 'expense' && (
              <div className="input-group" style={{ position: 'relative' }}>
                <label className="input-label">Commitment Category</label>
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
                  }}
                  onClick={() => {
                    setDropdownOpen(!dropdownOpen);
                    const parsed = parseCategory(category);
                    setSearchQuery(parsed.name === 'Needs' || parsed.name === 'Wants' || parsed.name === 'Savings' || parsed.name === 'Other Need' || parsed.name === 'Other Want' || parsed.name === 'Other Saving' ? '' : parsed.name);
                    if (parsed.classification !== 'income') {
                      setActiveTab(parsed.classification as any);
                    }
                  }}
                >
                  {renderCategoryDisplay(category)}
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
                        backgroundColor: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
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

                      {/* Tabs */}
                      <div className="flex gap-1" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                        {(['needs', 'wants', 'savings'] as const).map(tab => (
                          <button
                            key={tab}
                            type="button"
                            style={{
                              flex: 1,
                              padding: '4px 0',
                              fontSize: '0.75rem',
                              fontWeight: activeTab === tab ? 600 : 400,
                              border: 'none',
                              background: activeTab === tab ? 'var(--ink-color)' : 'none',
                              color: activeTab === tab ? 'var(--bg-color)' : 'var(--ink-muted)',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTab(tab);
                            }}
                          >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                          </button>
                        ))}
                      </div>

                      {/* Suggestions list */}
                      <div style={{ maxHeight: '150px', overflowY: 'auto' }} className="flex flex-col gap-1">
                        {/* Custom option if query doesn't match */}
                        {searchQuery.trim() !== '' && !STANDARD_CATEGORIES[activeTab].some(c => c.toLowerCase() === searchQuery.trim().toLowerCase()) && (
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
                              setCategory(`${activeTab}:${searchQuery.trim()}`);
                              setDropdownOpen(false);
                            }}
                          >
                            + Create "{searchQuery.trim()}" in {activeTab.toUpperCase()}
                          </button>
                        )}

                        {STANDARD_CATEGORIES[activeTab]
                          .filter(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((c) => {
                            const isSelected = category === `${activeTab}:${c}` || (category === activeTab && c === (activeTab === 'needs' ? 'Other Need' : activeTab === 'wants' ? 'Other Want' : 'Other Saving'));
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
                                  setCategory(`${activeTab}:${c}`);
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
            )}

            <div className="flex gap-2" style={{ marginTop: 'var(--space-2)' }}>
              {editingItem && (
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={cancelEdit}>
                  Cancel
                </button>
              )}
              <button type="submit" className="btn btn-primary" style={{ flex: editingItem ? 2 : 1 }}>
                {editingItem ? 'Save Changes' : (
                  <>
                    <Plus size={16} /> Add Contract
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Active list of contracts */}
        <div className="card flex flex-col gap-4">
          <div className="card-title">Contracts List</div>

          <div style={{ overflowY: 'auto', maxHeight: '340px' }} className="flex flex-col gap-4">
            {/* Inflows */}
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--emerald-gains)', textTransform: 'uppercase' }}>Inflows</span>
              {incomeItems.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--ink-light)', padding: 'var(--space-2) 0' }}>No active inflows</div>
              ) : (
                incomeItems.map(item => (
                  <div key={item.id} className="flex justify-between align-center" style={{
                    padding: '8px 0',
                    borderBottom: '1px solid var(--border-color)',
                  }}>
                    <div className="flex flex-col" style={{ flex: 1, paddingRight: 'var(--space-2)' }}>
                      <span style={{ fontWeight: 550, fontSize: '0.9rem' }}>{item.description}</span>
                    </div>
                    {confirmDeleteId === item.id ? (
                      <div className="flex align-center gap-2" style={{ backgroundColor: 'rgba(232, 93, 93, 0.05)', padding: '4px 8px', borderRadius: '4px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--coral-losses)', fontWeight: 600 }}>Sure?</span>
                        <button type="button" className="btn-text" style={{ fontSize: '0.75rem', color: 'var(--coral-losses)', padding: '2px 4px', fontWeight: 650 }} onClick={() => { onRemoveRecurring(item.id); setConfirmDeleteId(null); }}>
                          Delete
                        </button>
                        <span style={{ color: 'var(--border-color)', fontSize: '0.75rem' }}>|</span>
                        <button type="button" className="btn-text" style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', padding: '2px 4px' }} onClick={() => setConfirmDeleteId(null)}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex align-center gap-3">
                        <span className="num text-gain" style={{ fontWeight: 650 }}>Rs. {item.amount.toLocaleString()}</span>
                        <button type="button" className="icon-btn" title="Edit" onClick={() => startEdit(item)}>
                          <Edit2 size={14} />
                        </button>
                        <button type="button" className="icon-btn icon-btn-danger" title="Delete" onClick={() => setConfirmDeleteId(item.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Outflows */}
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--coral-losses)', textTransform: 'uppercase' }}>Outflows</span>
              {expenseItems.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--ink-light)', padding: 'var(--space-2) 0' }}>No active outflows</div>
              ) : (
                expenseItems.map(item => (
                  <div key={item.id} className="flex justify-between align-center" style={{
                    padding: '8px 0',
                    borderBottom: '1px solid var(--border-color)',
                  }}>
                    <div className="flex flex-col" style={{ flex: 1, paddingRight: 'var(--space-2)' }}>
                       <span style={{ fontWeight: 550, fontSize: '0.9rem' }}>{item.description}</span>
                       <span style={{ fontSize: '0.75rem', color: 'var(--ink-light)' }}>
                         {parseCategory(item.category).name} <span style={{ opacity: 0.5 }}>•</span> <span style={{ textTransform: 'capitalize' }}>{parseCategory(item.category).classification}</span>
                       </span>
                    </div>
                    {confirmDeleteId === item.id ? (
                      <div className="flex align-center gap-2" style={{ backgroundColor: 'rgba(232, 93, 93, 0.05)', padding: '4px 8px', borderRadius: '4px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--coral-losses)', fontWeight: 600 }}>Sure?</span>
                        <button type="button" className="btn-text" style={{ fontSize: '0.75rem', color: 'var(--coral-losses)', padding: '2px 4px', fontWeight: 650 }} onClick={() => { onRemoveRecurring(item.id); setConfirmDeleteId(null); }}>
                          Delete
                        </button>
                        <span style={{ color: 'var(--border-color)', fontSize: '0.75rem' }}>|</span>
                        <button type="button" className="btn-text" style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', padding: '2px 4px' }} onClick={() => setConfirmDeleteId(null)}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex align-center gap-3">
                        <span className="num text-loss" style={{ fontWeight: 650 }}>Rs. {item.amount.toLocaleString()}</span>
                        <button type="button" className="icon-btn" title="Edit" onClick={() => startEdit(item)}>
                          <Edit2 size={14} />
                        </button>
                        <button type="button" className="icon-btn icon-btn-danger" title="Delete" onClick={() => setConfirmDeleteId(item.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Salary Breakdown Modal */}
      {showSalaryModal && (
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
              backgroundColor: 'var(--card-bg)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            }}
          >
            <h3 className="serif-title" style={{ fontSize: '1.6rem', marginBottom: 'var(--space-2)' }}>
              Salary Breakdown
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginBottom: 'var(--space-4)' }}>
              Configure your monthly salary package. Zero out components you do not receive.
            </p>

            <form onSubmit={handleSaveSalaryBreakdown} className="flex flex-col gap-4">
              <div className="input-group">
                <label className="input-label">Base Salary (MUR)</label>
                <input
                  type="text"
                  placeholder="e.g. 40,000"
                  value={salaryBaseInput}
                  onChange={(e) => handleCurrencyChange(e.target.value, setSalaryBaseInput)}
                  className="input-field num-input"
                  required
                  autoFocus
                />
              </div>

              <div className="input-group">
                <label className="input-label">Transport Allowance (MUR)</label>
                <input
                  type="text"
                  placeholder="e.g. 5,000"
                  value={salaryTransportInput}
                  onChange={(e) => handleCurrencyChange(e.target.value, setSalaryTransportInput)}
                  className="input-field num-input"
                />
              </div>

              <div className="input-group">
                <div className="flex justify-between align-center">
                  <label className="input-label">MRA Money / CSG Allowance</label>
                  <span style={{ fontSize: '0.72rem', color: '#3B82F6', fontWeight: 550 }}>Paid 10th/11th</span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. 2,000"
                  value={salaryMraInput}
                  onChange={(e) => handleCurrencyChange(e.target.value, setSalaryMraInput)}
                  className="input-field num-input"
                />
              </div>

              <div className="flex justify-between" style={{ marginTop: 'var(--space-4)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowSalaryModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Apply Breakdown
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

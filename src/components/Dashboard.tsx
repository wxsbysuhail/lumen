import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  ArrowUpRight, ArrowDownRight, Plus, Calendar, TrendingUp, Edit2, Trash2,
  ChevronDown, Search, Wallet, PiggyBank, Info, Camera, Loader2, AlertCircle,
} from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { parseReceiptText } from '../utils/receiptParser';
import { cn } from '../utils/cn';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  split_with_id?: string;
  split_amount?: number;
  split_settled?: boolean;
}

interface DashboardProps {
  income: number;
  balance: number;
  generalBalance: number;
  onUpdateGeneralBalance: (newBalance: number) => void;
  goal: string;
  transactions: Transaction[];
  onAddTransaction: (
    desc: string,
    amount: number,
    type: 'income' | 'expense',
    category: string,
    splitWithId?: string,
    splitAmount?: number
  ) => void;
  onUpdateTransaction?: (
    id: string,
    desc: string,
    amount: number,
    type: 'income' | 'expense',
    category: string,
    splitWithId?: string,
    splitAmount?: number
  ) => void;
  onDeleteTransaction?: (id: string) => void;
  savingsRate: number;
  totalBucketSavings?: number;
  holdingsValue?: number;
  onNavigate?: (tab: 'dashboard' | 'cashflow' | 'savings' | 'investments' | 'projection' | 'reports' | 'insights' | 'joint') => void;
  recurringExpenses?: number;
  savingsTargetsSum?: number;
  partnerProfile?: { id: string; name: string; email: string } | null;
  streak?: number;
  loggedToday?: boolean;
}

// ── Shared style helpers ────────────────────────────────────────────────────
const MODAL_STYLE: React.CSSProperties = {
  position: 'fixed', inset: 0 as any,
  background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem',
};
const MODAL_CARD: React.CSSProperties = {
  background: 'var(--card-bg)', border: '1px solid var(--border-color)',
  borderRadius: '1.5rem', padding: '1.5rem', width: '100%',
};

// ── Animated count-up ───────────────────────────────────────────────────────
const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) =>
    Math.round(latest).toLocaleString('en-US')
  );
  useEffect(() => {
    const controls = animate(count, value, { duration: 1.8, ease: [0.16, 1, 0.3, 1] });
    return controls.stop;
  }, [value, count]);
  return <motion.span className="tabular-nums">{rounded}</motion.span>;
};

// ── Main component ──────────────────────────────────────────────────────────
export const Dashboard: React.FC<DashboardProps> = ({
  income,
  balance,
  generalBalance,
  onUpdateGeneralBalance,
  goal,
  transactions,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  savingsRate,
  totalBucketSavings = 0,
  holdingsValue = 0,
  onNavigate,
  recurringExpenses = 0,
  savingsTargetsSum = 0,
  partnerProfile = null,
  streak = 0,
  loggedToday = false,
}) => {
  // ── Modal / form state ────────────────────────────────────────────────────
  const [showAddModal, setShowAddModal]           = useState(false);
  const [editingTx, setEditingTx]                 = useState<Transaction | null>(null);
  const [desc, setDesc]                           = useState('');
  const [amount, setAmount]                       = useState('');
  const [type, setType]                           = useState<'income' | 'expense'>('expense');
  const [category, setCategory]                   = useState('');
  const [splitWithPartner, setSplitWithPartner]   = useState(false);
  const [showAdjustModal, setShowAdjustModal]     = useState(false);
  const [newBalanceInput, setNewBalanceInput]     = useState('');
  const [showSafeToSpendModal, setShowSafeToSpendModal] = useState(false);
  const [dropdownOpen, setDropdownOpen]           = useState(false);
  const [searchQuery, setSearchQuery]             = useState('');
  const [isScanning, setIsScanning]               = useState(false);
  const [scanProgress, setScanProgress]           = useState(0);
  const [scanError, setScanError]                 = useState('');

  useEffect(() => {
    if (!showAddModal) {
      setSplitWithPartner(false);
      if (!editingTx) {
        setDesc('');
        setAmount('');
        setCategory('');
      }
    }
  }, [showAddModal, editingTx]);

  useEffect(() => {
    const handler = () => {
      setEditingTx(null);
      setDesc('');
      setAmount('');
      setCategory('');
      setShowAddModal(true);
    };
    window.addEventListener('lumen:open-quick-log', handler);
    return () => window.removeEventListener('lumen:open-quick-log', handler);
  }, []);

  const handleStartEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setDesc(tx.description);
    handleCurrencyChange(tx.amount.toString(), setAmount);
    setType(tx.type);
    setCategory(tx.category);
    setSplitWithPartner(!!tx.split_with_id);
    setShowAddModal(true);
  };

  const handleModalClose = () => {
    setEditingTx(null);
    setDesc('');
    setAmount('');
    setCategory('');
    setSplitWithPartner(false);
    setShowAddModal(false);
  };

  // ── OCR receipt scan ──────────────────────────────────────────────────────
  const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true); setScanProgress(0); setScanError('');
    try {
      const worker = await createWorker('eng', 1, {
        logger: m => { if (m.status === 'recognizing text') setScanProgress(Math.round(m.progress * 100)); },
      });
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();
      if (!text || text.trim() === '') throw new Error('No readable text detected in receipt.');
      const parsed = parseReceiptText(text);
      setDesc(parsed.description);
      if (parsed.amount > 0) handleCurrencyChange(parsed.amount.toString(), setAmount);
      else setAmount('');
      setType('expense');
      setCategory(parsed.category);
    } catch (err: any) {
      console.error('OCR Error:', err);
      setScanError(err.message || 'Scanning failed. Please enter details manually.');
    } finally {
      setIsScanning(false);
    }
  };

  // ── Currency input formatter ──────────────────────────────────────────────
  const handleCurrencyChange = (value: string, setter: (val: string) => void) => {
    const clean = value.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) return;
    const formattedInt = parts[0] ? parseInt(parts[0], 10).toLocaleString('en-US') : '';
    const formatted = parts[1] !== undefined ? `${formattedInt}.${parts[1].slice(0, 2)}` : formattedInt;
    setter(clean === '' ? '' : formatted);
  };

  // ── Transaction totals ────────────────────────────────────────────────────
  const totalIn  = transactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const totalOut = transactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);

  // ── Billing-cycle range (26th → 25th) ────────────────────────────────────
  const getCurrentCycleRange = () => {
    const now = new Date();
    const year = now.getFullYear(), month = now.getMonth(), day = now.getDate();
    let startYear = year, startMonth = month, endYear = year, endMonth = month;
    if (day >= 26) {
      startMonth = month; endMonth = month + 1;
      if (endMonth > 11) { endMonth = 0; endYear += 1; }
    } else {
      startMonth = month - 1;
      if (startMonth < 0) { startMonth = 11; startYear -= 1; }
      endMonth = month;
    }
    return {
      startDate: new Date(startYear, startMonth, 26, 0, 0, 0),
      endDate:   new Date(endYear,   endMonth,   25, 23, 59, 59),
      startMonth,
    };
  };

  const { startDate, endDate, startMonth } = getCurrentCycleRange();
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const currentCycleLabel = `${monthNames[startMonth]} 26 – ${monthNames[endDate.getMonth()]} 25`;

  const currentCycleTransactions = transactions.filter(t => {
    const d = new Date(t.date); return d >= startDate && d <= endDate;
  });

  const loggedExpensesThisCycle   = currentCycleTransactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
  const loggedInflowsThisCycle    = currentCycleTransactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const recurringInflowsThisCycle = currentCycleTransactions.filter(t => t.type === 'income' && /base|salary|transport/i.test(t.description)).reduce((a, t) => a + t.amount, 0);
  const extraInflowsThisCycle     = Math.max(0, loggedInflowsThisCycle - recurringInflowsThisCycle);
  const totalInflowForCycle       = income + extraInflowsThisCycle;
  const startingDisposablePool    = Math.max(0, totalInflowForCycle - recurringExpenses - savingsTargetsSum);
  const safeToSpend               = startingDisposablePool - loggedExpensesThisCycle;

  const nowTime       = new Date();
  const daysRemaining = Math.max(1, Math.ceil((endDate.getTime() - nowTime.getTime()) / (1000 * 60 * 60 * 24)));
  const dailyAllowance = Math.round(Math.max(0, safeToSpend) / daysRemaining);

  // ── Form helpers ──────────────────────────────────────────────────────────
  const categories = type === 'income'
    ? ['Salary', 'Freelance', 'Investments', 'Other In']
    : ['Rent & Housing', 'Groceries', 'Utilities', 'Dining Out', 'Leisure', 'Transport', 'Other Out'];

  useEffect(() => {
    if (categories.length > 0 && !category) setCategory(categories[0]);
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
    
    if (editingTx) {
      if (onUpdateTransaction) {
        if (splitWithPartner && partnerProfile) {
          onUpdateTransaction(editingTx.id, desc, parsedAmount, type, category, partnerProfile.id, parsedAmount / 2);
        } else {
          onUpdateTransaction(editingTx.id, desc, parsedAmount, type, category);
        }
      }
    } else {
      if (splitWithPartner && partnerProfile) {
        onAddTransaction(desc, parsedAmount, type, category, partnerProfile.id, parsedAmount / 2);
      } else {
        onAddTransaction(desc, parsedAmount, type, category);
      }
    }
    
    setEditingTx(null);
    setDesc('');
    setAmount('');
    setCategory('');
    setSearchQuery('');
    setSplitWithPartner(false);
    setShowAddModal(false);
  };

  const handleSaveBalanceAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateGeneralBalance(parseFloat(newBalanceInput.replace(/,/g, '')) || 0);
    setShowAdjustModal(false);
  };

  const getGoalLabel = (g: string) => {
    const map: Record<string, string> = { save: 'Save Money', invest: 'Grow Investments', debt: 'Pay Off Debt', wealth: 'Build Wealth' };
    return map[g] ?? 'Finance Focus';
  };

  const spendStatusText = safeToSpend > 5000
    ? 'Your spending is well within safe boundaries.'
    : safeToSpend > 0
      ? 'Approaching budget limits. Spend cautiously.'
      : 'You have exceeded your safe spending limit.';

  // ── Streak chip style ─────────────────────────────────────────────────────
  const streakChipCls = cn(
    'streak-chip',
    streak >= 7 ? 'mega' : streak >= 2 ? 'active' : loggedToday ? 'today' : 'zero',
  );

  // ── Asset badge rows ──────────────────────────────────────────────────────
  const assetBadges = [
    { label: 'Cash',    val: generalBalance,    colorClass: 'text-white',       icon: <Wallet size={11} />,    onClick: () => { setNewBalanceInput(generalBalance.toLocaleString('en-US')); setShowAdjustModal(true); } },
    { label: 'Savings', val: totalBucketSavings, colorClass: 'text-emerald-400', icon: <PiggyBank size={11} />, onClick: () => onNavigate?.('savings') },
    { label: 'Stocks',  val: holdingsValue,      colorClass: 'text-blue-400',    icon: <TrendingUp size={11} />,onClick: () => onNavigate?.('investments') },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  const spendColorStyle = safeToSpend > 5000 ? 'var(--emerald-gains)' : safeToSpend > 0 ? '#D97706' : 'var(--coral-losses)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '1rem' }}
    >

      {/* ══ Hero — Net Worth ════════════════════════════════════════════════ */}
      <div className="card" style={{ padding: '2.5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        {/* Label + edit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="card-title" style={{ margin: 0 }}>Net Worth</span>
          <button
            type="button"
            onClick={() => { setNewBalanceInput(generalBalance.toLocaleString('en-US')); setShowAdjustModal(true); }}
            title="Adjust Available Cash"
            className="icon-btn"
            style={{ width: '22px', height: '22px', flexShrink: 0 }}
          >
            <Edit2 size={11} />
          </button>
        </div>

        {/* Animated amount */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', justifyContent: 'center' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--ink-muted)', alignSelf: 'flex-start', marginTop: '0.6rem' }}>Rs.</span>
          <h1 className="num" style={{ fontSize: 'clamp(3rem, 8vw, 4.5rem)', fontWeight: 700, letterSpacing: '-0.05em', color: 'var(--ink-color)', lineHeight: 1 }}>
            <AnimatedNumber value={balance} />
          </h1>
        </div>

        {/* Badges row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span className="badge badge-gain" style={{ gap: '4px' }}>
            <TrendingUp size={11} /> {getGoalLabel(goal)}
          </span>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            title={streak >= 2 ? `${streak}-day logging streak!` : loggedToday ? 'Logged today!' : 'Log a transaction'}
            className={streakChipCls}
          >
            {streak >= 2 ? <>{streak >= 7 ? '🔥' : '🔥'} {streak}d streak</> : loggedToday ? <>✅ Logged today</> : <>+ Log today</>}
          </button>
        </div>

        {/* Asset allocation bar */}
        {balance > 0 && (
          <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ height: '6px', borderRadius: '3px', background: 'var(--border-color)', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${(generalBalance / balance) * 100}%`, background: 'var(--ink-color)', transition: 'width 0.7s ease' }} title={`Cash: ${Math.round((generalBalance / balance) * 100)}%`} />
              <div style={{ width: `${(totalBucketSavings / balance) * 100}%`, background: 'var(--emerald-gains)', transition: 'width 0.7s ease' }} title={`Savings: ${Math.round((totalBucketSavings / balance) * 100)}%`} />
              <div style={{ width: `${(holdingsValue / balance) * 100}%`, background: '#3B82F6', transition: 'width 0.7s ease' }} title={`Investments: ${Math.round((holdingsValue / balance) * 100)}%`} />
            </div>
          </div>
        )}

        {/* Asset pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {assetBadges.map((b, i) => (
            <button
              key={i}
              type="button"
              onClick={b.onClick}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '5px 12px', borderRadius: '9999px',
                background: 'var(--nav-pill-bg)', border: '1px solid var(--border-color)',
                fontSize: '0.78rem', color: 'var(--ink-muted)', cursor: 'pointer',
                transition: 'all 0.2s ease', whiteSpace: 'nowrap',
              }}
            >
              <span style={{ color: i === 0 ? 'var(--ink-color)' : i === 1 ? 'var(--emerald-gains)' : '#3B82F6' }}>{b.icon}</span>
              <span>{b.label}:</span>
              <span className="num" style={{ fontWeight: 600, color: i === 0 ? 'var(--ink-color)' : i === 1 ? 'var(--emerald-gains)' : '#3B82F6' }}>Rs. {b.val.toLocaleString('en-US')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ══ Safe to Spend + Savings Rate ════════════════════════════════════ */}
      <div className="grid grid-2 gap-4">

        {/* Safe to Spend */}
        <div className="card flex flex-col justify-between" style={{ minHeight: '200px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span className="card-title" style={{ margin: 0 }}>Safe to Spend</span>
                <button type="button" onClick={() => setShowSafeToSpendModal(true)} className="icon-btn" style={{ width: '20px', height: '20px' }}>
                  <Info size={11} />
                </button>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--ink-light)' }}>{currentCycleLabel}</span>
            </div>
            <h2 className="num" style={{ fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', fontWeight: 600, color: spendColorStyle, letterSpacing: '-0.03em', lineHeight: 1 }}>
              Rs. <AnimatedNumber value={Math.max(0, safeToSpend)} />
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: '0.5rem' }}>{spendStatusText}</p>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', marginTop: '0.75rem' }}>
              <div>
                <p style={{ fontSize: '0.7rem', color: 'var(--ink-light)', marginBottom: '2px' }}>Daily Allowance</p>
                <p className="num" style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ink-color)' }}>Rs. {dailyAllowance.toLocaleString('en-US')}<span style={{ color: 'var(--ink-muted)', fontWeight: 400, fontSize: '0.8rem' }}>/day</span></p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--ink-light)', marginBottom: '2px' }}>Days Left</p>
                <p className="num" style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ink-color)' }}>{daysRemaining} <span style={{ color: 'var(--ink-muted)', fontWeight: 400, fontSize: '0.8rem' }}>days</span></p>
              </div>
            </div>
            {startingDisposablePool > 0 && (
              <div style={{ width: '100%', height: '5px', borderRadius: '3px', background: 'var(--border-color)', overflow: 'hidden', marginTop: '0.75rem' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(0, Math.min(100, (safeToSpend / startingDisposablePool) * 100))}%` }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  style={{ height: '100%', borderRadius: '3px', background: spendColorStyle }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Savings Rate */}
        <div className="card flex flex-col justify-between" style={{ minHeight: '200px' }}>
          <div>
            <span className="card-title">Savings Rate</span>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', marginBottom: '0.5rem' }}>
              <h2 className="num" style={{ fontSize: 'clamp(2rem, 6vw, 3rem)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, color: 'var(--ink-color)' }}>
                {Math.round(savingsRate)}%
              </h2>
              <span className="badge badge-gain" style={{ marginBottom: '0.3rem' }}>
                {savingsRate >= 20 ? 'Optimal' : savingsRate >= 10 ? 'Healthy' : 'Low'}
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
              Retaining <span className="num" style={{ fontWeight: 600, color: 'var(--ink-color)' }}>Rs. {Math.max(0, income + totalIn - totalOut).toLocaleString('en-US')}</span> this month.
            </p>
          </div>
          <div style={{ width: '100%', height: '5px', borderRadius: '3px', background: 'var(--border-color)', overflow: 'hidden', marginTop: '1rem' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, savingsRate))}%` }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ height: '100%', borderRadius: '3px', background: 'var(--emerald-gains)' }}
            />
          </div>
        </div>
      </div>

      {/* ══ Cash Flow ═══════════════════════════════════════════════════════ */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span className="card-title" style={{ margin: 0 }}>Monthly Cash Flow</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--ink-light)' }}>{currentCycleLabel}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', display: 'block', marginBottom: '2px' }}>Total Inflow</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <ArrowUpRight size={16} style={{ color: 'var(--emerald-gains)' }} />
              <span className="num text-gain" style={{ fontSize: '1.4rem', fontWeight: 700 }}>Rs. {(income + totalIn).toLocaleString('en-US')}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', display: 'block', marginBottom: '2px' }}>Total Outflow</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end' }}>
              <span className="num text-loss" style={{ fontSize: '1.4rem', fontWeight: 700 }}>Rs. {totalOut.toLocaleString('en-US')}</span>
              <ArrowDownRight size={16} style={{ color: 'var(--coral-losses)' }} />
            </div>
          </div>
        </div>
        <div style={{ height: '6px', width: '100%', borderRadius: '3px', background: 'var(--border-color)', overflow: 'hidden', display: 'flex' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(income + totalIn) > 0 ? Math.min(100, ((income + totalIn) / ((income + totalIn) + Math.max(1, totalOut))) * 100) : 50}%` }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            style={{ height: '100%', background: 'var(--emerald-gains)' }}
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${totalOut > 0 ? Math.min(100, (totalOut / ((income + totalIn) + Math.max(1, totalOut))) * 100) : 50}%` }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            style={{ height: '100%', background: 'var(--coral-losses)' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.72rem', color: 'var(--ink-light)' }}>
          <span style={{ color: 'var(--emerald-gains)' }}>{(income + totalIn) > 0 ? Math.round(((income + totalIn) / ((income + totalIn) + Math.max(1, totalOut))) * 100) : 50}% In</span>
          <span style={{ color: 'var(--coral-losses)' }}>{totalOut > 0 ? Math.round((totalOut / ((income + totalIn) + Math.max(1, totalOut))) * 100) : 50}% Out</span>
        </div>
      </div>

      {/* ══ Recent Transactions ══════════════════════════════════════════════ */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span className="card-title" style={{ margin: 0 }}>Recent Activity</span>
          <button
            type="button"
            onClick={() => { setDesc(''); setAmount(''); setType('expense'); setCategory('Rent & Housing'); setSearchQuery(''); setShowAddModal(true); }}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '0.8rem' }}
          >
            <Plus size={13} /> Log Transaction
          </button>
        </div>

        {transactions.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 0', gap: '8px', color: 'var(--ink-light)' }}>
            <Calendar size={20} />
            <p style={{ fontSize: '0.875rem' }}>No entries yet. Log your first transaction.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {transactions.slice(0, 5).map((tx, idx) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: tx.type === 'income' ? 'var(--emerald-gains-bg)' : 'var(--coral-losses-bg)',
                  }}>
                    {tx.type === 'income'
                      ? <ArrowUpRight size={14} style={{ color: 'var(--emerald-gains)' }} />
                      : <ArrowDownRight size={14} style={{ color: 'var(--coral-losses)' }} />}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontWeight: 550, fontSize: '0.875rem', color: 'var(--ink-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--ink-light)', marginTop: '1px' }}>
                      {tx.category} · {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="num" style={{ fontWeight: 650, fontSize: '0.875rem', flexShrink: 0, color: tx.type === 'income' ? 'var(--emerald-gains)' : 'var(--coral-losses)' }}>
                    {tx.type === 'income' ? '+' : '−'} Rs. {tx.amount.toLocaleString('en-US')}
                  </span>
                  <div style={{ display: 'flex', gap: '4px', marginLeft: '4px' }}>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(tx)}
                      className="icon-btn"
                      style={{ width: '26px', height: '26px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--nav-pill-bg)', borderRadius: '6px', border: '1px solid var(--border-color)', cursor: 'pointer' }}
                      title="Edit entry"
                    >
                      <Edit2 size={11} style={{ color: 'var(--ink-muted)' }} />
                    </button>
                    {onDeleteTransaction && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete "${tx.description}"?`)) {
                            onDeleteTransaction(tx.id);
                          }
                        }}
                        className="icon-btn icon-btn-danger"
                        style={{ width: '26px', height: '26px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--coral-losses-bg)', borderRadius: '6px', border: '1px solid rgba(232, 93, 93, 0.15)', cursor: 'pointer' }}
                        title="Delete entry"
                      >
                        <Trash2 size={11} style={{ color: 'var(--coral-losses)' }} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            {transactions.length > 5 && (
              <button
                type="button"
                onClick={() => onNavigate?.('reports')}
                style={{ marginTop: '1rem', width: '100%', padding: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--emerald-gains)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                View all {transactions.length} entries →
              </button>
            )}
          </div>
        )}
      </div>

      {/* ══ Modal — Log Transaction ══════════════════════════════════════════ */}
      {showAddModal && (
        <div style={MODAL_STYLE}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ ...MODAL_CARD, maxWidth: '400px', overflowY: 'auto', maxHeight: '90vh' }}
          >
            <h3 style={{ fontSize: '1.5rem', fontWeight: 400, fontStyle: 'italic', fontFamily: 'var(--font-serif)', color: 'var(--ink-color)', marginBottom: '1rem' }}>
              {editingTx ? 'Edit Entry' : 'Log Entry'}
            </h3>

            {/* Receipt scan zone (only show when creating, not editing) */}
            {!editingTx && (
              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="receipt-upload"
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '1rem', borderRadius: '0.75rem', border: '1.5px dashed var(--border-color)', background: 'var(--nav-pill-bg)', cursor: 'pointer' }}
                >
                  <input
                    type="file" id="receipt-upload" accept="image/*"
                    onChange={handleReceiptScan} style={{ display: 'none' }} disabled={isScanning}
                  />
                  {isScanning ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'center' }}>
                      <Loader2 size={20} style={{ color: 'var(--emerald-gains)', animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 550, color: 'var(--ink-muted)' }}>Analyzing receipt ({scanProgress}%)</span>
                      <div style={{ width: '100%', height: '4px', borderRadius: '2px', background: 'var(--border-color)', overflow: 'hidden', marginTop: '4px' }}>
                        <motion.div style={{ height: '100%', background: 'var(--emerald-gains)', borderRadius: '2px', width: `${scanProgress}%` }} layout />
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 550, color: 'var(--ink-muted)' }}>
                      <Camera size={14} /><span>Scan Receipt (AI Auto-Fill)</span>
                    </div>
                  )}
                </label>
                {scanError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--coral-losses)', fontSize: '0.75rem', marginTop: '6px' }}>
                    <AlertCircle size={12} /><span>{scanError}</span>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Type toggle */}
              <div className="input-group">
                <label className="input-label">Type</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['expense', 'income'] as const).map((t) => (
                    <button
                      key={t} type="button" onClick={() => handleTypeChange(t)}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 500,
                        border: '1px solid', cursor: 'pointer', transition: 'all 0.2s',
                        background: type === t ? 'var(--ink-color)' : 'var(--nav-pill-bg)',
                        color: type === t ? 'var(--bg-color)' : 'var(--ink-muted)',
                        borderColor: type === t ? 'var(--ink-color)' : 'var(--border-color)',
                      }}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="input-group">
                <label className="input-label">Description</label>
                <input
                  type="text" placeholder="e.g. Weekly Groceries" value={desc}
                  onChange={(e) => setDesc(e.target.value)} required
                  className="input-field"
                />
              </div>

              {/* Amount */}
              <div className="input-group">
                <label className="input-label">Amount (MUR)</label>
                <input
                  type="text" placeholder="2,500" value={amount}
                  onChange={(e) => handleCurrencyChange(e.target.value, setAmount)} required
                  className="input-field num-input"
                />
              </div>

              {/* Category dropdown */}
              <div className="input-group">
                <label className="input-label">Category</label>
                <button
                  type="button"
                  onClick={() => { setDropdownOpen(!dropdownOpen); setSearchQuery(''); }}
                  className="input-field"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                  <span style={{ fontWeight: 500 }}>{category || 'Select category'}</span>
                  <ChevronDown size={14} style={{ color: 'var(--ink-muted)', transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    style={{ marginTop: '8px', background: 'var(--nav-pill-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', overflow: 'hidden' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px', background: 'var(--card-bg)' }}>
                      <Search size={13} style={{ color: 'var(--ink-light)', flexShrink: 0 }} />
                      <input
                        type="text" placeholder="Search or type custom..."
                        value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--ink-color)', fontSize: '0.78rem', width: '100%' }}
                      />
                    </div>
                    <div style={{ maxHeight: '9rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {searchQuery.trim() !== '' && !categories.some(c => c.toLowerCase() === searchQuery.trim().toLowerCase()) && (
                        <button
                          type="button"
                          onClick={() => { setCategory(searchQuery.trim()); setDropdownOpen(false); }}
                          style={{ width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: '8px', background: 'var(--emerald-gains-bg)', color: 'var(--emerald-gains)', fontSize: '0.78rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                        >
                          + Create "{searchQuery.trim()}"
                        </button>
                      )}
                      {categories.filter(c => c.toLowerCase().includes(searchQuery.toLowerCase())).map((c) => (
                        <button
                          key={c} type="button"
                          onClick={() => { setCategory(c); setDropdownOpen(false); }}
                          style={{ width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: '8px', fontSize: '0.82rem', border: 'none', cursor: 'pointer', fontWeight: category === c ? 600 : 400, background: category === c ? 'var(--border-color)' : 'transparent', color: category === c ? 'var(--ink-color)' : 'var(--ink-muted)' }}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Split toggle */}
              {partnerProfile && type === 'expense' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '10px', background: 'var(--nav-pill-bg)', border: '1px solid var(--border-color)' }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 550, color: 'var(--ink-color)' }}>Split 50/50</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>Split with {partnerProfile.name}</p>
                  </div>
                  <label className="relative inline-block w-10 h-[22px] cursor-pointer shrink-0">
                    <input
                      type="checkbox" id="splitWithPartner"
                      checked={splitWithPartner} onChange={(e) => setSplitWithPartner(e.target.checked)}
                      className="sr-only"
                    />
                    <span style={{ position: 'absolute', inset: 0, borderRadius: '9999px', background: splitWithPartner ? 'var(--emerald-gains)' : 'var(--border-color)', transition: 'background 0.3s' }}>
                      <span
                        className="absolute bottom-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform duration-300"
                        style={{ transform: splitWithPartner ? 'translateX(18px)' : 'translateX(0)' }}
                      />
                    </span>
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="button" onClick={handleModalClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingTx ? 'Save Changes' : 'Log Entry'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ══ Modal — Adjust Available Cash ═══════════════════════════════════ */}
      {showAdjustModal && (
        <div style={MODAL_STYLE}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ ...MODAL_CARD, maxWidth: '400px' }}
          >
            <h3 style={{ fontSize: '1.5rem', fontWeight: 400, fontStyle: 'italic', fontFamily: 'var(--font-serif)', color: 'var(--ink-color)', marginBottom: '4px' }}>Adjust Available Cash</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Manually adjust the cash held in your bank account. Your total Net Worth will be updated dynamically below.
            </p>
            <form onSubmit={handleSaveBalanceAdjust} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">Available Bank Cash (MUR)</label>
                <input
                  type="text" placeholder="e.g. 50,000" value={newBalanceInput}
                  onChange={(e) => handleCurrencyChange(e.target.value, setNewBalanceInput)}
                  required autoFocus
                  className="input-field num-input"
                />
              </div>
              <div style={{ background: 'var(--nav-pill-bg)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--ink-muted)' }}>Other Assets:</span>
                  <span className="num" style={{ fontWeight: 500, color: 'var(--ink-color)' }}>Rs. {Math.max(0, balance - generalBalance).toLocaleString('en-US')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--ink-color)' }}>Forecasted Net Worth:</span>
                  <span className="num" style={{ fontWeight: 700, color: 'var(--emerald-gains)' }}>
                    Rs. {((parseFloat(newBalanceInput.replace(/,/g, '')) || 0) + Math.max(0, balance - generalBalance)).toLocaleString('en-US')}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="button" onClick={() => setShowAdjustModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Balance</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ══ Modal — Safe to Spend Breakdown ══════════════════════════════════ */}
      {showSafeToSpendModal && (
        <div style={MODAL_STYLE}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ ...MODAL_CARD, maxWidth: '480px' }}
          >
            <h3 style={{ fontSize: '1.5rem', fontWeight: 400, fontStyle: 'italic', fontFamily: 'var(--font-serif)', color: 'var(--ink-color)', marginBottom: '4px' }}>Safe to Spend Breakdown</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              How much you can safely spend on daily variable expenses during{' '}
              <strong style={{ color: 'var(--ink-color)' }}>{currentCycleLabel}</strong> without affecting bills or savings commitments.
            </p>
            <div style={{ background: 'var(--nav-pill-bg)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: '1. Expected Regular Inflow:',   val: income,               sign: '+', gain: true },
                { label: '2. Extra Inflows Logged:',      val: extraInflowsThisCycle, sign: '+', gain: true },
                { label: '3. Committed Recurring Bills:', val: recurringExpenses,     sign: '−', gain: false },
                { label: '4. Active Savings Goals:',      val: savingsTargetsSum,     sign: '−', gain: false },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--ink-muted)' }}>{row.label}</span>
                  <span className="num" style={{ fontWeight: 500, color: row.gain ? 'var(--emerald-gains)' : 'var(--coral-losses)' }}>{row.sign} Rs. {row.val.toLocaleString('en-US')}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px dashed var(--border-color)', margin: '2px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--ink-color)' }}>Starting Disposable Pool:</span>
                <span className="num" style={{ fontWeight: 700, color: 'var(--ink-color)' }}>Rs. {startingDisposablePool.toLocaleString('en-US')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--ink-muted)' }}>5. Daily Expenses Logged:</span>
                <span className="num" style={{ fontWeight: 500, color: 'var(--coral-losses)' }}>− Rs. {loggedExpensesThisCycle.toLocaleString('en-US')}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border-color)', margin: '2px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--ink-color)' }}>Safe to Spend Remaining:</span>
                <span className="num" style={{ fontWeight: 700, color: spendColorStyle }}>Rs. {safeToSpend.toLocaleString('en-US')}</span>
              </div>
            </div>
            <button
              type="button" onClick={() => setShowSafeToSpendModal(false)}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem' }}
            >
              Got it
            </button>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

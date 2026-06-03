import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  BrainCircuit, 
  SlidersHorizontal,
  TrendingUp,
  Edit2,
  Trash2,
  ChevronDown
} from 'lucide-react';

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
}

interface ReportsProps {
  transactions: Transaction[];
  monthlyIncome: number;
  generalBalance: number;
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
}

const CATEGORY_COLORS: Record<string, string> = {
  // Outflows
  'Rent & Housing': '#5C6BC0',
  'Rent & Leases': '#5C6BC0',
  'Groceries': '#FF7043',
  'Grocery Allocations': '#FF7043',
  'Utilities': '#26A69A',
  'Dining Out': '#EC407A',
  'Leisure': '#AB47BC',
  'Lifestyle Wants': '#AB47BC',
  'Transport': '#29B6F6',
  'Other Out': '#8D6E63',
  
  // Inflows
  'Salary': '#0F7A5C',
  'Corporate Salary Base': '#0F7A5C',
  'Freelance': '#42A5F5',
  'Investments': '#FFCA28',
  'Other In': '#26C6DA'
};

const DEFAULT_COLOR = '#90A4AE';

export const Reports: React.FC<ReportsProps> = ({
  transactions,
  monthlyIncome,
  generalBalance,
  onUpdateTransaction,
  onDeleteTransaction,
}) => {
  const [period, setPeriod] = useState<'this-month' | 'last-30' | 'all-time'>('this-month');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // Edit modal states
  const [showEditModal, setShowEditModal]   = useState(false);
  const [editingTx, setEditingTx]           = useState<Transaction | null>(null);
  const [desc, setDesc]                     = useState('');
  const [amount, setAmount]                 = useState('');
  const [type, setType]                     = useState<'income' | 'expense'>('expense');
  const [category, setCategory]             = useState('');
  const [dropdownOpen, setDropdownOpen]     = useState(false);
  const [searchQuery, setSearchQuery]       = useState('');

  // Currency input formatter
  const handleCurrencyChange = (value: string, setter: (val: string) => void) => {
    const clean = value.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) return;
    const formattedInt = parts[0] ? parseInt(parts[0], 10).toLocaleString('en-US') : '';
    const formatted = parts[1] !== undefined ? `${formattedInt}.${parts[1].slice(0, 2)}` : formattedInt;
    setter(clean === '' ? '' : formatted);
  };

  const handleStartEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setDesc(tx.description);
    handleCurrencyChange(tx.amount.toString(), setAmount);
    setType(tx.type);
    setCategory(tx.category);
    setShowEditModal(true);
  };

  const handleModalClose = () => {
    setEditingTx(null);
    setDesc('');
    setAmount('');
    setCategory('');
    setShowEditModal(false);
  };

  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType);
    const defaultCats = newType === 'income'
      ? ['Salary', 'Freelance', 'Investments', 'Other In']
      : ['Rent & Housing', 'Groceries', 'Utilities', 'Dining Out', 'Leisure', 'Transport', 'Other Out'];
    setCategory(defaultCats[0]);
    setSearchQuery('');
  };

  const categories = type === 'income'
    ? ['Salary', 'Freelance', 'Investments', 'Other In']
    : ['Rent & Housing', 'Groceries', 'Utilities', 'Dining Out', 'Leisure', 'Transport', 'Other Out'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !amount || !editingTx) return;
    const parsedAmount = parseFloat(amount.replace(/,/g, '')) || 0;
    if (onUpdateTransaction) {
      onUpdateTransaction(editingTx.id, desc, parsedAmount, type, category);
    }
    handleModalClose();
  };

  // Filter transactions based on selected period
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      if (period === 'this-month') {
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      } else if (period === 'last-30') {
        const diffTime = Math.abs(now.getTime() - txDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30;
      }
      return true; // all-time
    });
  }, [transactions, period]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    const now = new Date();
    let days = 30;
    if (period === 'this-month') {
      days = now.getDate() || 1;
    } else if (period === 'all-time') {
      if (transactions.length > 0) {
        const dates = transactions.map(t => new Date(t.date).getTime());
        const minDate = Math.min(...dates);
        const diffTime = Math.abs(now.getTime() - minDate);
        days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      } else {
        days = 1;
      }
    }

    const outflows = filteredTransactions.filter(t => t.type === 'expense');
    const inflows = filteredTransactions.filter(t => t.type === 'income');
    
    const totalOutflows = outflows.reduce((acc, t) => acc + t.amount, 0);
    const totalInflows = inflows.reduce((acc, t) => acc + t.amount, 0);
    
    const dailyBurnRate = totalOutflows / days;
    const dailyInflowRate = totalInflows / days;
    const netDailyBurn = Math.max(0, dailyBurnRate - dailyInflowRate);

    // Group outflows by category
    const categoryMap: Record<string, number> = {};
    outflows.forEach(t => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
    });

    // Find top category
    let topCategory = 'None';
    let topVal = 0;
    Object.entries(categoryMap).forEach(([cat, val]) => {
      if (val > topVal) {
        topVal = val;
        topCategory = cat;
      }
    });

    // Runway calculation
    let runwayDays: number | 'infinite' = 'infinite';
    if (netDailyBurn > 0 && generalBalance > 0) {
      runwayDays = Math.max(0, Math.round(generalBalance / netDailyBurn));
    }

    // Savings rate
    const savings = Math.max(0, totalInflows - totalOutflows);
    const savingsRate = totalInflows > 0 ? (savings / totalInflows) * 100 : 0;

    return {
      totalOutflows,
      totalInflows,
      dailyBurnRate,
      topCategory,
      topCategoryValue: topVal,
      runwayDays,
      savingsRate,
      categoryMap,
      days
    };
  }, [filteredTransactions, period, generalBalance, transactions]);

  // Proportional breakdown calculations
  const breakdownSegments = useMemo(() => {
    const total = metrics.totalOutflows || 1;
    return Object.entries(metrics.categoryMap)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: (amount / total) * 100,
        color: CATEGORY_COLORS[category] || DEFAULT_COLOR
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [metrics]);

  // Search & sort transactions for the list
  const searchedAndSortedTransactions = useMemo(() => {
    const searched = filteredTransactions.filter(tx => 
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return [...searched].sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortBy === 'date-asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === 'amount-desc') {
        return b.amount - a.amount;
      } else { // amount-asc
        return a.amount - b.amount;
      }
    });
  }, [filteredTransactions, searchTerm, sortBy]);
 
  // Spending trend graph data grouping
  const trendData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const dailyExpenses: Record<string, number> = {};
    const points: { label: string; amount: number; rawDate: Date }[] = [];
    
    if (period === 'this-month') {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        dailyExpenses[dateKey] = 0;
      }
      
      transactions.forEach(tx => {
        if (tx.type === 'expense') {
          const key = tx.date.slice(0, 10);
          if (dailyExpenses[key] !== undefined) {
            dailyExpenses[key] += tx.amount;
          }
        }
      });
      
      Object.keys(dailyExpenses).sort().forEach(key => {
        const dayNum = parseInt(key.split('-')[2]);
        points.push({
          label: `${monthNames[month]} ${dayNum}`,
          amount: dailyExpenses[key],
          rawDate: new Date(key)
        });
      });
    } else if (period === 'last-30') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];
        dailyExpenses[dateKey] = 0;
      }
      
      transactions.forEach(tx => {
        if (tx.type === 'expense') {
          const key = tx.date.slice(0, 10);
          if (dailyExpenses[key] !== undefined) {
            dailyExpenses[key] += tx.amount;
          }
        }
      });
      
      Object.keys(dailyExpenses).sort().forEach(key => {
        const d = new Date(key);
        points.push({
          label: `${monthNames[d.getMonth()]} ${d.getDate()}`,
          amount: dailyExpenses[key],
          rawDate: d
        });
      });
    } else {
      const monthlyExpenses: Record<string, number> = {};
      
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyExpenses[monthKey] = 0;
      }
      
      transactions.forEach(tx => {
        if (tx.type === 'expense') {
          const txDate = new Date(tx.date);
          const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
          if (monthlyExpenses[monthKey] !== undefined) {
            monthlyExpenses[monthKey] += tx.amount;
          } else {
            monthlyExpenses[monthKey] = tx.amount;
          }
        }
      });
      
      Object.keys(monthlyExpenses).sort().forEach(key => {
        const [yr, m] = key.split('-').map(Number);
        points.push({
          label: `${monthNames[m - 1]} ${yr}`,
          amount: monthlyExpenses[key],
          rawDate: new Date(yr, m - 1, 1)
        });
      });
    }
    
    return points;
  }, [transactions, period]);

  const { linePath, areaPath } = useMemo(() => {
    if (trendData.length < 2) return { linePath: '', areaPath: '' };
    
    const maxAmount = Math.max(...trendData.map(p => p.amount), 1000);
    const width = 500;
    const height = 150;
    const paddingX = 20;
    const paddingY = 20;
    const graphWidth = width - paddingX * 2;
    const graphHeight = height - paddingY * 2;
    
    let path = '';
    let area = `M ${paddingX} ${height - paddingY} `;
    
    trendData.forEach((p, idx) => {
      const x = paddingX + (idx / (trendData.length - 1)) * graphWidth;
      const y = height - paddingY - (p.amount / maxAmount) * graphHeight;
      
      if (idx === 0) {
        path += `M ${x} ${y} `;
      } else {
        path += `L ${x} ${y} `;
      }
      area += `L ${x} ${y} `;
    });
    
    const lastX = paddingX + graphWidth;
    area += `L ${lastX} ${height - paddingY} Z`;
    
    return { linePath: path, areaPath: area };
  }, [trendData]);

  // 2026 AI Insight Narrative Generator
  const aiReportNarrative = useMemo(() => {
    const { totalInflows, totalOutflows, dailyBurnRate, topCategory, topCategoryValue, runwayDays, savingsRate } = metrics;
    
    let paragraph1 = "";
    let paragraph2 = "";
    let paragraph3 = "";

    const activeInflows = totalInflows > 0 ? totalInflows : monthlyIncome;

    // P1: Overall Financial Runway & Health
    if (totalOutflows === 0) {
      paragraph1 = "Your spending ledger is clean for this period. With no logged recurring or active outflows, your general cash balance remains completely shielded, maximizing wealth growth potential.";
    } else if (runwayDays === 'infinite') {
      paragraph1 = `Your cash flow state is highly optimized. Inflows (Rs. ${activeInflows.toLocaleString()}) outpace outflows (Rs. ${totalOutflows.toLocaleString()}) for this period, yielding a positive savings rate of ${Math.round(savingsRate)}%. At this rate, your Available General Cash of Rs. ${generalBalance.toLocaleString()} is fully self-sustaining, carrying a net runway forecast that spans indefinitely.`;
    } else {
      paragraph1 = `Your net burn rate averages Rs. ${Math.round(dailyBurnRate).toLocaleString()} per day. With outflows exceeding inflows, your Available General Cash of Rs. ${generalBalance.toLocaleString()} provides a forecasted runway buffer of approximately ${runwayDays} days. Adjusting discretionary allocations can push this date out.`;
    }

    // P2: Core Outflow Driver Analysis
    if (topCategory !== 'None' && topCategoryValue > 0) {
      const topPct = Math.round((topCategoryValue / (totalOutflows || 1)) * 100);
      const categoryStatus = ['Leisure', 'Lifestyle Wants', 'Dining Out'].includes(topCategory) ? 'discretionary (lifestyle)' : 'essential (needs)';
      
      paragraph2 = `The primary accelerator in your expense profile is "${topCategory}", consuming Rs. ${topCategoryValue.toLocaleString()} (${topPct}% of all outflows). Because this falls under ${categoryStatus} commitments, target adjustments here represent your highest leverage point. Trimming expenditure in this area by just 10% would redirect Rs. ${Math.round(topCategoryValue * 0.1).toLocaleString()} back into your general cash reserves.`;
    } else {
      paragraph2 = "Your transactions are evenly distributed. No single category accounts for an over-allocated share of cash outflows, reflecting solid baseline spending control.";
    }

    // P3: 2026 Trend Advisory & Proactive Playbook
    if (savingsRate >= 20) {
      paragraph3 = "2026 Fintech Playbook: Your savings rate beats the standard 20% mark. Instead of leaving excess reserves idle in a low-yield general account, consider locking in a portion into your Savings Goals or allocating funds toward low-risk Index ETFs (like VOO) to capture compounding market returns.";
    } else if (savingsRate > 0) {
      paragraph3 = "2026 Fintech Playbook: You have a positive cash margin, but it lies below the 20% benchmark. Automating a micro-deposit (e.g. Rs. 1,000) at the start of the week directly into your Emergency Buffer will bypass discretionary impulse spend and strengthen your buffer.";
    } else {
      paragraph3 = "2026 Fintech Playbook: Your current burn rate warrants structural adjustments. We recommend freezing new discretionary logs for 7 days and reviewing your active contracts. Prioritizing essential Needs will instantly restore runway security.";
    }

    return {
      paragraph1,
      paragraph2,
      paragraph3
    };
  }, [metrics, monthlyIncome, generalBalance]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
    >
      {/* Title & Filter Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--ink-color)', margin: 0 }}>Financial Reports</h1>
          <p style={{ color: 'var(--ink-light)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
            Burn velocity · Runway forecast · Category breakdown · AI narrative
          </p>
        </div>
        
        {/* Period Selector */}
        <div className="segmented-control" style={{ width: 'auto', minWidth: '280px' }}>
          {period === 'this-month' && <div className="active-indicator" style={{ width: '33.33%', transform: 'translateX(0%)', transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }} />}
          {period === 'last-30' && <div className="active-indicator" style={{ width: '33.33%', transform: 'translateX(100%)', transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }} />}
          {period === 'all-time' && <div className="active-indicator" style={{ width: '33.33%', transform: 'translateX(200%)', transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }} />}
          
          <button className={`segment-btn ${period === 'this-month' ? 'active' : ''}`} onClick={() => setPeriod('this-month')}>
            <span>This Month</span>
          </button>
          <button className={`segment-btn ${period === 'last-30' ? 'active' : ''}`} onClick={() => setPeriod('last-30')}>
            <span>Last 30 Days</span>
          </button>
          <button className={`segment-btn ${period === 'all-time' ? 'active' : ''}`} onClick={() => setPeriod('all-time')}>
            <span>All-Time</span>
          </button>
        </div>
      </div>

      {/* Reports Metrics Grid */}
      <div className="reports-grid">
        {/* Inflows */}
        <div className="report-metric-card">
          <div className="report-metric-title">Total Inflows</div>
          <div className="report-metric-val" style={{ color: 'var(--emerald-gains)' }}>
            Rs. {metrics.totalInflows.toLocaleString()}
          </div>
          <div className="report-metric-sub">
            {filteredTransactions.filter(t => t.type === 'income').length} income entries
          </div>
        </div>

        {/* Outflows */}
        <div className="report-metric-card">
          <div className="report-metric-title">Total Outflows</div>
          <div className="report-metric-val" style={{ color: 'var(--coral-losses)' }}>
            Rs. {metrics.totalOutflows.toLocaleString()}
          </div>
          <div className="report-metric-sub">
            {filteredTransactions.filter(t => t.type === 'expense').length} expense entries
          </div>
        </div>

        {/* Savings Rate */}
        <div className="report-metric-card">
          <div className="report-metric-title">Savings Rate</div>
          <div className="report-metric-val" style={{ color: metrics.savingsRate >= 20 ? 'var(--emerald-gains)' : metrics.savingsRate > 0 ? 'var(--ink-color)' : 'var(--coral-losses)' }}>
            {metrics.savingsRate.toFixed(1)}%
          </div>
          <div className="report-metric-sub">
            {metrics.savingsRate >= 20 ? 'Above 20% target ✓' : metrics.savingsRate > 0 ? 'Below 20% target' : 'Deficit period'}
          </div>
        </div>

        {/* Primary Driver */}
        <div className="report-metric-card">
          <div className="report-metric-title">Top Spend Category</div>
          <div className="report-metric-val" style={{ fontSize: '1.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 700 }}>
            {metrics.topCategory}
          </div>
          <div className="report-metric-sub">
            Rs. {metrics.topCategoryValue.toLocaleString()} · {metrics.totalOutflows > 0 ? Math.round((metrics.topCategoryValue / metrics.totalOutflows) * 100) : 0}% of outflows
          </div>
        </div>

        {/* Runway Forecast */}
        <div className="report-metric-card">
          <div className="report-metric-title">Cash Runway</div>
          <div className="report-metric-val" style={{ color: metrics.runwayDays === 'infinite' ? 'var(--emerald-gains)' : typeof metrics.runwayDays === 'number' && metrics.runwayDays < 30 ? 'var(--coral-losses)' : 'var(--ink-color)' }}>
            {metrics.runwayDays === 'infinite' ? '∞ Days' : `${metrics.runwayDays}d`}
          </div>
          <div className="report-metric-sub">
            {metrics.runwayDays === 'infinite' ? 'Net positive cash flow' : 'Before cash depletion'}
          </div>
        </div>

        {/* Daily Burn */}
        <div className="report-metric-card">
          <div className="report-metric-title">Daily Burn Rate</div>
          <div className="report-metric-val">
            Rs. {Math.round(metrics.dailyBurnRate).toLocaleString()}
          </div>
          <div className="report-metric-sub">
            Avg over {metrics.days} days
          </div>
        </div>
      </div>

      {/* Spending Trend Line Chart Card */}
      <div className="card flex flex-col justify-between" style={{ minHeight: '260px', position: 'relative' }}>
        <div>
          <div className="flex justify-between align-center">
            <div>
              <div className="card-title" style={{ margin: 0 }}>Spending Trend</div>
              <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                Day-by-day cash burn velocity. Hover over the points for detailed ledger sums.
              </p>
            </div>
            <div className="flex align-center gap-2">
              <span className="badge badge-gain">
                <TrendingUp size={12} style={{ marginRight: '4px' }} /> Peak: Rs. {Math.max(...trendData.map(p => p.amount), 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {trendData.length < 2 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', gap: '8px', color: 'var(--ink-light)' }}>
            <span style={{ fontSize: '1.5rem' }}>📈</span>
            <span style={{ fontSize: '0.9rem' }}>Not enough data in this period to display a trend.</span>
          </div>
        ) : (
          <div style={{ position: 'relative', width: '100%', height: '150px', marginTop: 'var(--space-4)' }}>
            <svg viewBox="0 0 500 150" width="100%" height="100%" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--emerald-gains)" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="var(--emerald-gains)" stopOpacity="0.00" />
                </linearGradient>
              </defs>
              
              {/* Grid lines */}
              <line x1="20" y1="20" x2="480" y2="20" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="3 3" />
              <line x1="20" y1="75" x2="480" y2="75" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="3 3" />
              <line x1="20" y1="130" x2="480" y2="130" stroke="var(--border-color)" strokeWidth="1" />

              {/* Shaded Area Underneath */}
              <path d={areaPath} fill="url(#trendGradient)" />

              {/* Trend Path Line */}
              <path d={linePath} fill="transparent" stroke="var(--emerald-gains)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* Guideline on Hover */}
              {hoveredPointIndex !== null && (
                <line
                  x1={20 + (hoveredPointIndex / (trendData.length - 1)) * 460}
                  y1="20"
                  x2={20 + (hoveredPointIndex / (trendData.length - 1)) * 460}
                  y2="130"
                  stroke="var(--ink-light)"
                  strokeWidth="0.8"
                  strokeDasharray="2 2"
                />
              )}

              {/* Data points */}
              {trendData.map((p, idx) => {
                const x = 20 + (idx / (trendData.length - 1)) * 460;
                const maxAmt = Math.max(...trendData.map(pt => pt.amount), 1000);
                const y = 130 - (p.amount / maxAmt) * 110;
                const isHovered = hoveredPointIndex === idx;

                return (
                  <g key={idx}>
                    {p.amount > 0 && (
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? 6 : 3}
                        fill={isHovered ? "var(--emerald-gains)" : "var(--card-bg)"}
                        stroke="var(--emerald-gains)"
                        strokeWidth="2"
                        style={{ transition: 'all 0.2s ease' }}
                      />
                    )}
                  </g>
                );
              })}

              {/* Hit-test vertical slices for hover */}
              {trendData.map((_, idx) => {
                const x = 20 + (idx / (trendData.length - 1)) * 460;
                const sliceWidth = 460 / (trendData.length - 1);
                return (
                  <rect
                    key={idx}
                    x={x - sliceWidth / 2}
                    y="0"
                    width={sliceWidth}
                    height="150"
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredPointIndex(idx)}
                    onMouseLeave={() => setHoveredPointIndex(null)}
                  />
                );
              })}
            </svg>

            {/* Hover details tooltip */}
            {hoveredPointIndex !== null && trendData[hoveredPointIndex] && (
              <div style={{
                position: 'absolute',
                left: `${((20 + (hoveredPointIndex / (trendData.length - 1)) * 460) / 500) * 100}%`,
                top: `${((130 - (trendData[hoveredPointIndex].amount / Math.max(...trendData.map(pt => pt.amount), 1000)) * 110) / 150) * 100 - 32}%`,
                transform: 'translate(-50%, -100%)',
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.06)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-md)',
                zIndex: 10,
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                whiteSpace: 'nowrap',
              }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', fontWeight: 550 }}>
                  {trendData[hoveredPointIndex].label}
                </span>
                <span className="num" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink-color)' }}>
                  Rs. {trendData[hoveredPointIndex].amount.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Visual Proportional Spend & AI Copilot Split */}
      <div className="grid grid-2 gap-6">
        {/* Proportional Spend Card */}
        <div className="card flex flex-col justify-between" style={{ minHeight: '380px' }}>
          <div>
            <div className="card-title">Outflows Distribution</div>
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem' }}>
              Proportion of expenses by logged category. Hover over segments for details.
            </p>

            {breakdownSegments.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', gap: '8px', color: 'var(--ink-light)' }}>
                <span style={{ fontSize: '1.5rem' }}>🍧</span>
                <span style={{ fontSize: '0.9rem' }}>No expense data in this period.</span>
              </div>
            ) : (
              <div className="flex gap-6 align-center flex-wrap" style={{ marginTop: 'var(--space-6)', justifyContent: 'space-around' }}>
                {/* SVG Donut Chart */}
                <div style={{ position: 'relative', width: '180px', height: '180px', flexShrink: 0 }}>
                  <svg width="100%" height="100%" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
                    {/* Background Track Circle */}
                    <circle
                      cx="90"
                      cy="90"
                      r="65"
                      fill="transparent"
                      stroke="var(--border-color)"
                      strokeWidth="14"
                    />

                    {(() => {
                      let accumulatedPercentage = 0;
                      return breakdownSegments.map((seg, idx) => {
                        const dashLength = (seg.percentage / 100) * 408.4; // Circumference = 2 * pi * 65 = 408.4
                        const dashOffset = 408.4 - (accumulatedPercentage / 100) * 408.4;
                        accumulatedPercentage += seg.percentage;
                        
                        const isHovered = activeSegmentIndex === idx;

                        return (
                          <circle
                            key={idx}
                            cx="90"
                            cy="90"
                            r="65"
                            fill="transparent"
                            stroke={seg.color}
                            strokeWidth={isHovered ? 20 : 14}
                            strokeDasharray={`${dashLength} ${408.4 - dashLength}`}
                            strokeDashoffset={dashOffset}
                            style={{
                              transition: 'stroke-width 0.3s cubic-bezier(0.16, 1, 0.3, 1), filter 0.3s',
                              cursor: 'pointer',
                              filter: isHovered ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' : 'none'
                            }}
                            onMouseEnter={() => setActiveSegmentIndex(idx)}
                            onMouseLeave={() => setActiveSegmentIndex(null)}
                          />
                        );
                      });
                    })()}
                  </svg>

                  {/* Center Text (Tooltip) */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    width: '110px',
                    alignItems: 'center',
                  }}>
                    <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-light)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                      {activeSegmentIndex !== null ? breakdownSegments[activeSegmentIndex].category : 'Total Outflows'}
                    </span>
                    <span className="num" style={{ fontSize: '1.1rem', fontWeight: 750, color: 'var(--ink-color)', marginTop: '2px' }}>
                      Rs. {activeSegmentIndex !== null ? breakdownSegments[activeSegmentIndex].amount.toLocaleString() : metrics.totalOutflows.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', marginTop: '1px' }}>
                      {activeSegmentIndex !== null ? `${Math.round(breakdownSegments[activeSegmentIndex].percentage)}%` : '100%'}
                    </span>
                  </div>
                </div>

                {/* Legend List */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  flexGrow: 1,
                  minWidth: '180px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  paddingRight: '6px',
                }}>
                  {breakdownSegments.map((seg, idx) => {
                    const isHovered = activeSegmentIndex === idx;
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: isHovered ? 'rgba(128,128,128,0.05)' : 'transparent',
                          transition: 'background-color 0.2s',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={() => setActiveSegmentIndex(idx)}
                        onMouseLeave={() => setActiveSegmentIndex(null)}
                      >
                        <div className="flex align-center" style={{ flexGrow: 1 }}>
                          <span className="legend-color-dot" style={{ backgroundColor: seg.color, marginRight: '8px' }} />
                          <span style={{ fontSize: '0.82rem', fontWeight: isHovered ? 650 : 550, color: 'var(--ink-color)' }}>
                            {seg.category}
                          </span>
                        </div>
                        <div className="num" style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', textAlign: 'right' }}>
                          Rs. {seg.amount.toLocaleString()} ({Math.round(seg.percentage)}%)
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Financial Copilot Insight Narrative */}
        <div className="ai-copilot-card">
          <div className="ai-copilot-header">
            <BrainCircuit size={18} style={{ color: 'var(--emerald-gains)' }} />
            <span className="ai-copilot-badge">AI Copilot • 2026 Engine</span>
          </div>
          
          <div className="ai-copilot-body">
            <p className="ai-copilot-p">
              {aiReportNarrative.paragraph1}
            </p>
            <p className="ai-copilot-p">
              {aiReportNarrative.paragraph2}
            </p>
            <p className="ai-copilot-p" style={{ borderTop: '1px dashed var(--border-color)', paddingTop: 'var(--space-3)', color: 'var(--ink-muted)', fontSize: '0.86rem' }}>
              {aiReportNarrative.paragraph3}
            </p>
          </div>
        </div>
      </div>

      {/* Searchable Transaction Ledger */}
      <div className="card-table">
        <div className="card-table-header flex justify-between align-center flex-wrap gap-4">
          <div className="card-title" style={{ margin: 0 }}>Reports Ledger</div>
          
          {/* Controls */}
          <div className="flex align-center gap-3 flex-wrap" style={{ flexGrow: 1, justifyItems: 'flex-end', justifyContent: 'flex-end' }}>
            {/* Search */}
            <div className="search-wrapper" style={{ maxWidth: '240px' }}>
              <Search size={14} className="search-input-icon" />
              <input
                type="text"
                placeholder="Search ledger..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field search-field"
                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
              />
            </div>

            {/* Sort Dropdown */}
            <div className="flex align-center gap-1">
              <SlidersHorizontal size={14} style={{ color: 'var(--ink-muted)' }} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="input-field"
                style={{ padding: '6px 24px 6px 10px', fontSize: '0.85rem', width: 'auto', appearance: 'none', background: 'var(--bg-color)' }}
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
              </select>
            </div>
          </div>
        </div>

        {searchedAndSortedTransactions.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', gap: '8px', color: 'var(--ink-light)' }}>
            <span style={{ fontSize: '1.5rem' }}>🔍</span>
            <span style={{ fontSize: '0.9rem' }}>{searchTerm ? `No entries matching “${searchTerm}”` : 'No transactions logged for this period.'}</span>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ width: '80px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {searchedAndSortedTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="num" style={{ color: 'var(--ink-muted)' }}>
                      {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td style={{ fontWeight: 550 }}>
                      {tx.description}
                    </td>
                    <td>
                      <span className="badge" style={{ 
                        backgroundColor: (CATEGORY_COLORS[tx.category] || DEFAULT_COLOR) + '15', 
                        color: CATEGORY_COLORS[tx.category] || DEFAULT_COLOR,
                        padding: '1px 6px',
                        fontSize: '0.72rem',
                        fontWeight: 650,
                      }}>
                        {tx.category}
                      </span>
                    </td>
                    <td className="num" style={{ 
                      textAlign: 'right', 
                      fontWeight: 600,
                      color: tx.type === 'income' ? 'var(--emerald-gains)' : 'var(--ink-color)'
                    }}>
                      {tx.type === 'income' ? '+' : '-'} Rs. {tx.amount.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '4px' }}>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ Modal — Edit Transaction ══════════════════════════════════════════ */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '1.5rem', padding: '1.5rem', width: '100%', maxWidth: '400px', overflowY: 'auto', maxHeight: '90vh' }}
          >
            <h3 style={{ fontSize: '1.5rem', fontWeight: 400, fontStyle: 'italic', fontFamily: 'var(--font-serif)', color: 'var(--ink-color)', marginBottom: '1rem' }}>Edit Entry</h3>

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

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="button" onClick={handleModalClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

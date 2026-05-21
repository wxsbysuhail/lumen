import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  BrainCircuit, 
  SlidersHorizontal
} from 'lucide-react';

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
}) => {
  const [period, setPeriod] = useState<'this-month' | 'last-30' | 'all-time'>('this-month');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

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
      className="flex flex-col gap-8"
    >
      {/* Title & Filter Header */}
      <div className="flex justify-between align-center flex-wrap gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="serif-title" style={{ fontSize: '2.5rem', fontWeight: 400, fontStyle: 'italic' }}>Financial Reports</h1>
          <p style={{ color: 'var(--ink-muted)' }}>
            Empathetic cash analytics, burn velocity, and predictive forecasting engine.
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
        {/* Outflows */}
        <div className="report-metric-card">
          <div className="report-metric-title">Outflows Sum</div>
          <div className="report-metric-val text-loss" style={{ color: 'var(--coral-losses)' }}>
            Rs. {metrics.totalOutflows.toLocaleString()}
          </div>
          <div className="report-metric-sub">
            Across {filteredTransactions.filter(t => t.type === 'expense').length} entries
          </div>
        </div>

        {/* Daily Burn Rate */}
        <div className="report-metric-card">
          <div className="report-metric-title">Daily Burn Velocity</div>
          <div className="report-metric-val">
            Rs. {Math.round(metrics.dailyBurnRate).toLocaleString()}
          </div>
          <div className="report-metric-sub">
            Calculated over {metrics.days} days
          </div>
        </div>

        {/* Primary Driver */}
        <div className="report-metric-card">
          <div className="report-metric-title">Primary Driver</div>
          <div className="report-metric-val" style={{ fontSize: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 650 }}>
            {metrics.topCategory}
          </div>
          <div className="report-metric-sub">
            Rs. {metrics.topCategoryValue.toLocaleString()} logged
          </div>
        </div>

        {/* Runway Forecast */}
        <div className="report-metric-card">
          <div className="report-metric-title">Predicted Runway</div>
          <div className="report-metric-val" style={{ color: metrics.runwayDays === 'infinite' ? 'var(--emerald-gains)' : 'var(--ink-color)' }}>
            {metrics.runwayDays === 'infinite' ? '∞ Days' : `${metrics.runwayDays} Days`}
          </div>
          <div className="report-metric-sub">
            {metrics.runwayDays === 'infinite' ? 'Balanced / Net Inflow' : 'Before cash depletion'}
          </div>
        </div>
      </div>

      {/* Visual Proportional Spend & AI Copilot Split */}
      <div className="grid grid-2 gap-6">
        {/* Proportional Spend Card */}
        <div className="card flex flex-col justify-between" style={{ minHeight: '340px' }}>
          <div>
            <div className="card-title">Outflows Distribution</div>
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem' }}>
              Horizontal visual proportion of expenses by logged category. Hover for details.
            </p>

            {breakdownSegments.length === 0 ? (
              <div className="flex flex-col align-center justify-center" style={{ padding: 'var(--space-12) 0', color: 'var(--ink-light)' }}>
                No expense distribution data available.
              </div>
            ) : (
              <>
                {/* Horizontal Segmented Bar Chart */}
                <div className="proportional-bar">
                  {breakdownSegments.map((seg, idx) => (
                    <div
                      key={idx}
                      className="proportional-segment"
                      style={{
                        width: `${seg.percentage}%`,
                        backgroundColor: seg.color,
                      }}
                      data-label={`${seg.category}: Rs. ${seg.amount.toLocaleString()} (${Math.round(seg.percentage)}%)`}
                    />
                  ))}
                </div>

                {/* Legend List */}
                <div className="legend-grid">
                  {breakdownSegments.map((seg, idx) => (
                    <div key={idx} className="legend-item">
                      <div className="flex align-center">
                        <span className="legend-color-dot" style={{ backgroundColor: seg.color }} />
                        <span style={{ fontSize: '0.88rem', fontWeight: 550 }}>{seg.category}</span>
                      </div>
                      <div className="num" style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
                        Rs. {seg.amount.toLocaleString()} ({Math.round(seg.percentage)}%)
                      </div>
                    </div>
                  ))}
                </div>
              </>
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
          <div className="flex flex-col align-center justify-center" style={{ padding: 'var(--space-12) 0', color: 'var(--ink-light)', gap: 'var(--space-2)' }}>
            <p style={{ fontSize: '0.9rem' }}>No ledger entries found matching criteria.</p>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};

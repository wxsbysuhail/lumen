import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Award, 
  ShieldAlert, 
  Lightbulb, 
  TrendingUp, 
  Info, 
  CheckCircle2, 
  AlertCircle,
  Coins,
  Shield,
  Zap,
  Target,
  Sparkles,
  TrendingDown,
  ArrowRight
} from 'lucide-react';

interface InsightsProps {
  savingsRate: number;
  balance: number; // overall net worth
  goal: string;
  monthlyIncome: number;
  totalExpenses: number;
  holdingsCount?: number;
}

export const Insights: React.FC<InsightsProps> = ({
  savingsRate,
  balance,
  goal,
  monthlyIncome,
  totalExpenses,
  holdingsCount = 0,
}) => {
  // Tabs: safety, growth, efficiency
  const [activeSubTab, setActiveSubTab] = useState<'safety' | 'growth' | 'efficiency'>('safety');
  
  // Main Tab: advisory vs playroom
  const [mainTab, setMainTab] = useState<'advisory' | 'playroom'>('advisory');

  // Playroom Sandbox Simulator States
  const [simRaise, setSimRaise] = useState(0);
  const [simExpense, setSimExpense] = useState(0);
  const [simSavingsTarget, setSimSavingsTarget] = useState(0);

  // Playroom Chart Hover/Scrubbing State
  const [playroomHoverIndex, setPlayroomHoverIndex] = useState<number | null>(null);
  const [playroomHoverPos, setPlayroomHoverPos] = useState({ x: 0, y: 0 });
  const playroomChartRef = useRef<SVGSVGElement | null>(null);
  
  // Emergency runway target (months)
  const [runwayTarget, setRunwayTarget] = useState<3 | 6 | 12>(3);

  // Lifestyle trim simulator state
  const [trimValue, setTrimValue] = useState(2500); // default Rs. 2,500 monthly trim

  // Calculate compound interest for trim
  const calculateCompoundTrim = (monthlyTrim: number, yrs: number) => {
    const rate = 0.08; // 8% expected market return
    const n = 12; // monthly compounding
    const r = rate / n;
    const t = yrs * n;
    
    // Formula for Future Value of Ordinary Annuity: PMT * [((1 + r)^t - 1) / r]
    const fv = monthlyTrim * ((Math.pow(1 + r, t) - 1) / r);
    return Math.round(fv);
  };

  // Runway details
  const actualOutflow = totalExpenses;
  const currentRunwayMonths = actualOutflow > 0 ? balance / actualOutflow : 0;
  const targetRequiredCash = actualOutflow * runwayTarget;
  const runwayPct = targetRequiredCash > 0 ? Math.min(100, (balance / targetRequiredCash) * 100) : 100;

  // Milestone triggers
  const milestones = [
    {
      id: 'onboard',
      label: 'Initial Setup Complete',
      desc: 'You configured your financial parameters and goals.',
      completed: true,
    },
    {
      id: 'runway',
      label: 'Runway Target Secured',
      desc: `Your wealth covers at least ${runwayTarget} months of contract outflows (Rs. ${targetRequiredCash.toLocaleString()}).`,
      completed: balance >= targetRequiredCash && actualOutflow > 0,
    },
    {
      id: 'saving',
      label: 'Savings Rate > 20%',
      desc: 'You retain a healthy percentage of your incoming monthly salary.',
      completed: savingsRate >= 20,
    },
    {
      id: 'investing',
      label: 'Portfolio Growth Started',
      desc: 'You logged assets and holdings in the Investments panel.',
      completed: holdingsCount > 0,
    },
  ];

  // Category advice lists
  const renderCategoryCards = () => {
    const cards = [];

    if (activeSubTab === 'safety') {
      // Emergency buffers
      const emergencyBuffer = totalExpenses * 3;
      if (balance < emergencyBuffer) {
        cards.push({
          title: 'Secure Your Safety Runway First',
          body: `Based on your Rs. ${Math.round(totalExpenses).toLocaleString()} monthly outflows, we suggest locking Rs. ${Math.round(emergencyBuffer).toLocaleString()} (3 months) in your Emergency Fund. This prevents liquidating stocks during downturns.`,
          icon: ShieldAlert,
          color: 'var(--coral-losses)',
          bgColor: 'var(--coral-losses-bg)',
          tag: 'Required',
        });
      } else {
        cards.push({
          title: 'Liquidity Reserve is Solid',
          body: 'Your total net assets comfortably cover your basic emergency needs. Additional funds can be allocated directly into market wealth compounders.',
          icon: Shield,
          color: 'var(--emerald-gains)',
          bgColor: 'var(--emerald-gains-bg)',
          tag: 'Healthy',
        });
      }

      // Debt focus
      if (goal === 'debt') {
        cards.push({
          title: 'Avalanche vs. Snowball',
          body: 'For optimal wealth accumulation, prioritize high-interest debts (Avalanche) first. Psychologically, paying off smaller balances (Snowball) provides early wins. Pick one and remain disciplined.',
          icon: Coins,
          color: 'var(--ink-color)',
          bgColor: 'rgba(10, 10, 10, 0.05)',
          tag: 'Debt Payoff',
        });
      }

      // Inflation nudge
      cards.push({
        title: 'The Hidden Cost of Excess Cash',
        body: 'Keeping cash in basic checking accounts guarantees a purchasing power loss of ~3-5% yearly due to inflation. Only keep your target runway in cash; invest the rest.',
        icon: Info,
        color: 'var(--ink-light)',
        bgColor: 'rgba(10, 10, 10, 0.03)',
        tag: 'Inflation Warning',
      });
    }

    if (activeSubTab === 'growth') {
      // Stock watchlists
      cards.push({
        title: 'Diversification Principle',
        body: 'Do not concentrate all your growth in a single stock like Apple or MCB. Diversified mutual funds or global index ETFs (like VOO) distribute risks across hundreds of firms.',
        icon: TrendingUp,
        color: 'var(--emerald-gains)',
        bgColor: 'var(--emerald-gains-bg)',
        tag: 'Allocation',
      });

      // Compound timeline
      cards.push({
        title: 'Rule of 72 & Asset Doubling',
        body: 'Divide 72 by your annual yield percentage. At a standard 8% stock yield, your invested capital doubles every 9 years. At 12%, it doubles every 6 years.',
        icon: Lightbulb,
        color: 'var(--ink-color)',
        bgColor: 'rgba(10, 10, 10, 0.05)',
        tag: 'Math Rule',
      });

      // Time vs. Timing
      cards.push({
        title: 'Consistent DCA Outperforms Timing',
        body: 'Attempting to buy during market bottoms usually fails. Setting up a monthly automated SIP (Systematic Investment Plan) ensures you buy more shares when prices are cheap and fewer when expensive.',
        icon: Zap,
        color: 'var(--ink-light)',
        bgColor: 'rgba(10, 10, 10, 0.03)',
        tag: 'DCA Strategy',
      });
    }

    if (activeSubTab === 'efficiency') {
      // Savings rate
      if (savingsRate >= 20) {
        cards.push({
          title: `Elite Saver Tier (${Math.round(savingsRate)}% Rate)`,
          body: `You are retaining Rs. ${Math.round(monthlyIncome * (savingsRate / 100)).toLocaleString()} of your Rs. ${Math.round(monthlyIncome).toLocaleString()} monthly inflow. This margin dramatically shortens your timeline to absolute financial independence.`,
          icon: Award,
          color: 'var(--emerald-gains)',
          bgColor: 'var(--emerald-gains-bg)',
          tag: 'Top Tier',
        });
      } else {
        cards.push({
          title: 'Increase Retention to 20%',
          body: `Aiming for a 20% savings rate (Rs. ${Math.round(monthlyIncome * 0.2).toLocaleString()} / month) is the standard fintech recommendation. Small lifestyle trims on wants, like subscription services or dining, make a massive difference.`,
          icon: AlertCircle,
          color: 'var(--coral-losses)',
          bgColor: 'var(--coral-losses-bg)',
          tag: 'Optimization',
        });
      }

      // 50/30/20 optimization
      cards.push({
        title: 'Customize Your Split Parameters',
        body: 'The 50/30/20 rule is a guide. If you have aggressive financial independence goals, challenge yourself to adjust the parameters to 40% Needs, 20% Wants, 40% Savings.',
        icon: Target,
        color: 'var(--ink-color)',
        bgColor: 'rgba(10, 10, 10, 0.05)',
        tag: 'Budget Strategy',
      });
    }

    return cards;
  };

  const currentCards = renderCategoryCards();

  // ==========================================
  // PLAYROOM SANDBOX SIMULATION CALCULATIONS
  // ==========================================

  // Projections: 10 years (120 months) compounded monthly
  const computeProjections = () => {
    const rate = 0.08; // 8% expected annual market return
    const monthlyRate = rate / 12;
    const months = 10 * 12;

    const currentSavings = Math.max(0, monthlyIncome - totalExpenses);
    const simulatedSavings = Math.max(
      0,
      (monthlyIncome + simRaise) - (totalExpenses + simExpense) - simSavingsTarget
    );

    const pointsList: { year: number; currentNW: number; simulatedNW: number }[] = [];
    let curCurrent = balance;
    let curSimulated = balance;

    pointsList.push({
      year: 0,
      currentNW: Math.round(curCurrent),
      simulatedNW: Math.round(curSimulated),
    });

    for (let m = 1; m <= months; m++) {
      curCurrent = curCurrent * (1 + monthlyRate) + currentSavings;
      curSimulated = curSimulated * (1 + monthlyRate) + simulatedSavings;

      if (m % 12 === 0) {
        pointsList.push({
          year: m / 12,
          currentNW: Math.round(curCurrent),
          simulatedNW: Math.round(curSimulated),
        });
      }
    }

    return pointsList;
  };

  const simPoints = computeProjections();
  const simCurrentNW10Yr = simPoints[10].currentNW;
  const simSimulatedNW10Yr = simPoints[10].simulatedNW;
  const nwDelta = simSimulatedNW10Yr - simCurrentNW10Yr;

  const currentSavingsVal = Math.max(0, monthlyIncome - totalExpenses);
  const currentSavingsRateVal = monthlyIncome > 0 ? (currentSavingsVal / monthlyIncome) * 100 : 0;

  const simulatedIncomeVal = monthlyIncome + simRaise;
  const simulatedExpenseVal = totalExpenses + simExpense;
  const simulatedSavingsVal = Math.max(0, simulatedIncomeVal - simulatedExpenseVal - simSavingsTarget);
  const simulatedSavingsRateVal = simulatedIncomeVal > 0 ? (simulatedSavingsVal / simulatedIncomeVal) * 100 : 0;

  const currentRunwayVal = totalExpenses > 0 ? balance / totalExpenses : 0;
  const simulatedRunwayVal = simulatedExpenseVal > 0 ? balance / simulatedExpenseVal : 0;

  // Chart setup
  const simWidth = 800;
  const simHeight = 260;
  const simPadding = 24;

  const allSimNWs = simPoints.flatMap(p => [p.currentNW, p.simulatedNW]);
  const maxSimNW = Math.max(...allSimNWs, 1000);
  const minSimNW = Math.min(...allSimNWs, 0);

  const currentPathString = simPoints.map((p, idx) => {
    const x = simPadding + (idx / 10) * (simWidth - 2 * simPadding);
    const ratio = maxSimNW === minSimNW ? 0.5 : (p.currentNW - minSimNW) / (maxSimNW - minSimNW);
    const y = simHeight - simPadding - ratio * (simHeight - 2 * simPadding);
    return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const simulatedPathString = simPoints.map((p, idx) => {
    const x = simPadding + (idx / 10) * (simWidth - 2 * simPadding);
    const ratio = maxSimNW === minSimNW ? 0.5 : (p.simulatedNW - minSimNW) / (maxSimNW - minSimNW);
    const y = simHeight - simPadding - ratio * (simHeight - 2 * simPadding);
    return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const simulatedAreaString = simPoints.length > 0 
    ? `${simulatedPathString} L ${simPadding + (10 / 10) * (simWidth - 2 * simPadding)} ${simHeight - simPadding} L ${simPadding} ${simHeight - simPadding} Z` 
    : '';

  const handlePlayroomMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!playroomChartRef.current) return;
    const rect = playroomChartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relativeX = (x / rect.width) * simWidth;
    
    const stepWidth = (simWidth - 2 * simPadding) / 10;
    
    let closestIdx = 0;
    let closestDist = Infinity;
    for (let i = 0; i <= 10; i++) {
      const px = simPadding + i * stepWidth;
      const dist = Math.abs(px - relativeX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    }

    setPlayroomHoverIndex(closestIdx);
    
    const targetX = simPadding + closestIdx * stepWidth;
    setPlayroomHoverPos({
      x: (targetX / simWidth) * rect.width,
      y: (50 / simHeight) * rect.height, // top-aligned
    });
  };

  const handlePlayroomMouseLeave = () => {
    setPlayroomHoverIndex(null);
  };

  const transition = { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={transition}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--ink-color)', margin: 0 }}>
          {mainTab === 'advisory' ? 'Financial Advisory Center' : 'Budget Simulation Playroom'}
        </h1>
        <p style={{ color: 'var(--ink-light)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
          {mainTab === 'advisory'
            ? 'Personalised runway tools, milestone tracker & categorised wealth advice.'
            : 'Adjust hypothetical parameters to visualise your 10-year net worth trajectory.'}
        </p>
      </div>

      {/* Main Tab Switcher */}
      <div className="segmented-control" style={{ maxWidth: '380px' }}>
        <button
          type="button"
          onClick={() => setMainTab('advisory')}
          className={`segment-btn ${mainTab === 'advisory' ? 'active' : ''}`}
        >
          <Lightbulb size={14} />
          <span>Advisory Center</span>
          {mainTab === 'advisory' && (
            <motion.div
              layoutId="main-tab-indicator"
              className="active-indicator"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </button>
        <button
          type="button"
          onClick={() => setMainTab('playroom')}
          className={`segment-btn ${mainTab === 'playroom' ? 'active' : ''}`}
        >
          <Sparkles size={14} style={{ color: mainTab === 'playroom' ? 'var(--emerald-gains)' : 'inherit' }} />
          <span>Insights Playroom</span>
          {mainTab === 'playroom' && (
            <motion.div
              layoutId="main-tab-indicator"
              className="active-indicator"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mainTab === 'advisory' ? (
          <motion.div
            key="advisory"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={transition}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}
          >
            {/* Left Hand: Interactive Tools Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Tool 1: Emergency Runway Calculator */}
              <div className="card flex flex-col gap-4">
                <div className="flex justify-between align-center">
                  <span className="card-title" style={{ margin: 0 }}>Emergency Runway Visualizer</span>
                  <div className="flex gap-2">
                    {([3, 6, 12] as const).map((m) => (
                      <button
                        key={m}
                        className={`btn ${runwayTarget === m ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                        onClick={() => setRunwayTarget(m)}
                      >
                        {m}m Target
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between" style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
                    <span>Actual Runway:</span>
                    <span className="num" style={{ fontWeight: 600 }}>
                      {actualOutflow > 0 ? `${currentRunwayMonths.toFixed(1)} months` : 'Infinity (No Outflows)'}
                    </span>
                  </div>
                  <div className="flex justify-between" style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
                    <span>Target Required (Rs.):</span>
                    <span className="num" style={{ fontWeight: 600 }}>
                      Rs. {targetRequiredCash.toLocaleString()}
                    </span>
                  </div>

                  {/* Progress runway */}
                  <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden', marginTop: 'var(--space-2)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${runwayPct}%` }}
                      transition={transition}
                      style={{
                        height: '100%',
                        borderRadius: '3px',
                        backgroundColor: runwayPct >= 100 ? 'var(--emerald-gains)' : 'var(--coral-losses)',
                      }}
                    />
                  </div>
                  <div className="flex justify-between" style={{ fontSize: '0.78rem', color: 'var(--ink-light)' }}>
                    <span>Wealth: Rs. {balance.toLocaleString()}</span>
                    <span>{Math.round(runwayPct)}% Secured</span>
                  </div>
                </div>
              </div>

              {/* Tool 2: Lifestyle Trim compound simulator */}
              <div className="card flex flex-col gap-4">
                <div className="flex justify-between align-center">
                  <span className="card-title" style={{ margin: 0 }}>Wants Trim Simulator</span>
                  <span className="num" style={{ fontSize: '0.92rem', fontWeight: 600 }}>Rs. {trimValue.toLocaleString()} / mo</span>
                </div>
                
                <p style={{ color: 'var(--ink-muted)', fontSize: '0.82rem' }}>
                  Simulate sacrificing monthly lifestyle wants. Invest the saved cash into index funds yielding 8%.
                </p>

                <input
                  type="range"
                  min="500"
                  max="15000"
                  step="500"
                  value={trimValue}
                  onChange={(e) => setTrimValue(parseInt(e.target.value))}
                  className="custom-slider"
                  style={{ margin: 'var(--space-2) 0' }}
                />

                <div className="grid grid-3 gap-4" style={{ marginTop: 'var(--space-2)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-4)' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--ink-light)' }}>10 Years</span>
                    <h4 className="num" style={{ fontWeight: 650, fontSize: '1.05rem', marginTop: '2px' }}>
                      Rs. {calculateCompoundTrim(trimValue, 10).toLocaleString()}
                    </h4>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--ink-light)' }}>20 Years</span>
                    <h4 className="num" style={{ fontWeight: 650, fontSize: '1.05rem', marginTop: '2px' }}>
                      Rs. {calculateCompoundTrim(trimValue, 20).toLocaleString()}
                    </h4>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--ink-light)' }}>30 Years</span>
                    <h4 className="num" style={{ fontWeight: 650, fontSize: '1.05rem', marginTop: '2px' }}>
                      Rs. {calculateCompoundTrim(trimValue, 30).toLocaleString()}
                    </h4>
                  </div>
                </div>
              </div>

              {/* Checklist Milestone feed */}
              <div className="card flex flex-col gap-4">
                <span className="card-title" style={{ margin: 0 }}>Financial Milestones</span>
                <div className="flex flex-col gap-3">
                  {milestones.map((m) => (
                    <div key={m.id} className="flex align-start gap-3" style={{ opacity: m.completed ? 1 : 0.45 }}>
                      <div style={{ color: m.completed ? 'var(--emerald-gains)' : 'var(--ink-light)', marginTop: '2px' }}>
                        {m.completed ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                      </div>
                      <div className="flex flex-col">
                        <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{m.label}</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>{m.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right Hand: Categorized Tips Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Sub Navigation Category Tabs */}
              <div className="segmented-control">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('safety')}
                  className={`segment-btn ${activeSubTab === 'safety' ? 'active' : ''}`}
                >
                  <Shield size={14} />
                  <span>Capital Safety</span>
                  {activeSubTab === 'safety' && (
                    <motion.div
                      layoutId="active-subtab-indicator"
                      className="active-indicator"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('growth')}
                  className={`segment-btn ${activeSubTab === 'growth' ? 'active' : ''}`}
                >
                  <TrendingUp size={14} />
                  <span>Wealth Growth</span>
                  {activeSubTab === 'growth' && (
                    <motion.div
                      layoutId="active-subtab-indicator"
                      className="active-indicator"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('efficiency')}
                  className={`segment-btn ${activeSubTab === 'efficiency' ? 'active' : ''}`}
                >
                  <Target size={14} />
                  <span>Budget Efficiency</span>
                  {activeSubTab === 'efficiency' && (
                    <motion.div
                      layoutId="active-subtab-indicator"
                      className="active-indicator"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              </div>

              <div style={{ minHeight: '340px' }} className="flex flex-col gap-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSubTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={transition}
                    className="flex flex-col gap-4"
                  >
                    {currentCards.map((card: any, idx) => {
                      const Icon = card.icon;
                      return (
                        <div key={idx} className="insight-card">
                          <div className="insight-icon-wrapper" style={{ backgroundColor: card.bgColor, color: card.color }}>
                            <Icon size={18} />
                          </div>
                          <div className="insight-content">
                            <div className="insight-header">
                              <h4 className="insight-card-title">{card.title}</h4>
                              <span className="insight-badge" style={{ backgroundColor: card.bgColor, color: card.color }}>
                                {card.tag}
                              </span>
                            </div>
                            <p className="insight-body">
                              {card.body}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="playroom"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={transition}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
          >
            {/* Chart Card */}
            <div className="card flex flex-col gap-4" style={{ position: 'relative', overflow: 'visible', backgroundColor: 'var(--card-bg)' }}>
              <div className="flex justify-between align-center">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span className="card-title" style={{ margin: 0 }}>Hypothetical 10-Year Projection</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                    Comparing current budget path with your sandbox choices (8% CAGR)
                  </span>
                </div>
                <div className="flex align-center gap-4">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
                    <span style={{ display: 'inline-block', width: '12px', height: '0px', borderTop: '2px dashed var(--ink-light)' }} />
                    <span style={{ color: 'var(--ink-muted)' }}>Current Path</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
                    <span style={{ display: 'inline-block', width: '12px', height: '3px', backgroundColor: 'var(--emerald-gains)', borderRadius: '1.5px' }} />
                    <span style={{ color: 'var(--emerald-gains)', fontWeight: 600 }}>Simulated Path</span>
                  </div>
                </div>
              </div>

              {/* Chart Render */}
              <div style={{ position: 'relative', width: '100%', minHeight: `${simHeight}px`, overflow: 'visible' }}>
                <svg
                  ref={playroomChartRef}
                  viewBox={`0 0 ${simWidth} ${simHeight}`}
                  width="100%"
                  height="100%"
                  onMouseMove={handlePlayroomMouseMove}
                  onMouseLeave={handlePlayroomMouseLeave}
                  style={{ overflow: 'visible', cursor: 'crosshair' }}
                >
                  {/* Grid horizontal guidelines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = simHeight - simPadding - ratio * (simHeight - 2 * simPadding);
                    return (
                      <line
                        key={ratio}
                        x1={simPadding}
                        y1={y}
                        x2={simWidth - simPadding}
                        y2={y}
                        stroke="var(--border-color)"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                    );
                  })}

                  {/* Area under curve for simulated */}
                  {simPoints.length > 0 && (
                    <path
                      d={simulatedAreaString}
                      fill="url(#sim-glow-gradient)"
                      opacity="0.25"
                    />
                  )}

                  <defs>
                    <linearGradient id="sim-glow-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--emerald-gains)" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="var(--emerald-gains)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Current Path Line */}
                  <motion.path
                    d={currentPathString}
                    fill="none"
                    stroke="var(--ink-light)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    opacity="0.6"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.2 }}
                  />

                  {/* Simulated Path Line */}
                  <motion.path
                    d={simulatedPathString}
                    fill="none"
                    stroke="var(--emerald-gains)"
                    strokeWidth="3"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                  />

                  {/* Hover guidelines and markers */}
                  {playroomHoverIndex !== null && (
                    <>
                      <line
                        x1={simPadding + (playroomHoverIndex / 10) * (simWidth - 2 * simPadding)}
                        y1={simPadding}
                        x2={simPadding + (playroomHoverIndex / 10) * (simWidth - 2 * simPadding)}
                        y2={simHeight - simPadding}
                        stroke="var(--border-color)"
                        strokeWidth="1.2"
                        strokeDasharray="2 2"
                      />
                      
                      {/* Current marker */}
                      <circle
                        cx={simPadding + (playroomHoverIndex / 10) * (simWidth - 2 * simPadding)}
                        cy={simHeight - simPadding - ((simPoints[playroomHoverIndex].currentNW - minSimNW) / (maxSimNW - minSimNW)) * (simHeight - 2 * simPadding)}
                        r="4"
                        fill="var(--ink-light)"
                        stroke="var(--card-bg)"
                        strokeWidth="1.5"
                      />

                      {/* Simulated marker */}
                      <circle
                        cx={simPadding + (playroomHoverIndex / 10) * (simWidth - 2 * simPadding)}
                        cy={simHeight - simPadding - ((simPoints[playroomHoverIndex].simulatedNW - minSimNW) / (maxSimNW - minSimNW)) * (simHeight - 2 * simPadding)}
                        r="6"
                        fill="var(--emerald-gains)"
                        stroke="var(--card-bg)"
                        strokeWidth="2"
                      />
                    </>
                  )}
                </svg>

                {/* Floating Scrubbing Tooltip */}
                {playroomHoverIndex !== null && (
                  <div style={{
                    position: 'absolute',
                    top: `${playroomHoverPos.y - 76}px`,
                    left: `${playroomHoverPos.x}px`,
                    transform: 'translateX(-50%)',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--ink-color)',
                    border: '1px solid var(--border-color)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                    pointerEvents: 'none',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                    zIndex: 10,
                  }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', fontWeight: 600 }}>Year {playroomHoverIndex} Projection</span>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem' }}>
                      <span style={{ color: 'var(--ink-muted)' }}>Current: Rs. {simPoints[playroomHoverIndex].currentNW.toLocaleString()}</span>
                      <span style={{ color: 'var(--emerald-gains)', fontWeight: 600 }}>Simulated: Rs. {simPoints[playroomHoverIndex].simulatedNW.toLocaleString()}</span>
                    </div>
                    {simPoints[playroomHoverIndex].simulatedNW - simPoints[playroomHoverIndex].currentNW !== 0 && (
                      <span style={{ 
                        fontSize: '0.75rem', 
                        color: simPoints[playroomHoverIndex].simulatedNW > simPoints[playroomHoverIndex].currentNW ? 'var(--emerald-gains)' : 'var(--coral-losses)',
                        fontWeight: 650,
                        borderTop: '1px solid var(--border-color)',
                        paddingTop: '2px',
                        marginTop: '2px'
                      }}>
                        {simPoints[playroomHoverIndex].simulatedNW > simPoints[playroomHoverIndex].currentNW ? '+' : ''}
                        Rs. {(simPoints[playroomHoverIndex].simulatedNW - simPoints[playroomHoverIndex].currentNW).toLocaleString()}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* X Axis indicators */}
              <div className="flex justify-between" style={{ fontSize: '0.78rem', color: 'var(--ink-light)', padding: '0 var(--space-4)' }}>
                <span>Year 0 (Today)</span>
                <span>Year 5</span>
                <span>Year 10</span>
              </div>
            </div>

            {/* Sliders and Metrics Row */}
            <div className="grid grid-2 gap-6">

              {/* Sliders Card */}
              <div className="card flex flex-col gap-6">
                <span className="card-title" style={{ margin: 0 }}>Sandbox Controls</span>
                
                {/* Slider 1: Raise */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between align-center">
                    <label className="input-label" style={{ margin: 0 }}>Hypothetical Raise / Income Increase</label>
                    <span className="num" style={{ fontSize: '0.85rem', fontWeight: 600, color: simRaise > 0 ? 'var(--emerald-gains)' : 'var(--ink-muted)' }}>
                      {simRaise > 0 ? `+Rs. ${simRaise.toLocaleString()} / mo` : 'No Raise'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100000"
                    step="1000"
                    value={simRaise}
                    onChange={(e) => setSimRaise(parseInt(e.target.value))}
                    className="custom-slider"
                  />
                </div>

                {/* Slider 2: New Lease / Expense */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between align-center">
                    <label className="input-label" style={{ margin: 0 }}>Add New Monthly Expense (e.g. Car, Rent)</label>
                    <span className="num" style={{ fontSize: '0.85rem', fontWeight: 600, color: simExpense > 0 ? 'var(--coral-losses)' : 'var(--ink-muted)' }}>
                      {simExpense > 0 ? `+Rs. ${simExpense.toLocaleString()} / mo` : 'No New Outflows'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50000"
                    step="500"
                    value={simExpense}
                    onChange={(e) => setSimExpense(parseInt(e.target.value))}
                    className="custom-slider"
                  />
                </div>

                {/* Slider 3: New Savings Target */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between align-center">
                    <label className="input-label" style={{ margin: 0 }}>Start New Savings Target (e.g. Vacation, House)</label>
                    <span className="num" style={{ fontSize: '0.85rem', fontWeight: 600, color: simSavingsTarget > 0 ? 'var(--emerald-gains)' : 'var(--ink-muted)' }}>
                      {simSavingsTarget > 0 ? `+Rs. ${simSavingsTarget.toLocaleString()} / mo` : 'No New Goals'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30000"
                    step="500"
                    value={simSavingsTarget}
                    onChange={(e) => setSimSavingsTarget(parseInt(e.target.value))}
                    className="custom-slider"
                  />
                </div>

                {/* Reset Button */}
                <div style={{ marginTop: 'auto', paddingTop: 'var(--space-2)' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: '100%', fontSize: '0.82rem' }}
                    onClick={() => {
                      setSimRaise(0);
                      setSimExpense(0);
                      setSimSavingsTarget(0);
                    }}
                  >
                    Reset Sandbox Parameters
                  </button>
                </div>
              </div>

              {/* Metrics Card */}
              <div className="card flex flex-col gap-6">
                <span className="card-title" style={{ margin: 0 }}>Simulation Impact (10-Year View)</span>

                <div className="flex flex-col gap-4" style={{ flex: 1 }}>
                  
                  {/* Metric 1: Net Worth Delta */}
                  <div style={{
                    padding: '16px',
                    borderRadius: '16px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--nav-pill-bg)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', fontWeight: 600, textTransform: 'uppercase' }}>10-Yr Net Worth Impact</span>
                    <div className="flex align-baseline justify-between" style={{ marginTop: '4px' }}>
                      <span className="num" style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                        Rs. {simSimulatedNW10Yr.toLocaleString()}
                      </span>
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: 650,
                        padding: '3px 8px',
                        borderRadius: '12px',
                        backgroundColor: nwDelta >= 0 ? 'var(--emerald-gains-bg)' : 'var(--coral-losses-bg)',
                        color: nwDelta >= 0 ? 'var(--emerald-gains)' : 'var(--coral-losses)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}>
                        {nwDelta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {nwDelta >= 0 ? '+' : ''}Rs. {Math.abs(nwDelta).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Metric 2: Savings Rate */}
                  <div style={{
                    padding: '16px',
                    borderRadius: '16px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--nav-pill-bg)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Monthly Savings Rate</span>
                    <div className="flex align-center justify-between" style={{ marginTop: '4px' }}>
                      <div className="flex align-center gap-2">
                        <span className="num" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink-muted)' }}>
                          {Math.round(currentSavingsRateVal)}%
                        </span>
                        <ArrowRight size={14} style={{ color: 'var(--ink-light)' }} />
                        <span className="num" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink-color)' }}>
                          {Math.round(simulatedSavingsRateVal)}%
                        </span>
                      </div>
                      {Math.round(simulatedSavingsRateVal - currentSavingsRateVal) !== 0 && (
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 650,
                          color: (simulatedSavingsRateVal - currentSavingsRateVal) >= 0 ? 'var(--emerald-gains)' : 'var(--coral-losses)'
                        }}>
                          {(simulatedSavingsRateVal - currentSavingsRateVal) >= 0 ? '+' : ''}
                          {Math.round(simulatedSavingsRateVal - currentSavingsRateVal)}% delta
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metric 3: Emergency Runway */}
                  <div style={{
                    padding: '16px',
                    borderRadius: '16px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--nav-pill-bg)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Safety Emergency Runway</span>
                    <div className="flex align-center justify-between" style={{ marginTop: '4px' }}>
                      <div className="flex align-center gap-2">
                        <span className="num" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink-muted)' }}>
                          {currentRunwayVal.toFixed(1)}m
                        </span>
                        <ArrowRight size={14} style={{ color: 'var(--ink-light)' }} />
                        <span className="num" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink-color)' }}>
                          {simulatedRunwayVal.toFixed(1)}m
                        </span>
                      </div>
                      {Math.abs(simulatedRunwayVal - currentRunwayVal) >= 0.05 && (
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 650,
                          color: (simulatedRunwayVal - currentRunwayVal) >= 0 ? 'var(--emerald-gains)' : 'var(--coral-losses)'
                        }}>
                          {(simulatedRunwayVal - currentRunwayVal) >= 0 ? '+' : ''}
                          {(simulatedRunwayVal - currentRunwayVal).toFixed(1)}m delta
                        </span>
                      )}
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

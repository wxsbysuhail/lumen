import React, { useState } from 'react';
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
  Target
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

  const transition = { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={transition}
      className="flex flex-col gap-8"
    >
      <div className="flex flex-col gap-2">
        <h1 className="serif-title" style={{ fontSize: '2.5rem', fontWeight: 400, fontStyle: 'italic' }}>Financial Advisory Center</h1>
        <p style={{ color: 'var(--ink-muted)' }}>
          Interactive tools and customized columns based on your runway levels, goals, and savings rates.
        </p>
      </div>

      <div className="grid grid-2 gap-8">
        
        {/* Left Hand: Interactive Tools Column */}
        <div className="flex flex-col gap-6">
          
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
        <div className="flex flex-col gap-6">
          {/* Sub Navigation Category Tabs */}
          <div className="segmented-control">
            <button
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

      </div>
    </motion.div>
  );
};

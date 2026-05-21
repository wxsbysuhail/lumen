import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Onboarding } from './components/Onboarding';
import { Dashboard } from './components/Dashboard';
import { CashFlow } from './components/CashFlow';
import { SavingsTracker } from './components/SavingsTracker';
import { Investments } from './components/Investments';
import { WealthProjection } from './components/WealthProjection';
import { Insights } from './components/Insights';
import { Reports } from './components/Reports';
import { Login } from './components/Login';
import { supabase } from './supabaseClient';

import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  LineChart,
  Lightbulb,
  TrendingUp,
  RotateCcw,
  PieChart,
  LogOut,
} from 'lucide-react';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
}

interface RecurringItem {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: 'needs' | 'wants' | 'savings' | 'income';
}

interface SavingsBucket {
  id: string;
  name: string;
  target: number;
  current: number;
  monthlyContribution: number;
}

interface Holding {
  ticker: string;
  shares: number;
  avgPrice: number;
}

const emojiAvatars = [
  { emoji: '🚀', label: 'Rocket', gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
  { emoji: '🦊', label: 'Fox', gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' },
  { emoji: '🦁', label: 'Lion', gradient: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' },
  { emoji: '🦄', label: 'Unicorn', gradient: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)' },
  { emoji: '🐼', label: 'Panda', gradient: 'linear-gradient(135deg, #cfd9df 0%, #e2ebf0 100%)' },
  { emoji: '🦉', label: 'Owl', gradient: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)' },
];

const getAvatarGradient = (avatarUrl: string) => {
  if (!avatarUrl || avatarUrl.startsWith('http')) return 'transparent';
  const match = emojiAvatars.find(a => a.emoji === avatarUrl);
  return match ? match.gradient : 'linear-gradient(135deg, #111827 0%, #374151 100%)';
};

/** Renders the correct avatar content: Google photo, emoji, or initials */
const AvatarContent = ({ avatarUrl, size = 28 }: { avatarUrl: string; size?: number }) => {
  if (avatarUrl.startsWith('http')) {
    return (
      <img
        src={avatarUrl}
        alt="avatar"
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
      />
    );
  }
  if (avatarUrl.startsWith('initials:')) {
    return <span style={{ fontSize: `${size * 0.35}px`, fontWeight: 650, color: '#fff' }}>{avatarUrl.split(':')[1]}</span>;
  }
  return <span style={{ fontSize: `${size * 0.55}px`, lineHeight: 1 }}>{avatarUrl}</span>;
};

function App() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  
  // Profile Data
  const [profileName, setProfileName] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('🚀');

  // Financial State
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [generalBalance, setGeneralBalance] = useState(0);
  const [primaryGoal, setPrimaryGoal] = useState('save');
  
  // Ledger
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Cash Flow Contracts
  const [recurringIncomeItems, setRecurringIncomeItems] = useState<RecurringItem[]>([]);
  const [recurringExpenseItems, setRecurringExpenseItems] = useState<RecurringItem[]>([]);
  
  // Savings buckets
  const [buckets, setBuckets] = useState<SavingsBucket[]>([]);
  
  // Investment holdings
  const [holdings, setHoldings] = useState<Holding[]>([]);

  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'cashflow' | 'savings' | 'investments' | 'projection' | 'reports' | 'insights'>('dashboard');

  // Auth monitoring
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadUserData(session.user.id);
      } else {
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadUserData(session.user.id);
      } else {
        setIsOnboarded(false);
        setMonthlyIncome(0);
        setGeneralBalance(0);
        setTransactions([]);
        setRecurringIncomeItems([]);
        setRecurringExpenseItems([]);
        setBuckets([]);
        setHoldings([]);
        setProfileName('');
        setProfileAvatar('🚀');
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (userId: string) => {
    setAuthLoading(true);
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error loading profile:', profileError);
      }

      if (profile?.onboarding_completed) {
        setProfileName(profile.name);
        setProfileAvatar(profile.avatar_url || '🚀');
        setMonthlyIncome(Number(profile.monthly_income));
        setGeneralBalance(Number(profile.current_balance));
        setPrimaryGoal(profile.primary_goal || 'save');
        setIsOnboarded(true);

        // Load details in parallel
        const [txRes, recRes, bucketRes, holdingRes] = await Promise.all([
          supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
          supabase.from('recurring_items').select('*').eq('user_id', userId),
          supabase.from('savings_buckets').select('*').eq('user_id', userId),
          supabase.from('holdings').select('*').eq('user_id', userId),
        ]);

        if (txRes.data) {
          setTransactions(txRes.data.map((tx: any) => ({
            id: tx.id,
            description: tx.description,
            amount: Number(tx.amount),
            type: tx.type,
            category: tx.category,
            date: tx.date,
          })));
        }

        if (recRes.data) {
          const items = recRes.data.map((item: any) => ({
            id: item.id,
            description: item.description,
            amount: Number(item.amount),
            type: item.type,
            category: item.category,
          }));
          setRecurringIncomeItems(items.filter((i: any) => i.type === 'income'));
          setRecurringExpenseItems(items.filter((i: any) => i.type === 'expense'));
        }

        if (bucketRes.data) {
          setBuckets(bucketRes.data.map((b: any) => ({
            id: b.id,
            name: b.name,
            target: Number(b.target),
            current: Number(b.current),
            monthlyContribution: Number(b.monthly_contribution),
          })));
        }

        if (holdingRes.data) {
          setHoldings(holdingRes.data.map((h: any) => ({
            ticker: h.ticker,
            shares: Number(h.shares),
            avgPrice: Number(h.avg_price),
          })));
        }
      } else {
        setIsOnboarded(false);
      }
    } catch (err) {
      console.error('Error fetching user tables:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOnboardingComplete = async (data: {
    name: string;
    avatarUrl: string;
    monthlyIncome: number;
    currentBalance: number;
    primaryGoal: string;
  }) => {
    if (!session?.user) return;
    setAuthLoading(true);

    const userId = session.user.id;

    try {
      // Save profile only — no seeded data, user fills everything from scratch
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          name: data.name,
          avatar_url: data.avatarUrl,
          monthly_income: data.monthlyIncome,
          current_balance: data.currentBalance,
          primary_goal: data.primaryGoal,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      setProfileName(data.name);
      setProfileAvatar(data.avatarUrl);
      setMonthlyIncome(data.monthlyIncome);
      setGeneralBalance(data.currentBalance);
      setPrimaryGoal(data.primaryGoal);
      setTransactions([]);
      setRecurringIncomeItems([]);
      setRecurringExpenseItems([]);
      setBuckets([]);
      setHoldings([]);
      setIsOnboarded(true);
    } catch (err) {
      console.error('Error saving profile during onboarding:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAddTransaction = async (desc: string, amount: number, type: 'income' | 'expense', category: string) => {
    if (!session?.user) return;
    try {
      const newTx = {
        user_id: session.user.id,
        description: desc,
        amount,
        type,
        category,
        date: new Date().toISOString(),
      };

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .insert([newTx])
        .select();
      if (txError) throw txError;

      const insertedTx: Transaction = {
        id: txData[0].id,
        description: txData[0].description,
        amount: Number(txData[0].amount),
        type: txData[0].type,
        category: txData[0].category,
        date: txData[0].date,
      };

      setTransactions(prev => [insertedTx, ...prev]);

      const balanceDiff = type === 'income' ? amount : -amount;
      const newBalance = generalBalance + balanceDiff;
      setGeneralBalance(newBalance);

      await supabase
        .from('profiles')
        .update({ current_balance: newBalance })
        .eq('id', session.user.id);
    } catch (err) {
      console.error('Error logging transaction:', err);
    }
  };

  const handleAddRecurring = async (desc: string, amount: number, type: 'income' | 'expense', category: any) => {
    if (!session?.user) return;
    try {
      const newItem = {
        user_id: session.user.id,
        description: desc,
        amount,
        type,
        category,
      };

      const { data: itemData, error: itemError } = await supabase
        .from('recurring_items')
        .insert([newItem])
        .select();
      if (itemError) throw itemError;

      const insertedItem: RecurringItem = {
        id: itemData[0].id,
        description: itemData[0].description,
        amount: Number(itemData[0].amount),
        type: itemData[0].type,
        category: itemData[0].category,
      };

      if (type === 'income') {
        setRecurringIncomeItems(prev => [...prev, insertedItem]);
      } else {
        setRecurringExpenseItems(prev => [...prev, insertedItem]);
      }
    } catch (err) {
      console.error('Error inserting contract:', err);
    }
  };

  const handleRemoveRecurring = async (id: string) => {
    if (!session?.user) return;
    try {
      const { error } = await supabase
        .from('recurring_items')
        .delete()
        .eq('id', id);
      if (error) throw error;

      setRecurringIncomeItems(prev => prev.filter(i => i.id !== id));
      setRecurringExpenseItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error('Error removing contract:', err);
    }
  };

  const handleUpdateRecurring = async (
    id: string,
    desc: string,
    amount: number,
    type: 'income' | 'expense',
    category: 'needs' | 'wants' | 'savings' | 'income'
  ) => {
    if (!session?.user) return;
    try {
      const updatedData = {
        description: desc,
        amount,
        type,
        category: type === 'income' ? 'income' : category,
      };

      const { error } = await supabase
        .from('recurring_items')
        .update(updatedData)
        .eq('id', id);
      if (error) throw error;

      const updatedItem: RecurringItem = {
        id,
        description: desc,
        amount,
        type,
        category: type === 'income' ? 'income' : category,
      };

      const inIncome = recurringIncomeItems.find(i => i.id === id);
      const inExpense = recurringExpenseItems.find(i => i.id === id);
      const oldItem = inIncome || inExpense;
      if (!oldItem) return;

      if (oldItem.type === type) {
        if (type === 'income') {
          setRecurringIncomeItems(prev => prev.map(i => i.id === id ? updatedItem : i));
        } else {
          setRecurringExpenseItems(prev => prev.map(i => i.id === id ? updatedItem : i));
        }
      } else {
        if (oldItem.type === 'income') {
          setRecurringIncomeItems(prev => prev.filter(i => i.id !== id));
          setRecurringExpenseItems(prev => [...prev, updatedItem]);
        } else {
          setRecurringExpenseItems(prev => prev.filter(i => i.id !== id));
          setRecurringIncomeItems(prev => [...prev, updatedItem]);
        }
      }
    } catch (err) {
      console.error('Error updating contract:', err);
    }
  };

  const handleAddBucket = async (name: string, target: number, monthly: number) => {
    if (!session?.user) return;
    try {
      const newBucket = {
        user_id: session.user.id,
        name,
        target,
        current: 0,
        monthly_contribution: monthly,
      };

      const { data: bucketData, error } = await supabase
        .from('savings_buckets')
        .insert([newBucket])
        .select();
      if (error) throw error;

      const insertedBucket: SavingsBucket = {
        id: bucketData[0].id,
        name: bucketData[0].name,
        target: Number(bucketData[0].target),
        current: Number(bucketData[0].current),
        monthlyContribution: Number(bucketData[0].monthly_contribution),
      };
      setBuckets(prev => [...prev, insertedBucket]);
    } catch (err) {
      console.error('Error adding bucket:', err);
    }
  };

  const handleUpdateBucket = async (id: string, name: string, target: number, monthly: number) => {
    if (!session?.user) return;
    try {
      const updatedData = {
        name,
        target,
        monthly_contribution: monthly,
      };

      const { error } = await supabase
        .from('savings_buckets')
        .update(updatedData)
        .eq('id', id);
      if (error) throw error;

      setBuckets(prev => prev.map(b => b.id === id ? { ...b, name, target, monthlyContribution: monthly } : b));
    } catch (err) {
      console.error('Error updating bucket:', err);
    }
  };

  const handleDeleteBucket = async (id: string) => {
    if (!session?.user) return;
    const bucket = buckets.find(b => b.id === id);
    if (!bucket) return;

    try {
      const { error } = await supabase
        .from('savings_buckets')
        .delete()
        .eq('id', id);
      if (error) throw error;

      if (bucket.current > 0) {
        const newBalance = generalBalance + bucket.current;
        setGeneralBalance(newBalance);
        
        await supabase
          .from('profiles')
          .update({ current_balance: newBalance })
          .eq('id', session.user.id);

        await handleAddTransaction(`Goal Refund: ${bucket.name}`, bucket.current, 'income', 'Goal Allocations');
      }

      setBuckets(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error('Error deleting bucket:', err);
    }
  };

  const handleDepositToBucket = async (id: string, amount: number) => {
    if (!session?.user) return;
    const bucket = buckets.find(b => b.id === id);
    if (!bucket) return;

    try {
      const newBucketCurrent = bucket.current + amount;
      const newGeneralBalance = generalBalance - amount;

      const { error: bucketError } = await supabase
        .from('savings_buckets')
        .update({ current: newBucketCurrent })
        .eq('id', id);
      if (bucketError) throw bucketError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ current_balance: newGeneralBalance })
        .eq('id', session.user.id);
      if (profileError) throw profileError;

      setBuckets(prev => prev.map(b => b.id === id ? { ...b, current: newBucketCurrent } : b));
      setGeneralBalance(newGeneralBalance);

      await handleAddTransaction(`Goal Transfer: ${bucket.name}`, amount, 'expense', 'Goal Allocations');
    } catch (err) {
      console.error('Error depositing to bucket:', err);
    }
  };

  const handleTrade = async (ticker: string, shares: number, priceInMur: number, type: 'buy' | 'sell') => {
    if (!session?.user) return;
    const totalCost = shares * priceInMur;
    
    const existingHolding = holdings.find(h => h.ticker === ticker);
    let newShares = 0;
    let newAvg = 0;

    if (type === 'buy') {
      newShares = (existingHolding?.shares || 0) + shares;
      newAvg = existingHolding 
        ? (((existingHolding.shares * existingHolding.avgPrice) + totalCost) / newShares)
        : priceInMur;
    } else {
      newShares = (existingHolding?.shares || 0) - shares;
      newAvg = existingHolding?.avgPrice || priceInMur;
    }

    try {
      if (newShares <= 0) {
        const { error: deleteError } = await supabase
          .from('holdings')
          .delete()
          .eq('user_id', session.user.id)
          .eq('ticker', ticker);
        if (deleteError) throw deleteError;
        
        setHoldings(prev => prev.filter(h => h.ticker !== ticker));
      } else {
        const { error: upsertError } = await supabase
          .from('holdings')
          .upsert({
            user_id: session.user.id,
            ticker,
            shares: newShares,
            avg_price: newAvg,
          });
        if (upsertError) throw upsertError;

        setHoldings(prev => {
          const match = prev.find(h => h.ticker === ticker);
          if (match) {
            return prev.map(h => h.ticker === ticker ? { ticker, shares: newShares, avgPrice: newAvg } : h);
          } else {
            return [...prev, { ticker, shares: newShares, avgPrice: newAvg }];
          }
        });
      }

      const balanceDiff = type === 'buy' ? -totalCost : totalCost;
      const newBalance = generalBalance + balanceDiff;
      setGeneralBalance(newBalance);

      await supabase
        .from('profiles')
        .update({ current_balance: newBalance })
        .eq('id', session.user.id);

      await handleAddTransaction(
        type === 'buy' ? `Bought ${shares} shares of ${ticker}` : `Sold ${shares} shares of ${ticker}`,
        totalCost,
        type === 'buy' ? 'expense' : 'income',
        'Investments'
      );
    } catch (err) {
      console.error('Error handling transaction trade:', err);
    }
  };

  const handleReset = async () => {
    if (!session?.user) return;
    if (confirm("Reset application data and restart onboarding?")) {
      setAuthLoading(true);
      try {
        await supabase.from('holdings').delete().eq('user_id', session.user.id);
        await supabase.from('savings_buckets').delete().eq('user_id', session.user.id);
        await supabase.from('transactions').delete().eq('user_id', session.user.id);
        await supabase.from('recurring_items').delete().eq('user_id', session.user.id);
        
        await supabase.from('profiles').update({
          name: '',
          avatar_url: '🚀',
          monthly_income: 0,
          current_balance: 0,
          primary_goal: 'save',
          onboarding_completed: false
        }).eq('id', session.user.id);

        setMonthlyIncome(0);
        setGeneralBalance(0);
        setTransactions([]);
        setRecurringIncomeItems([]);
        setRecurringExpenseItems([]);
        setBuckets([]);
        setHoldings([]);
        setProfileName('');
        setProfileAvatar('🚀');
        setIsOnboarded(false);
        setActiveTab('dashboard');
      } catch (err) {
        console.error('Error resetting data:', err);
      } finally {
        setAuthLoading(false);
      }
    }
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  // Calculations for dashboard
  const activeInflowSum = recurringIncomeItems.reduce((acc, i) => acc + i.amount, 0);
  const activeOutflowSum = recurringExpenseItems.reduce((acc, i) => acc + i.amount, 0);
  const activeRetained = activeInflowSum - activeOutflowSum;
  const currentSavingsRate = activeInflowSum > 0 ? (activeRetained / activeInflowSum) * 100 : 0;

  const getHoldingsValue = () => {
    const stockPrices: Record<string, number> = {
      'MCB.MU': 345.50,
      'SBM.MU': 6.22,
      'AAPL': 189.45 * 46.5,
      'VOO': 478.20 * 46.5,
      'MSFT': 415.60 * 46.5,
    };
    return holdings.reduce((acc, h) => {
      const price = stockPrices[h.ticker] || h.avgPrice;
      return acc + (h.shares * price);
    }, 0);
  };

  const totalBucketSavings = buckets.reduce((acc, b) => acc + b.current, 0);
  const totalNetWorth = generalBalance + totalBucketSavings + getHoldingsValue();

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-color)',
        gap: 'var(--space-4)',
      }}>
        <div className="hero-glow pulsing-glow" />
        <h1 className="serif-title" style={{ fontSize: '2.5rem', fontStyle: 'italic', margin: 0 }}>Lumen</h1>
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          border: '2px solid var(--border-color)',
          borderTopColor: 'var(--ink-color)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>Loading your financial workspace...</span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      {!session ? (
        <Login onAuthSuccess={() => {}} />
      ) : !isOnboarded ? (
        <Onboarding onComplete={handleOnboardingComplete} />
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          {/* Header */}
          <header className="nav-header">
            <div className="nav-container">
              <a href="#" className="logo-text" style={{ flex: 1 }}>Lumen</a>

              {/* Centered pill navigation */}
              <nav className="nav-pill">
                <button className={`nav-pill-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
                <button className={`nav-pill-item ${activeTab === 'cashflow' ? 'active' : ''}`} onClick={() => setActiveTab('cashflow')}>Cash Flow</button>
                <button className={`nav-pill-item ${activeTab === 'savings' ? 'active' : ''}`} onClick={() => setActiveTab('savings')}>Savings</button>
                <button className={`nav-pill-item ${activeTab === 'investments' ? 'active' : ''}`} onClick={() => setActiveTab('investments')}>Invest</button>
                <button className={`nav-pill-item ${activeTab === 'projection' ? 'active' : ''}`} onClick={() => setActiveTab('projection')}>Wealth</button>
                <button className={`nav-pill-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>Reports</button>
                <button className={`nav-pill-item ${activeTab === 'insights' ? 'active' : ''}`} onClick={() => setActiveTab('insights')}>Insights</button>
              </nav>

              {/* User profile chip & action icons */}
              <div className="flex align-center gap-2" style={{ flex: 1, justifyContent: 'flex-end' }}>
                {/* Avatar + first name */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 10px 3px 3px',
                  borderRadius: '20px',
                  background: 'rgba(10,10,10,0.03)',
                  border: '1px solid var(--border-color)',
                  flexShrink: 0,
                }}>
                  <div style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: getAvatarGradient(profileAvatar),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}>
                    <AvatarContent avatarUrl={profileAvatar} size={26} />
                  </div>
                  <span style={{
                    fontSize: '0.82rem',
                    fontWeight: 550,
                    color: 'var(--ink-color)',
                    whiteSpace: 'nowrap',
                    maxWidth: '90px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {profileName.split(' ')[0]}
                  </span>
                </div>

                <button className="icon-btn" onClick={handleReset} title="Reset Data">
                  <RotateCcw size={14} />
                </button>
                <button className="icon-btn" onClick={handleSignOut} title="Sign Out">
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          </header>

          {/* Core Panel Content */}
          <main className="container">
            <div className="hero-glow" />
            
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <Dashboard
                  key="dashboard"
                  income={activeInflowSum || monthlyIncome}
                  balance={totalNetWorth}
                  goal={primaryGoal}
                  transactions={transactions}
                  onAddTransaction={handleAddTransaction}
                  savingsRate={currentSavingsRate}
                />
              )}

              {activeTab === 'cashflow' && (
                <CashFlow
                  key="cashflow"
                  incomeItems={recurringIncomeItems}
                  expenseItems={recurringExpenseItems}
                  onAddRecurring={handleAddRecurring}
                  onRemoveRecurring={handleRemoveRecurring}
                  onUpdateRecurring={handleUpdateRecurring}
                />
              )}

              {activeTab === 'savings' && (
                <SavingsTracker
                  key="savings"
                  buckets={buckets}
                  generalBalance={generalBalance}
                  onAddBucket={handleAddBucket}
                  onDepositToBucket={handleDepositToBucket}
                  onUpdateBucket={handleUpdateBucket}
                  onDeleteBucket={handleDeleteBucket}
                />
              )}

              {activeTab === 'investments' && (
                <Investments
                  key="investments"
                  generalBalance={generalBalance}
                  holdings={holdings}
                  onTrade={handleTrade}
                />
              )}

              {activeTab === 'projection' && (
                <WealthProjection
                  key="projection"
                  initialNetWorth={totalNetWorth}
                  monthlyDeposit={Math.max(0, activeRetained)}
                />
              )}

              {activeTab === 'reports' && (
                <Reports
                  key="reports"
                  transactions={transactions}
                  monthlyIncome={activeInflowSum || monthlyIncome}
                  generalBalance={generalBalance}
                />
              )}

              {activeTab === 'insights' && (
                <Insights
                  key="insights"
                  savingsRate={currentSavingsRate}
                  balance={totalNetWorth}
                  goal={primaryGoal}
                  monthlyIncome={activeInflowSum || monthlyIncome}
                  totalExpenses={activeOutflowSum}
                  holdingsCount={holdings.length}
                />
              )}
            </AnimatePresence>
          </main>

          {/* Floating bottom pill navigation */}
          <nav className="mobile-pill-nav">
            <button className={`mobile-pill-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')} title="Dashboard"><LayoutDashboard size={18} /></button>
            <button className={`mobile-pill-item ${activeTab === 'cashflow' ? 'active' : ''}`} onClick={() => setActiveTab('cashflow')} title="Cash Flow"><ArrowLeftRight size={18} /></button>
            <button className={`mobile-pill-item ${activeTab === 'savings' ? 'active' : ''}`} onClick={() => setActiveTab('savings')} title="Savings"><Target size={18} /></button>
            <button className={`mobile-pill-item ${activeTab === 'investments' ? 'active' : ''}`} onClick={() => setActiveTab('investments')} title="Invest"><TrendingUp size={18} /></button>
            <button className={`mobile-pill-item ${activeTab === 'projection' ? 'active' : ''}`} onClick={() => setActiveTab('projection')} title="Wealth"><LineChart size={18} /></button>
            <button className={`mobile-pill-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')} title="Reports"><PieChart size={18} /></button>
            <button className={`mobile-pill-item ${activeTab === 'insights' ? 'active' : ''}`} onClick={() => setActiveTab('insights')} title="Insights"><Lightbulb size={18} /></button>
          </nav>

        </div>
      )}
    </>
  );
}

export default App;

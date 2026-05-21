import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Grid,
  X,
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
  const [showMoreHub, setShowMoreHub] = useState(false);
  const [hideNav, setHideNav] = useState(false);

  // PWA Installation Prompts States
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const dismissPrompt = () => {
    localStorage.setItem('lumen-pwa-prompt-dismissed', 'true');
    setShowIOSPrompt(false);
    setShowAndroidPrompt(false);
  };

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User installation outcome: ${outcome}`);
    setDeferredPrompt(null);
    setShowAndroidPrompt(false);
  };

  const isSecondaryTabActive = ['projection', 'reports', 'insights'].includes(activeTab);
  const isMoreActive = isSecondaryTabActive || showMoreHub;

  const navigateTo = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setShowMoreHub(false);
  };

  const toggleMoreHub = () => {
    setShowMoreHub(prev => !prev);
  };

  // Scroll detection to auto-hide bottom navigation bar on mobile
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateScrollDirection = () => {
      const scrollY = window.scrollY;

      if (Math.abs(scrollY - lastScrollY) < 15) {
        ticking = false;
        return;
      }

      if (scrollY > lastScrollY && scrollY > 80) {
        // Scrolling down -> hide
        setHideNav(true);
      } else {
        // Scrolling up -> show
        setHideNav(false);
      }

      // Always show if scrolled to the very bottom or top of the page
      if (window.innerHeight + scrollY >= document.documentElement.scrollHeight - 30 || scrollY < 10) {
        setHideNav(false);
      }

      lastScrollY = scrollY > 0 ? scrollY : 0;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // PWA installation prompt triggers
  useEffect(() => {
    const isDismissed = localStorage.getItem('lumen-pwa-prompt-dismissed') === 'true';
    if (isDismissed) return;

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isStandalone = 
      (window.navigator as any).standalone || 
      window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isStandalone) {
      // Delay iOS display to look natural after onboarding/login
      const timer = setTimeout(() => {
        setShowIOSPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isStandalone) {
        setShowAndroidPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

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
                <button
                  className={`nav-pill-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                  onClick={() => navigateTo('dashboard')}
                >
                  {activeTab === 'dashboard' && (
                    <motion.div
                      layoutId="activeTabBg"
                      className="nav-pill-active-bg"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span>Dashboard</span>
                </button>

                <button
                  className={`nav-pill-item ${activeTab === 'cashflow' ? 'active' : ''}`}
                  onClick={() => navigateTo('cashflow')}
                >
                  {activeTab === 'cashflow' && (
                    <motion.div
                      layoutId="activeTabBg"
                      className="nav-pill-active-bg"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span>Cash Flow</span>
                </button>

                <button
                  className={`nav-pill-item ${activeTab === 'savings' ? 'active' : ''}`}
                  onClick={() => navigateTo('savings')}
                >
                  {activeTab === 'savings' && (
                    <motion.div
                      layoutId="activeTabBg"
                      className="nav-pill-active-bg"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span>Savings</span>
                </button>

                <button
                  className={`nav-pill-item ${activeTab === 'investments' ? 'active' : ''}`}
                  onClick={() => navigateTo('investments')}
                >
                  {activeTab === 'investments' && (
                    <motion.div
                      layoutId="activeTabBg"
                      className="nav-pill-active-bg"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span>Invest</span>
                </button>

                <button
                  className={`nav-pill-item ${isMoreActive ? 'active' : ''}`}
                  onClick={toggleMoreHub}
                >
                  {isMoreActive && (
                    <motion.div
                      layoutId="activeTabBg"
                      className="nav-pill-active-bg"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    More <Grid size={12} />
                  </span>
                </button>
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
          <motion.nav
            className="mobile-pill-nav"
            animate={{
              y: hideNav ? 100 : 0,
              x: '-50%'
            }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 26
            }}
          >
            <button
              className={`mobile-pill-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => navigateTo('dashboard')}
              title="Dashboard"
            >
              {activeTab === 'dashboard' && (
                <motion.div
                  layoutId="activeMobileTabBg"
                  className="mobile-pill-active-bg"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <LayoutDashboard size={18} />
            </button>

            <button
              className={`mobile-pill-item ${activeTab === 'cashflow' ? 'active' : ''}`}
              onClick={() => navigateTo('cashflow')}
              title="Cash Flow"
            >
              {activeTab === 'cashflow' && (
                <motion.div
                  layoutId="activeMobileTabBg"
                  className="mobile-pill-active-bg"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <ArrowLeftRight size={18} />
            </button>

            <button
              className={`mobile-pill-item ${activeTab === 'savings' ? 'active' : ''}`}
              onClick={() => navigateTo('savings')}
              title="Savings"
            >
              {activeTab === 'savings' && (
                <motion.div
                  layoutId="activeMobileTabBg"
                  className="mobile-pill-active-bg"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Target size={18} />
            </button>

            <button
              className={`mobile-pill-item ${activeTab === 'investments' ? 'active' : ''}`}
              onClick={() => navigateTo('investments')}
              title="Invest"
            >
              {activeTab === 'investments' && (
                <motion.div
                  layoutId="activeMobileTabBg"
                  className="mobile-pill-active-bg"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <TrendingUp size={18} />
            </button>

            <button
              className={`mobile-pill-item ${isMoreActive ? 'active' : ''}`}
              onClick={toggleMoreHub}
              title="More Options"
            >
              {isMoreActive && (
                <motion.div
                  layoutId="activeMobileTabBg"
                  className="mobile-pill-active-bg"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Grid size={18} />
            </button>
          </motion.nav>

          {/* Glassmorphic More Hub Overlay */}
          <AnimatePresence>
            {showMoreHub && (
              <>
                {/* Backdrop */}
                <motion.div
                  className="hub-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'linear' }}
                  onClick={() => setShowMoreHub(false)}
                />

                {/* Sheet */}
                <motion.div
                  className="hub-sheet"
                  initial={{ y: '100%', x: '-50%' }}
                  animate={{ y: 0, x: '-50%' }}
                  exit={{ y: '100%', x: '-50%' }}
                  transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.38 }}
                >
                  <div className="hub-sheet-drag-handle" />
                  
                  <div className="hub-sheet-header">
                    <h3 className="hub-sheet-title">More Hub</h3>
                    <button className="hub-sheet-close" onClick={() => setShowMoreHub(false)}>
                      <X size={18} />
                    </button>
                  </div>

                  <div className="hub-sheet-content">
                    <div className="hub-grid">
                      <button
                        className={`hub-card ${activeTab === 'projection' ? 'active' : ''}`}
                        onClick={() => navigateTo('projection')}
                      >
                        <div className="hub-card-icon-wrapper">
                          <LineChart size={20} />
                        </div>
                        <div className="hub-card-text">
                          <div className="hub-card-name">Wealth Projection</div>
                          <div className="hub-card-desc">Simulate compound interest and future wealth growth.</div>
                        </div>
                      </button>

                      <button
                        className={`hub-card ${activeTab === 'reports' ? 'active' : ''}`}
                        onClick={() => navigateTo('reports')}
                      >
                        <div className="hub-card-icon-wrapper">
                          <PieChart size={20} />
                        </div>
                        <div className="hub-card-text">
                          <div className="hub-card-name">Reports & Charts</div>
                          <div className="hub-card-desc">Visual breakdown of transactions and income allocation.</div>
                        </div>
                      </button>

                      <button
                        className={`hub-card ${activeTab === 'insights' ? 'active' : ''}`}
                        onClick={() => navigateTo('insights')}
                      >
                        <div className="hub-card-icon-wrapper">
                          <Lightbulb size={20} />
                        </div>
                        <div className="hub-card-text">
                          <div className="hub-card-name">Financial Insights</div>
                          <div className="hub-card-desc">Automated rules of thumb and customized optimization tips.</div>
                        </div>
                      </button>
                    </div>

                    <hr className="hub-divider" />

                    <div className="hub-actions-grid">
                      <button className="hub-action-btn danger" onClick={() => { setShowMoreHub(false); handleReset(); }}>
                        <RotateCcw size={14} />
                        <span>Reset Application</span>
                      </button>
                      <button className="hub-action-btn" onClick={() => { setShowMoreHub(false); handleSignOut(); }}>
                        <LogOut size={14} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* PWA Install Prompts */}
          <AnimatePresence>
            {showIOSPrompt && (
              <motion.div
                className="pwa-prompt"
                initial={{ opacity: 0, y: 50, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, y: 50, x: '-50%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              >
                <div className="pwa-prompt-header">
                  <div className="pwa-prompt-logo-title">
                    <div className="pwa-prompt-logo">
                      <svg width="16" height="16" viewBox="0 0 48 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fill="currentColor" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z" />
                      </svg>
                    </div>
                    <span className="pwa-prompt-title">Install Lumen</span>
                  </div>
                  <button className="pwa-prompt-close" onClick={dismissPrompt} aria-label="Dismiss">
                    <X size={14} />
                  </button>
                </div>
                <div className="pwa-prompt-body">
                  Install Lumen on your iPhone for a fast, full-screen native mobile experience.
                </div>
                <div className="pwa-prompt-steps">
                  <div className="pwa-prompt-step">
                    <div className="pwa-prompt-step-icon">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                        <polyline points="16 6 12 2 8 6" />
                        <line x1="12" y1="2" x2="12" y2="15" />
                      </svg>
                    </div>
                    <span>1. Tap the Share button in Safari</span>
                  </div>
                  <div className="pwa-prompt-step">
                    <div className="pwa-prompt-step-icon">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="12" y1="8" x2="12" y2="16" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                      </svg>
                    </div>
                    <span>2. Scroll down and select "Add to Home Screen"</span>
                  </div>
                </div>
              </motion.div>
            )}

            {showAndroidPrompt && (
              <motion.div
                className="pwa-prompt"
                initial={{ opacity: 0, y: 50, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, y: 50, x: '-50%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              >
                <div className="pwa-prompt-header">
                  <div className="pwa-prompt-logo-title">
                    <div className="pwa-prompt-logo">
                      <svg width="16" height="16" viewBox="0 0 48 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fill="currentColor" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z" />
                      </svg>
                    </div>
                    <span className="pwa-prompt-title">Install Lumen</span>
                  </div>
                  <button className="pwa-prompt-close" onClick={dismissPrompt} aria-label="Dismiss">
                    <X size={14} />
                  </button>
                </div>
                <div className="pwa-prompt-body">
                  Add Lumen to your home screen for quick, offline access and a native feel.
                </div>
                <button className="pwa-prompt-btn" onClick={handleAndroidInstall}>
                  Install App
                </button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      )}
    </>
  );
}

export default App;

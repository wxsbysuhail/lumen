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
import { JointSync } from './components/JointSync';
import { AICoach } from './components/AICoach';
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
  Download,
  Sun,
  Moon,
  Users,
  Bot,
} from 'lucide-react';

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
  user_id?: string;
}

interface RecurringItem {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
}

interface SavingsBucket {
  id: string;
  name: string;
  target: number;
  current: number;
  monthlyContribution: number;
  priority?: 'high' | 'medium' | 'low';
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

  // Exchange Rates State
  const [exchangeRates, setExchangeRates] = useState<{
    USD: number;
    MUR: number;
    EUR: number;
  }>({
    USD: 1.0,
    MUR: 46.50,
    EUR: 0.92,
  });

  // Fetch Live Rates
  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(res => {
        if (!res.ok) throw new Error('API load error');
        return res.json();
      })
      .then(data => {
        if (data && data.rates && data.rates.MUR && data.rates.EUR) {
          setExchangeRates({
            USD: 1.0,
            MUR: parseFloat(data.rates.MUR),
            EUR: parseFloat(data.rates.EUR),
          });
        }
      })
      .catch(err => {
        console.warn('Live exchange rates lookup failed, using local fallbacks:', err);
      });
  }, []);

  // Joint Sync States
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [jointLink, setJointLink] = useState<any>(null);
  const [incomingInvite, setIncomingInvite] = useState<any>(null);
  const [outgoingInvite, setOutgoingInvite] = useState<any>(null);

  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'cashflow' | 'savings' | 'investments' | 'projection' | 'reports' | 'insights' | 'joint' | 'assistant'>('dashboard');
  const [showMoreHub, setShowMoreHub] = useState(false);
  const [hideNav, setHideNav] = useState(false);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('lumen-theme') as 'light' | 'dark') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('lumen-theme', theme);
  }, [theme]);

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

  const handleTriggerInstallFromHub = () => {
    setShowMoreHub(false);
    
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    
    if (isIOS) {
      setShowIOSPrompt(true);
    } else if (deferredPrompt) {
      setShowAndroidPrompt(true);
    } else {
      alert("To install Lumen: \n\n• On iOS Safari: Tap the Share button (bottom menu bar) and select 'Add to Home Screen'.\n• On Android Chrome / Desktop: Tap the browser menu (three dots) and select 'Add to Home Screen' or 'Install App'.");
    }
  };

  const isSecondaryTabActive = ['projection', 'reports', 'insights', 'joint'].includes(activeTab);
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

  const checkAndApplyRecurringIncomes = async (
    profile: any,
    recurringItems: any[],
    userId: string
  ) => {
    // 1. Calculate latest occurred 26th
    const now = new Date();
    let targetYear = now.getFullYear();
    let targetMonth = now.getMonth(); // 0-indexed
    if (now.getDate() < 26) {
      targetMonth -= 1;
      if (targetMonth < 0) {
        targetMonth = 11;
        targetYear -= 1;
      }
    }
    const latest26thStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
    const lastApplied = profile.last_recurring_applied_month;

    if (!lastApplied) {
      // First time initialization: set to latest26thStr without applying to avoid double-charging start balance
      try {
        await supabase
          .from('profiles')
          .update({ last_recurring_applied_month: latest26thStr })
          .eq('id', userId);
        console.log(`Initialized last_recurring_applied_month to ${latest26thStr}`);
      } catch (err) {
        console.error('Error initializing recurring applied month:', err);
      }
      return;
    }

    if (lastApplied >= latest26thStr) {
      // Already fully applied for the latest monthly cycle
      return;
    }

    // 2. Find salary and transport allowance in active recurring items
    const salaryItem = recurringItems.find(item => 
      item.type === 'income' && /base|salary/i.test(item.description)
    );
    const transportItem = recurringItems.find(item => 
      item.type === 'income' && /transport/i.test(item.description)
    );

    const salaryAmt = salaryItem ? Number(salaryItem.amount) : 0;
    const transportAmt = transportItem ? Number(transportItem.amount) : 0;
    const totalToAddPerMonth = salaryAmt + transportAmt;

    if (totalToAddPerMonth <= 0) return;

    // 3. Find missing months (if user hasn't logged in for a while)
    const getNextMonthStr = (monthStr: string) => {
      const [year, month] = monthStr.split('-').map(Number);
      let nextMonth = month + 1;
      let nextYear = year;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
      }
      return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
    };

    let currentMonth = lastApplied;
    const monthsToApply: string[] = [];
    while (currentMonth < latest26thStr) {
      currentMonth = getNextMonthStr(currentMonth);
      monthsToApply.push(currentMonth);
    }

    if (monthsToApply.length === 0) return;

    const totalTransactionsAmount = totalToAddPerMonth * monthsToApply.length;
    const newBalance = Number(profile.current_balance) + totalTransactionsAmount;

    try {
      // Update profile balance and last applied month tracker
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          current_balance: newBalance,
          last_recurring_applied_month: latest26thStr,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Create transaction logs for complete tracking integrity
      const transactionsToAdd: any[] = [];
      monthsToApply.forEach(month => {
        if (salaryAmt > 0) {
          transactionsToAdd.push({
            user_id: userId,
            description: salaryItem ? salaryItem.description : 'Base Salary',
            amount: salaryAmt,
            type: 'income',
            category: 'income',
            date: `${month}-26`
          });
        }
        if (transportAmt > 0) {
          transactionsToAdd.push({
            user_id: userId,
            description: transportItem ? transportItem.description : 'Transport Allowance',
            amount: transportAmt,
            type: 'income',
            category: 'income',
            date: `${month}-26`
          });
        }
      });

      if (transactionsToAdd.length > 0) {
        const { error: txError } = await supabase
          .from('transactions')
          .insert(transactionsToAdd);

        if (txError) throw txError;
      }

      // Update React state
      setGeneralBalance(newBalance);

      // Reload transactions to reflect in ledger instantly
      const { data: newTxData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (newTxData) {
        setTransactions(newTxData.map((tx: any) => ({
          id: tx.id,
          description: tx.description,
          amount: Number(tx.amount),
          type: tx.type,
          category: tx.category,
          date: tx.date,
        })));
      }

      console.log(`Successfully applied monthly recurring updates for: ${monthsToApply.join(', ')}`);
    } catch (err) {
      console.error('Error applying missing recurring items:', err);
    }
  };

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

      if (profile) {
        // Sync user email in profiles if missing
        if (!profile.email && session?.user?.email) {
          await supabase
            .from('profiles')
            .update({ email: session.user.email })
            .eq('id', userId);
          profile.email = session.user.email;
        }

        // Fetch joint links status
        const { data: linkData } = await supabase
          .from('joint_links')
          .select(`
            *,
            inviter:inviter_id(id, name, avatar_url, email),
            invitee:invitee_id(id, name, avatar_url, email)
          `)
          .or(`inviter_id.eq.${userId},invitee_id.eq.${userId}`);

        let partnerId = null;
        let incoming = null;
        let outgoing = null;

        if (linkData) {
          const accepted = linkData.find(l => l.status === 'accepted');
          if (accepted) {
            const partner = accepted.inviter_id === userId ? accepted.invitee : accepted.inviter;
            partnerId = partner.id;
            setPartnerProfile(partner);
            setJointLink(accepted);
          } else {
            setPartnerProfile(null);
            setJointLink(null);
            const pendingIncoming = linkData.find(l => l.invitee_id === userId && l.status === 'pending');
            if (pendingIncoming) incoming = pendingIncoming;
            const pendingOutgoing = linkData.find(l => l.inviter_id === userId && l.status === 'pending');
            if (pendingOutgoing) outgoing = pendingOutgoing;
          }
        } else {
          setPartnerProfile(null);
          setJointLink(null);
        }
        setIncomingInvite(incoming);
        setOutgoingInvite(outgoing);

        if (profile.onboarding_completed) {
          setProfileName(profile.name);
          setProfileAvatar(profile.avatar_url || '🚀');
          setMonthlyIncome(Number(profile.monthly_income));
          setGeneralBalance(Number(profile.current_balance));
          setPrimaryGoal(profile.primary_goal || 'save');
          setIsOnboarded(true);

          // Load details: if joint, fetch both user's records
          const queryUserId = partnerId ? `user_id.eq.${userId},user_id.eq.${partnerId}` : `user_id.eq.${userId}`;

          const [txRes, recRes, bucketRes, holdingRes] = await Promise.all([
            supabase.from('transactions').select('*').or(queryUserId).order('date', { ascending: false }),
            supabase.from('recurring_items').select('*').or(queryUserId),
            supabase.from('savings_buckets').select('*').or(queryUserId),
            supabase.from('holdings').select('*').eq('user_id', userId), // Holdings remain individual
          ]);

          if (txRes.data) {
            setTransactions(txRes.data.map((tx: any) => ({
              id: tx.id,
              description: tx.description,
              amount: Number(tx.amount),
              type: tx.type,
              category: tx.category,
              date: tx.date,
              split_with_id: tx.split_with_id,
              split_amount: tx.split_amount ? Number(tx.split_amount) : undefined,
              split_settled: tx.split_settled,
              user_id: tx.user_id,
            })));
          }

          if (recRes.data) {
            const items = recRes.data.map((item: any) => ({
              id: item.id,
              description: item.description,
              amount: Number(item.amount),
              type: item.type,
              category: item.category,
              user_id: item.user_id,
            }));
            
            // Display current user's recurring items only
            const myItems = items.filter((i: any) => i.user_id === userId);
            setRecurringIncomeItems(myItems.filter((i: any) => i.type === 'income'));
            setRecurringExpenseItems(myItems.filter((i: any) => i.type === 'expense'));
          }

          if (bucketRes.data) {
            setBuckets(bucketRes.data.map((b: any) => ({
              id: b.id,
              name: b.name,
              target: Number(b.target),
              current: Number(b.current),
              monthlyContribution: Number(b.monthly_contribution),
              priority: b.priority as any || 'medium',
              user_id: b.user_id,
            })));
          }

          if (holdingRes.data) {
            setHoldings(holdingRes.data.map((h: any) => ({
              ticker: h.ticker,
              shares: Number(h.shares),
              avgPrice: Number(h.avg_price),
            })));
          }

          // Apply automated monthly salary and allowance deposits on the 26th
          if (recRes.data) {
            const myRecItems = recRes.data.filter((item: any) => item.user_id === userId);
            await checkAndApplyRecurringIncomes(profile, myRecItems, userId);
          }
        } else {
          setIsOnboarded(false);
        }
      }
    } catch (err) {
      console.error('Error fetching user tables:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  // Joint Sync Callbacks
  const handleInvitePartner = async (email: string) => {
    if (!session?.user) return;
    const userId = session.user.id;

    const { data: matchedProfiles, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email);

    if (profileErr) throw profileErr;
    if (!matchedProfiles || matchedProfiles.length === 0) {
      throw new Error(`No user profile found for "${email}". Make sure your partner has signed up for Lumen and completed onboarding.`);
    }

    const targetProfile = matchedProfiles[0];
    
    const { error: inviteErr } = await supabase
      .from('joint_links')
      .insert({
        inviter_id: userId,
        invitee_id: targetProfile.id,
        status: 'pending'
      });

    if (inviteErr) {
      if (inviteErr.code === '23505') {
        throw new Error("An invitation is already pending or active with this user.");
      }
      throw inviteErr;
    }

    await loadUserData(userId);
  };

  const handleAcceptInvite = async (inviteId: string) => {
    if (!session?.user) return;
    const userId = session.user.id;

    const { error } = await supabase
      .from('joint_links')
      .update({ status: 'accepted' })
      .eq('id', inviteId);

    if (error) throw error;

    await loadUserData(userId);
  };

  const handleDeclineInvite = async (inviteId: string) => {
    if (!session?.user) return;
    const userId = session.user.id;

    const { error } = await supabase
      .from('joint_links')
      .delete()
      .eq('id', inviteId);

    if (error) throw error;

    setPartnerProfile(null);
    setJointLink(null);
    setIncomingInvite(null);
    setOutgoingInvite(null);

    await loadUserData(userId);
  };

  const handleUnlinkPartner = async (linkId: string) => {
    if (!session?.user) return;
    const userId = session.user.id;

    const { error } = await supabase
      .from('joint_links')
      .delete()
      .eq('id', linkId);

    if (error) throw error;

    setPartnerProfile(null);
    setJointLink(null);
    setIncomingInvite(null);
    setOutgoingInvite(null);

    await loadUserData(userId);
  };

  const handleSettleDebt = async () => {
    if (!session?.user || !partnerProfile) return;
    const userId = session.user.id;
    const partnerId = partnerProfile.id;

    const unsettledSplits = transactions.filter(t => 
      t.split_with_id && 
      !t.split_settled &&
      ((t.user_id === userId && t.split_with_id === partnerId) || 
       (t.user_id === partnerId && t.split_with_id === userId))
    );

    let partnerOwesMe = 0;
    let iOwePartner = 0;

    unsettledSplits.forEach(t => {
      const splitVal = Number(t.split_amount) || (Number(t.amount) / 2);
      if (t.user_id === userId) {
        partnerOwesMe += splitVal;
      } else {
        iOwePartner += splitVal;
      }
    });

    const netDebt = partnerOwesMe - iOwePartner;
    if (netDebt === 0) return;

    // Mark as settled in db
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ split_settled: true })
      .or(`user_id.eq.${userId},user_id.eq.${partnerId}`)
      .not('split_with_id', 'is', null)
      .eq('split_settled', false);

    if (updateError) throw updateError;

    // Log settlement transaction to sync balances
    const absDebt = Math.abs(netDebt);
    const type = netDebt > 0 ? 'income' : 'expense';
    
    await handleAddTransaction(
      `Couple Settlement: ${partnerProfile.name}`,
      absDebt,
      type,
      'Investments'
    );

    await loadUserData(userId);
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

    const now = new Date();
    let targetYear = now.getFullYear();
    let targetMonth = now.getMonth(); // 0-indexed
    if (now.getDate() < 26) {
      targetMonth -= 1;
      if (targetMonth < 0) {
        targetMonth = 11;
        targetYear -= 1;
      }
    }
    const latest26thStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;

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
          last_recurring_applied_month: latest26thStr,
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

  const handleAddTransaction = async (desc: string, amount: number, type: 'income' | 'expense', category: string, splitWithId?: string, splitAmount?: number) => {
    if (!session?.user) return;
    try {
      const newTx = {
        user_id: session.user.id,
        description: desc,
        amount,
        type,
        category,
        date: new Date().toISOString(),
        split_with_id: splitWithId || null,
        split_amount: splitAmount || null,
        split_settled: false,
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
        split_with_id: txData[0].split_with_id,
        split_amount: txData[0].split_amount ? Number(txData[0].split_amount) : undefined,
        split_settled: txData[0].split_settled,
        user_id: txData[0].user_id,
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
      console.error('Error adding transaction:', err);
    }
  };

  const handleUpdateGeneralBalance = async (newBalance: number) => {
    if (!session?.user) {
      setGeneralBalance(newBalance);
      return;
    }
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ current_balance: newBalance })
        .eq('id', session.user.id);
      if (error) throw error;
      setGeneralBalance(newBalance);
    } catch (err: any) {
      console.error('Error updating general balance:', err.message);
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
    category: string
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

  const handleAddBucket = async (name: string, target: number, monthly: number, priority: 'high' | 'medium' | 'low' = 'medium') => {
    if (!session?.user) return;
    try {
      const newBucket = {
        user_id: session.user.id,
        name,
        target,
        current: 0,
        monthly_contribution: monthly,
        priority,
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
        priority: bucketData[0].priority as any || 'medium',
      };
      setBuckets(prev => [...prev, insertedBucket]);
    } catch (err) {
      console.error('Error adding bucket:', err);
    }
  };

  const handleUpdateBucket = async (id: string, name: string, target: number, monthly: number, priority: 'high' | 'medium' | 'low') => {
    if (!session?.user) return;
    try {
      const updatedData = {
        name,
        target,
        monthly_contribution: monthly,
        priority,
      };

      const { error } = await supabase
        .from('savings_buckets')
        .update(updatedData)
        .eq('id', id);
      if (error) throw error;

      setBuckets(prev => prev.map(b => b.id === id ? { ...b, name, target, monthlyContribution: monthly, priority } : b));
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
  const savingsTargetsSum = buckets.reduce((acc, b) => acc + b.monthlyContribution, 0);

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
                {/* Theme Switcher Toggle */}
                <button
                  type="button"
                  className="theme-toggle-btn"
                  onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                  title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                >
                  {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
                </button>

                {/* Avatar + first name */}
                <div className="profile-chip">
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
                  generalBalance={generalBalance}
                  onUpdateGeneralBalance={handleUpdateGeneralBalance}
                  goal={primaryGoal}
                  transactions={transactions}
                  onAddTransaction={handleAddTransaction}
                  savingsRate={currentSavingsRate}
                  totalBucketSavings={totalBucketSavings}
                  holdingsValue={getHoldingsValue()}
                  onNavigate={navigateTo}
                  recurringExpenses={activeOutflowSum}
                  savingsTargetsSum={savingsTargetsSum}
                  partnerProfile={partnerProfile}
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
                  recurringIncomeItems={recurringIncomeItems}
                  recurringExpenseItems={recurringExpenseItems}
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
                  exchangeRates={exchangeRates}
                />
              )}

              {activeTab === 'joint' && (
                <JointSync
                  key="joint"
                  session={session}
                  partnerProfile={partnerProfile}
                  jointLink={jointLink}
                  incomingInvite={incomingInvite}
                  outgoingInvite={outgoingInvite}
                  transactions={transactions}
                  onInvite={handleInvitePartner}
                  onAcceptInvite={handleAcceptInvite}
                  onDeclineInvite={handleDeclineInvite}
                  onUnlink={handleUnlinkPartner}
                  onSettleDebt={handleSettleDebt}
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

              {activeTab === 'assistant' && (
                <AICoach
                  key="assistant"
                  balance={totalNetWorth}
                  monthlyIncome={activeInflowSum || monthlyIncome}
                  totalExpenses={activeOutflowSum}
                  savingsTargetsSum={savingsTargetsSum}
                  transactions={transactions}
                  partnerProfile={partnerProfile}
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
                  transition={{ duration: 0.2, ease: 'linear' }}
                  onClick={() => setShowMoreHub(false)}
                />

                {/* Centered modal */}
                <motion.div
                  className="hub-modal"
                  initial={{ opacity: 0, scale: 0.93, x: '-50%', y: '-50%' }}
                  animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                  exit={{ opacity: 0, scale: 0.93, x: '-50%', y: '-50%' }}
                  transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.28 }}
                  style={{ top: '50%', left: '50%' }}
                >
                  <div className="hub-sheet-header">
                    <h3 className="hub-sheet-title">More Hub</h3>
                    <button className="hub-sheet-close" onClick={() => setShowMoreHub(false)}>
                      <X size={16} />
                    </button>
                  </div>

                  <div className="hub-sheet-content">
                    <div className="hub-grid">
                      <button
                        className={`hub-card ${activeTab === 'projection' ? 'active' : ''}`}
                        onClick={() => navigateTo('projection')}
                      >
                        <div className="hub-card-icon-wrapper">
                          <LineChart size={18} />
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
                          <PieChart size={18} />
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
                          <Lightbulb size={18} />
                        </div>
                        <div className="hub-card-text">
                          <div className="hub-card-name">Financial Insights</div>
                          <div className="hub-card-desc">Automated rules of thumb and optimization tips.</div>
                        </div>
                      </button>

                      <button
                        className={`hub-card ${activeTab === 'joint' ? 'active' : ''}`}
                        onClick={() => navigateTo('joint')}
                      >
                        <div className="hub-card-icon-wrapper">
                          <Users size={18} />
                        </div>
                        <div className="hub-card-text">
                          <div className="hub-card-name">Joint Sync & Splits</div>
                          <div className="hub-card-desc">Link with a partner, split expenses, settle debts.</div>
                        </div>
                      </button>

                      <button
                        className={`hub-card ${activeTab === 'assistant' ? 'active' : ''}`}
                        onClick={() => navigateTo('assistant')}
                        style={{ gridColumn: '1 / -1' }}
                      >
                        <div className="hub-card-icon-wrapper" style={{ color: 'var(--emerald-gains)', backgroundColor: 'var(--emerald-gains-bg)' }}>
                          <Bot size={18} />
                        </div>
                        <div className="hub-card-text">
                          <div className="hub-card-name">AI Financial Coach</div>
                          <div className="hub-card-desc">Ask questions, analyze budget context, and get wealth advice.</div>
                        </div>
                      </button>
                    </div>

                    <hr className="hub-divider" />

                    <div className="hub-actions-grid">
                      {!((window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches) && (
                        <button className="hub-action-btn primary" onClick={handleTriggerInstallFromHub}>
                          <Download size={14} />
                          <span>Install App</span>
                        </button>
                      )}
                      <button className="hub-action-btn danger" onClick={() => { setShowMoreHub(false); handleReset(); }}>
                        <RotateCcw size={15} />
                        <span>Reset</span>
                      </button>
                      <button className="hub-action-btn" onClick={() => { setShowMoreHub(false); handleSignOut(); }}>
                        <LogOut size={15} />
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
                    <div className="pwa-prompt-logo" style={{ background: 'transparent' }}>
                      <img src="/favicon.png" alt="Lumen Logo" style={{ width: '28px', height: '28px', borderRadius: '8px' }} />
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
                    <div className="pwa-prompt-logo" style={{ background: 'transparent' }}>
                      <img src="/favicon.png" alt="Lumen Logo" style={{ width: '28px', height: '28px', borderRadius: '8px' }} />
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

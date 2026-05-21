import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Coins, Shield, Sparkles, TrendingUp, User } from 'lucide-react';

interface OnboardingProps {
  onComplete: (data: {
    name: string;
    avatarUrl: string;
    monthlyIncome: number;
    currentBalance: number;
    primaryGoal: string;
  }) => void;
}

const goals = [
  {
    id: 'save',
    title: 'Save Money',
    description: 'Build an emergency buffer or fund short-term dreams.',
    icon: Shield,
  },
  {
    id: 'invest',
    title: 'Grow Investments',
    description: 'Allocate assets to compound wealth in the markets.',
    icon: TrendingUp,
  },
  {
    id: 'debt',
    title: 'Pay Off Debt',
    description: 'Systematically clear obligations and gain freedom.',
    icon: Coins,
  },
  {
    id: 'wealth',
    title: 'Build Generational Wealth',
    description: 'Maximize long-term net worth and financial freedom.',
    icon: Sparkles,
  },
];

const emojiAvatars = [
  { emoji: '🚀', label: 'Rocket', gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', recommended: true },
  { emoji: '🦊', label: 'Fox', gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' },
  { emoji: '🦁', label: 'Lion', gradient: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' },
  { emoji: '🦄', label: 'Unicorn', gradient: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)' },
  { emoji: '🐼', label: 'Panda', gradient: 'linear-gradient(135deg, #cfd9df 0%, #e2ebf0 100%)' },
  { emoji: '🦉', label: 'Owl', gradient: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)' },
];

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState<string>('');
  const [selectedAvatarType, setSelectedAvatarType] = useState<'emoji' | 'initials'>('emoji');
  const [selectedEmojiIdx, setSelectedEmojiIdx] = useState<number>(0); // 🚀 preselected
  const [monthlyIncome, setMonthlyIncome] = useState<string>('');
  const [currentBalance, setCurrentBalance] = useState<string>('');

  const getInitials = (fullName: string) => {
    if (!fullName) return '?';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const nextStep = () => {
    if (step === 1 && name.trim()) setStep(2);
    else if (step === 2 && monthlyIncome) setStep(3);
    else if (step === 3 && currentBalance) setStep(4);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const getAvatarValue = () => {
    if (selectedAvatarType === 'emoji') {
      return emojiAvatars[selectedEmojiIdx].emoji;
    }
    return `initials:${getInitials(name)}`;
  };

  const getAvatarGradient = () => {
    if (selectedAvatarType === 'emoji') {
      return emojiAvatars[selectedEmojiIdx].gradient;
    }
    return 'linear-gradient(135deg, #111827 0%, #374151 100%)';
  };

  const handleFinish = (goalId: string) => {
    onComplete({
      name: name.trim(),
      avatarUrl: getAvatarValue(),
      monthlyIncome: parseFloat(monthlyIncome.replace(/,/g, '')) || 0,
      currentBalance: parseFloat(currentBalance.replace(/,/g, '')) || 0,
      primaryGoal: goalId,
    });
  };

  const handleCurrencyChange = (value: string, setter: (val: string) => void) => {
    const clean = value.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) return;
    const formattedInt = parts[0] ? parseInt(parts[0], 10).toLocaleString('en-US') : '';
    const formatted = parts[1] !== undefined ? `${formattedInt}.${parts[1].slice(0, 2)}` : formattedInt;
    setter(clean === '' ? '' : formatted);
  };

  const variants = {
    enter: { opacity: 0, x: 20 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  const transition = {
    duration: 0.6,
    ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-6)',
      position: 'relative',
      zIndex: 1,
    }}>
      <div className="hero-glow pulsing-glow" />
      
      <div className="card" style={{
        width: '100%',
        maxWidth: '480px',
        padding: 'var(--space-8) var(--space-6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-8)',
        minHeight: '480px',
        justifyContent: 'space-between',
      }}>
        
        {/* Header step progress */}
        <div className="flex justify-between align-center">
          <span className="logo-text">Lumen</span>
          <span className="num" style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
            0{step} / 04
          </span>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col gap-2">
                <h1 className="serif-title" style={{ fontSize: '2.2rem', textAlign: 'left', lineHeight: 1.1 }}>
                  Create your profile.
                </h1>
                <p style={{ color: 'var(--ink-muted)', fontSize: '0.95rem' }}>
                  Please share your name and choose an avatar to personalize your experience.
                </p>
              </div>

              {/* Avatar Preview & Grid Selector */}
              <div className="flex flex-col align-center gap-4" style={{ margin: 'var(--space-2) 0' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: getAvatarGradient(),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: selectedAvatarType === 'emoji' ? '2.5rem' : '1.5rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  border: '3px solid var(--card-bg)',
                  outline: '1px solid var(--border-color)',
                  transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                }}>
                  {selectedAvatarType === 'emoji' ? (
                    emojiAvatars[selectedEmojiIdx].emoji
                  ) : (
                    getInitials(name)
                  )}
                </div>

                <div className="flex gap-2" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
                  {emojiAvatars.map((av, idx) => (
                    <button
                      key={av.label}
                      onClick={() => {
                        setSelectedAvatarType('emoji');
                        setSelectedEmojiIdx(idx);
                      }}
                      type="button"
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: av.gradient,
                        border: selectedAvatarType === 'emoji' && selectedEmojiIdx === idx 
                          ? '2px solid var(--ink-color)' 
                          : '2px solid transparent',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        transform: selectedAvatarType === 'emoji' && selectedEmojiIdx === idx ? 'scale(1.1)' : 'scale(1)',
                        position: 'relative',
                        padding: 0,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {av.emoji}
                      {av.recommended && (
                        <span style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          fontSize: '0.55rem',
                          background: 'var(--ink-color)',
                          color: 'var(--page-bg)',
                          padding: '1px 4px',
                          borderRadius: '4px',
                          fontWeight: 700,
                        }}>
                          Rec
                        </span>
                      )}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setSelectedAvatarType('initials')}
                    type="button"
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #111827 0%, #374151 100%)',
                      border: selectedAvatarType === 'initials' 
                        ? '2px solid var(--ink-color)' 
                        : '2px solid transparent',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      transform: selectedAvatarType === 'initials' ? 'scale(1.1)' : 'scale(1)',
                      padding: 0,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {getInitials(name)}
                  </button>
                </div>
              </div>

              {/* Name Input */}
              <div className="input-group">
                <label className="input-label">YOUR FULL NAME</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{
                    position: 'absolute',
                    left: 'var(--space-4)',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--ink-light)',
                  }} />
                  <input
                    type="text"
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '2.8rem', fontSize: '1.05rem', height: '50px' }}
                    autoFocus
                    required
                  />
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={nextStep}
                disabled={!name.trim()}
                style={{
                  alignSelf: 'flex-end',
                  height: '48px',
                  padding: '0 var(--space-6)',
                  opacity: name.trim() ? 1 : 0.4,
                  pointerEvents: name.trim() ? 'auto' : 'none',
                }}
              >
                Continue <ArrowRight size={16} />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col gap-2">
                <h1 className="serif-title" style={{ fontSize: '2.2rem', textAlign: 'left', lineHeight: 1.1 }}>
                  What is your average monthly income?
                </h1>
                <p style={{ color: 'var(--ink-muted)', fontSize: '0.95rem' }}>
                  This acts as the baseline for calculating cash flow and suggested savings.
                </p>
              </div>

              <div className="input-group">
                <label className="input-label">MONTHLY INCOME</label>
                <div style={{ position: 'relative' }}>
                  <span className="num" style={{
                    position: 'absolute',
                    left: 'var(--space-4)',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--ink-light)',
                    fontSize: '1.1rem',
                  }}>
                    Rs.
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="50,000"
                    value={monthlyIncome}
                    onChange={(e) => handleCurrencyChange(e.target.value, setMonthlyIncome)}
                    className="input-field num-input"
                    style={{ paddingLeft: '3.2rem', fontSize: '1.2rem', height: '54px' }}
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex justify-between align-center" style={{ width: '100%' }}>
                <button
                  className="btn btn-secondary"
                  onClick={prevStep}
                  style={{ height: '48px' }}
                >
                  Back
                </button>
                <button
                  className="btn btn-primary"
                  onClick={nextStep}
                  disabled={!monthlyIncome}
                  style={{
                    height: '48px',
                    padding: '0 var(--space-6)',
                    opacity: monthlyIncome ? 1 : 0.4,
                    pointerEvents: monthlyIncome ? 'auto' : 'none',
                  }}
                >
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col gap-2">
                <h1 className="serif-title" style={{ fontSize: '2.2rem', textAlign: 'left', lineHeight: 1.1 }}>
                  What is your cash balance on hand?
                </h1>
                <p style={{ color: 'var(--ink-muted)', fontSize: '0.95rem' }}>
                  Include checking accounts, savings, and general liquid cash.
                </p>
              </div>

              <div className="input-group">
                <label className="input-label">CASH ON HAND / BALANCE</label>
                <div style={{ position: 'relative' }}>
                  <span className="num" style={{
                    position: 'absolute',
                    left: 'var(--space-4)',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--ink-light)',
                    fontSize: '1.1rem',
                  }}>
                    Rs.
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="150,000"
                    value={currentBalance}
                    onChange={(e) => handleCurrencyChange(e.target.value, setCurrentBalance)}
                    className="input-field num-input"
                    style={{ paddingLeft: '3.2rem', fontSize: '1.2rem', height: '54px' }}
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex justify-between align-center" style={{ width: '100%' }}>
                <button
                  className="btn btn-secondary"
                  onClick={prevStep}
                  style={{ height: '48px' }}
                >
                  Back
                </button>
                <button
                  className="btn btn-primary"
                  onClick={nextStep}
                  disabled={!currentBalance}
                  style={{
                    height: '48px',
                    padding: '0 var(--space-6)',
                    opacity: currentBalance ? 1 : 0.4,
                    pointerEvents: currentBalance ? 'auto' : 'none',
                  }}
                >
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col gap-2">
                <h1 className="serif-title" style={{ fontSize: '2.2rem', textAlign: 'left', lineHeight: 1.1 }}>
                  Select your primary financial focus.
                </h1>
                <p style={{ color: 'var(--ink-muted)', fontSize: '0.95rem' }}>
                  We will prioritize insights and projections matching this direction.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-3)' }}>
                {goals.map((goal) => {
                  const Icon = goal.icon;
                  return (
                    <div
                      key={goal.id}
                      onClick={() => handleFinish(goal.id)}
                      className="card"
                      style={{
                        padding: 'var(--space-4)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-4)',
                        backgroundColor: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        textAlign: 'left',
                        transition: 'all 0.3s var(--ease-slow)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--ink-color)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                      }}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'rgba(10,10,10,0.03)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--ink-color)',
                      }}>
                        <Icon size={18} />
                      </div>
                      <div className="flex flex-col" style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{goal.title}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>{goal.description}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                className="btn btn-secondary"
                onClick={prevStep}
                style={{ height: '48px', alignSelf: 'flex-start' }}
              >
                Back
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress indicator bar at very bottom */}
        <div style={{
          width: '100%',
          height: '2px',
          backgroundColor: 'var(--border-color)',
          borderRadius: '1px',
          overflow: 'hidden',
        }}>
          <motion.div
            style={{
              height: '100%',
              backgroundColor: 'var(--ink-color)',
            }}
            initial={{ width: '25%' }}
            animate={{ width: `${step * 25}%` }}
            transition={transition}
          />
        </div>
      </div>
    </div>
  );
};

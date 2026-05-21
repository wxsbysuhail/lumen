import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Shield, Mail, Lock, ArrowRight } from 'lucide-react';

interface LoginProps {
  onAuthSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onAuthSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        // Supabase sign up might require email confirmation, but usually in dev it logs in directly
        // or creates a session. Let's show a success note if it doesn't log in immediately.
        setErrorMessage('Check your email for the confirmation link, or log in if auto-confirmed.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onAuthSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start Google login.');
      setLoading(false);
    }
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
        maxWidth: '420px',
        padding: 'var(--space-8) var(--space-6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
      }}>
        
        {/* Header */}
        <div className="flex flex-col align-center gap-2" style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'var(--ink-color)',
            color: 'var(--page-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--space-2)'
          }}>
            <Shield size={24} />
          </div>
          <h1 className="serif-title" style={{ fontSize: '2rem', margin: 0 }}>Lumen</h1>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.9rem', margin: 0 }}>
            Personal Finance & Wealth Management
          </p>
        </div>

        {/* Tabbed Selector */}
        <div style={{
          display: 'flex',
          background: 'rgba(10,10,10,0.03)',
          padding: '4px',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
        }}>
          <button
            onClick={() => { setIsSignUp(false); setErrorMessage(null); }}
            style={{
              flex: 1,
              padding: 'var(--space-2) 0',
              border: 'none',
              background: !isSignUp ? 'var(--card-bg)' : 'transparent',
              color: !isSignUp ? 'var(--ink-color)' : 'var(--ink-muted)',
              fontSize: '0.85rem',
              fontWeight: 600,
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: !isSignUp ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            Log In
          </button>
          <button
            onClick={() => { setIsSignUp(true); setErrorMessage(null); }}
            style={{
              flex: 1,
              padding: 'var(--space-2) 0',
              border: 'none',
              background: isSignUp ? 'var(--card-bg)' : 'transparent',
              color: isSignUp ? 'var(--ink-color)' : 'var(--ink-muted)',
              fontSize: '0.85rem',
              fontWeight: 600,
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: isSignUp ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Error Message Panel */}
        {errorMessage && (
          <div style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '8px',
            color: '#ef4444',
            fontSize: '0.85rem',
            lineHeight: '1.4',
          }}>
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
          <div className="input-group">
            <label className="input-label">EMAIL ADDRESS</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{
                position: 'absolute',
                left: 'var(--space-4)',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ink-light)',
              }} />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '2.8rem' }}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{
                position: 'absolute',
                left: 'var(--space-4)',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ink-light)',
              }} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '2.8rem' }}
                disabled={loading}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              height: '48px',
              marginTop: 'var(--space-2)',
              justifyContent: 'center',
            }}
            disabled={loading}
          >
            {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Log In'}
            {!loading && <ArrowRight size={16} style={{ marginLeft: 'var(--space-2)' }} />}
          </button>
        </form>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          color: 'var(--ink-light)',
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
          <span>or</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
        </div>

        {/* Social Login */}
        <button
          onClick={handleGoogleLogin}
          type="button"
          className="btn btn-secondary"
          style={{
            width: '100%',
            height: '48px',
            justifyContent: 'center',
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            gap: 'var(--space-3)',
          }}
          disabled={loading}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-3.3-4.53-6.16-4.53z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
        
      </div>
    </div>
  );
};

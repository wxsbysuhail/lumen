import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Key, Trash2, HelpCircle, Loader2, Sparkles, Bot } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../supabaseClient';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  split_with_id?: string;
  split_amount?: number;
}

interface AICoachProps {
  balance: number;
  monthlyIncome: number;
  totalExpenses: number;
  savingsTargetsSum: number;
  transactions: Transaction[];
  partnerProfile?: { id: string; name: string; email: string } | null;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const AICoach: React.FC<AICoachProps> = ({
  balance,
  monthlyIncome,
  totalExpenses,
  savingsTargetsSum,
  transactions,
  partnerProfile = null,
}) => {
  const [apiKey, setApiKey] = useState<string>(() => {
    return import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('lumen_gemini_api_key') || '';
  });
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKeySetup, setShowKeySetup] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('lumen_chat_history');
    return saved ? JSON.parse(saved) : [
      {
        role: 'model',
        text: "Hello! I am **Lumen AI**, your personal financial coach. I have analyzed your recent logs and balances. Ask me anything about your safety runway, savings rates, or budgeting strategies!"
      }
    ];
  });
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Persist chat history
  useEffect(() => {
    localStorage.setItem('lumen_chat_history', JSON.stringify(messages));
  }, [messages]);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;
    localStorage.setItem('lumen_gemini_api_key', apiKeyInput.trim());
    setApiKey(apiKeyInput.trim());
    setApiKeyInput('');
    setShowKeySetup(false);
  };

  const handleClearKey = () => {
    if (confirm("Are you sure you want to clear your stored Gemini API Key?")) {
      localStorage.removeItem('lumen_gemini_api_key');
      setApiKey('');
      setShowKeySetup(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm("Reset conversation history?")) {
      const initialMsgs: Message[] = [
        {
          role: 'model',
          text: "Conversation reset. How can I assist you with your financial goals today?"
        }
      ];
      setMessages(initialMsgs);
      localStorage.setItem('lumen_chat_history', JSON.stringify(initialMsgs));
    }
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    setErrorMsg(null);
    const userMsg: Message = { role: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setLoading(true);

    try {
      // Build context snapshot for Gemini
      const systemPrompt = `You are Lumen AI, a premium personal financial coach and wealth optimizer.
Below is the user's current financial snapshot:
- Net Assets / Net Worth: Rs. ${balance.toLocaleString()}
- Monthly Income: Rs. ${monthlyIncome.toLocaleString()}
- Monthly Expenses: Rs. ${totalExpenses.toLocaleString()}
- Active Savings Targets: Rs. ${savingsTargetsSum.toLocaleString()}
- Registered Partner: ${partnerProfile ? partnerProfile.name : 'None'}

Recent Transactions (last 15 items):
${transactions.slice(0, 15).map(t => `- [${t.date.split('T')[0]}] ${t.description} (${t.type}): Rs. ${t.amount} [Category: ${t.category}]${t.split_with_id ? ' (Shared/Split)' : ''}`).join('\n')}

Guidelines:
1. Speak in a confident, encouraging, yet professional and direct tone.
2. Give detailed, custom advice using the provided financial details.
3. Keep answers concise, actionable, and formatted with markdown (use **bold** and * bullet points).
4. When mentioning currency, default to Mauritian Rupees (Rs.).
5. Do NOT give legal stock buying tips. Advise on basic diversification (index funds, ETFs).
`;

      let reply = '';
      try {
        // Try Edge Function first
        const { data, error } = await supabase.functions.invoke('gemini-chat', {
          body: {
            systemPrompt,
            messageHistory: messages,
            newMessage: textToSend,
          },
        });

        if (error) {
          throw error;
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        reply = data?.reply || '';
      } catch (edgeError: any) {
        console.warn('Edge Function execution failed or not configured, trying local SDK fallback:', edgeError);
        
        // Local SDK Fallback
        if (!apiKey) {
          throw new Error('Edge Function invocation failed, and no local Gemini API key is configured. Please deploy the Supabase Edge Function or click the API Settings button in the header to set a local key. Details: ' + (edgeError.message || ''));
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });


        const chatHistoryPrompt = [
          systemPrompt,
          "Here is the conversation history:",
          ...messages.map(msg => `${msg.role === 'user' ? 'User' : 'Lumen AI'}: ${msg.text}`),
          `User: ${textToSend}`,
          "Lumen AI:"
        ].join('\n\n');

        const result = await model.generateContent(chatHistoryPrompt);
        reply = result.response.text();
      }

      setMessages(prev => [...prev, { role: 'model', text: reply }]);
    } catch (err: any) {
      console.error('Gemini API/Edge Function Error:', err);
      setErrorMsg(err.message || 'Failed to communicate with Google AI. Verify your connection or API key config.');
      // Remove last user message on failure so they can retry
      setMessages(prev => prev.slice(0, -1));
      setInputVal(textToSend); // Restore input
    } finally {
      setLoading(false);
    }
  };

  const suggestionChips = [
    "Analyze my budget runway.",
    "How can I hit a 30% savings rate?",
    "Review my recent transactions.",
    "Explain compound interest.",
  ];

  // Parses **bold** within a string into React nodes
  const parseBold = (str: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let current = str;
    let idx = current.indexOf('**');
    while (idx !== -1) {
      const end = current.indexOf('**', idx + 2);
      if (end === -1) break;
      if (idx > 0) parts.push(current.substring(0, idx));
      parts.push(<strong key={`b-${idx}`} style={{ fontWeight: 700 }}>{current.substring(idx + 2, end)}</strong>);
      current = current.substring(end + 2);
      idx = current.indexOf('**');
    }
    parts.push(current);
    return parts;
  };

  // Full markdown-aware formatter: headings, bullets, numbered lists, hr, bold
  const formatMessageText = (text: string) => {
    const lines = text.split('\n');
    const result: React.ReactNode[] = [];
    let bulletGroup: React.ReactNode[] = [];
    let numberedGroup: React.ReactNode[] = [];

    const flushBullets = () => {
      if (bulletGroup.length > 0) {
        result.push(<ul key={`ul-${result.length}`} style={{ margin: '4px 0 8px 16px', paddingLeft: '4px', listStyleType: 'disc' }}>{bulletGroup}</ul>);
        bulletGroup = [];
      }
    };
    const flushNumbered = () => {
      if (numberedGroup.length > 0) {
        result.push(<ol key={`ol-${result.length}`} style={{ margin: '4px 0 8px 16px', paddingLeft: '4px' }}>{numberedGroup}</ol>);
        numberedGroup = [];
      }
    };

    lines.forEach((line, i) => {
      const trimmed = line.trim();

      if (!trimmed) {
        flushBullets(); flushNumbered();
        result.push(<div key={`g-${i}`} style={{ height: '5px' }} />);
        return;
      }
      if (trimmed === '---' || trimmed === '***') {
        flushBullets(); flushNumbered();
        result.push(<hr key={`hr-${i}`} style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '8px 0' }} />);
        return;
      }
      if (trimmed.startsWith('## ')) {
        flushBullets(); flushNumbered();
        result.push(<h3 key={i} style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--ink-color)', margin: '10px 0 4px 0', letterSpacing: '-0.01em' }}>{parseBold(trimmed.slice(3))}</h3>);
        return;
      }
      if (trimmed.startsWith('### ') || trimmed.startsWith('#### ')) {
        flushBullets(); flushNumbered();
        const lvl = trimmed.startsWith('#### ') ? 5 : 4;
        result.push(<h4 key={i} style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--ink-color)', margin: '8px 0 3px 0' }}>{parseBold(trimmed.slice(lvl))}</h4>);
        return;
      }
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        flushNumbered();
        bulletGroup.push(<li key={i} style={{ marginBottom: '3px', lineHeight: '1.55' }}>{parseBold(trimmed.slice(2))}</li>);
        return;
      }
      const numMatch = trimmed.match(/^(\d+)\.\s(.+)/);
      if (numMatch) {
        flushBullets();
        numberedGroup.push(<li key={i} style={{ marginBottom: '3px', lineHeight: '1.55' }}>{parseBold(numMatch[2])}</li>);
        return;
      }
      flushBullets(); flushNumbered();
      result.push(<p key={i} style={{ marginBottom: '5px', lineHeight: '1.6' }}>{parseBold(trimmed)}</p>);
    });

    flushBullets();
    flushNumbered();
    return result;
  };

  const transition = { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={transition}
      style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: 'calc(100vh - 200px)', minHeight: '520px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--ink-color)', margin: 0 }}>AI Financial Coach</h1>
          <p style={{ color: 'var(--ink-light)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
            Context-aware advice · Powered by Gemini · Your live data is included
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }} onClick={handleClearHistory}>
            <Trash2 size={13} /> Reset
          </button>
          <button className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px', color: showKeySetup ? 'var(--emerald-gains)' : 'var(--ink-color)' }}
            onClick={() => setShowKeySetup(!showKeySetup)}>
            <Key size={13} /> {apiKey ? 'API Key ✓' : 'Set API Key'}
          </button>
        </div>
      </div>

      {/* Live context pills */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {[
          { label: 'Balance', value: `Rs. ${balance.toLocaleString('en-US')}` },
          { label: 'Income', value: `Rs. ${monthlyIncome.toLocaleString('en-US')} /mo` },
          { label: 'Expenses', value: `Rs. ${totalExpenses.toLocaleString('en-US')} /mo` },
          { label: 'Savings targets', value: `Rs. ${savingsTargetsSum.toLocaleString('en-US')}` },
          { label: 'Transactions', value: `${Math.min(transactions.length, 15)} loaded` },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', background: 'var(--nav-pill-bg)', border: '1px solid var(--border-color)', borderRadius: '999px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
            <span style={{ color: 'var(--ink-light)' }}>{label}</span>
            <span className="num" style={{ color: 'var(--ink-color)', fontWeight: 650 }}>{value}</span>
          </div>
        ))}
      </div>

      {/* CHAT VIEW */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1.25rem' }} className="card">
        {showKeySetup && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '20px',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              overflow: 'hidden'
            }}
          >
            <div className="flex justify-between align-center">
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Local API Key Fallback</h3>
              {apiKey && (
                <button
                  className="btn btn-secondary danger-hover-btn"
                  style={{ padding: '2px 8px', fontSize: '0.72rem', color: 'var(--coral-losses)' }}
                  onClick={handleClearKey}
                >
                  Remove Key
                </button>
              )}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
              If you haven't deployed the Supabase Edge Function `gemini-chat` or set `GEMINI_API_KEY` on Supabase, you can set a local Gemini API key here. It is saved in your browser's local storage.
            </p>
            <form onSubmit={handleSaveKey} className="flex gap-2 align-end">
              <div className="input-group" style={{ flex: 1, margin: 0 }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Key size={13} style={{ position: 'absolute', left: '10px', color: 'var(--ink-light)' }} />
                  <input
                    type="password"
                    placeholder={apiKey ? "••••••••••••••••" : "AIzaSy..."}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '30px', fontSize: '0.8rem', height: '36px' }}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ height: '36px', padding: '0 16px', fontSize: '0.8rem' }}
              >
                Save Key
              </button>
            </form>
            <a
              href="https://aistudio.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '0.75rem',
                color: 'var(--emerald-gains)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                textDecoration: 'none',
                fontWeight: 550,
              }}
            >
              <HelpCircle size={12} />
              Get a Free Gemini API Key from Google AI Studio
            </a>
          </motion.div>
        )}

        {errorMsg && (
          <div style={{
            backgroundColor: 'var(--coral-losses-bg)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            padding: '12px 16px',
            borderRadius: '12px',
            color: 'var(--coral-losses)',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <Bot size={16} />
            <span style={{ flex: 1 }}>{errorMsg}</span>
            <button 
              className="btn btn-secondary" 
              style={{ fontSize: '0.72rem', padding: '2px 8px', borderColor: 'var(--coral-losses)', color: 'var(--coral-losses)' }} 
              onClick={() => handleSend(inputVal)}
            >
              Retry
            </button>
          </div>
        )}

        {/* Messages Scroll Area */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div key={idx} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '8px', width: '100%' }}>
                {!isUser && (
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--emerald-gains-bg)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: '2px' }}>
                    <Sparkles size={13} style={{ color: 'var(--emerald-gains)' }} />
                  </div>
                )}
                <div style={{
                  maxWidth: '78%',
                  padding: '11px 15px',
                  borderRadius: '16px',
                  borderBottomRightRadius: isUser ? '4px' : '16px',
                  borderBottomLeftRadius: isUser ? '16px' : '4px',
                  background: isUser ? 'var(--emerald-gains-bg)' : 'var(--nav-pill-bg)',
                  border: isUser ? '1px solid var(--emerald-gains)' : '1px solid var(--border-color)',
                  fontSize: '0.855rem',
                  color: 'var(--ink-color)',
                  lineHeight: '1.55',
                }}>
                  {formatMessageText(msg.text)}
                </div>
              </div>
            );
          })}
          
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', gap: '8px', width: '100%' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--emerald-gains-bg)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Sparkles size={13} style={{ color: 'var(--emerald-gains)' }} />
              </div>
              <div style={{ padding: '11px 15px', borderRadius: '16px', borderBottomLeftRadius: '4px', background: 'var(--nav-pill-bg)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  <Loader2 size={14} style={{ color: 'var(--emerald-gains)', display: 'block' }} />
                </motion.div>
                <span>Lumen AI is thinking...</span>
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Quick suggestion chips — shown when input is empty and not loading */}
        {!loading && !inputVal.trim() && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '12px 0 4px 0', borderTop: '1px solid var(--border-color)', marginTop: '12px' }}>
            {suggestionChips.map((chip, idx) => (
              <button key={idx} type="button" className="btn btn-secondary"
                style={{ borderRadius: '999px', padding: '5px 11px', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                onClick={() => handleSend(chip)}>
                <Sparkles size={10} style={{ color: 'var(--emerald-gains)' }} />
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Input field area */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '14px',
          marginTop: '12px',
        }}>
          <input
            type="text"
            placeholder="Ask about your runway, savings rate, transactions..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && handleSend(inputVal)}
            className="input-field"
            style={{ flex: 1, fontSize: '0.875rem' }}
            disabled={loading}
          />
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '40px', height: '40px', minWidth: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}
            onClick={() => handleSend(inputVal)}
            disabled={loading || !inputVal.trim()}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};



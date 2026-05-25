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
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

  // Helper to format bold and list formatting into React nodes
  const formatMessageText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let cleanLine = line.trim();
      if (!cleanLine && line) return <div key={idx} style={{ height: '8px' }} />;
      
      const isBullet = cleanLine.startsWith('* ') || cleanLine.startsWith('- ');
      if (isBullet) {
        cleanLine = cleanLine.substring(2);
      }
      
      const parts = [];
      let currentText = cleanLine;
      let boldIndex = currentText.indexOf('**');
      
      while (boldIndex !== -1) {
        const closingIndex = currentText.indexOf('**', boldIndex + 2);
        if (closingIndex === -1) break;
        
        parts.push(currentText.substring(0, boldIndex));
        parts.push(<strong key={boldIndex} style={{ fontWeight: 700, color: 'var(--ink-color)' }}>{currentText.substring(boldIndex + 2, closingIndex)}</strong>);
        
        currentText = currentText.substring(closingIndex + 2);
        boldIndex = currentText.indexOf('**');
      }
      parts.push(currentText);
      
      if (isBullet) {
        return (
          <li key={idx} style={{ marginLeft: '16px', marginBottom: '6px', listStyleType: 'disc', color: 'var(--ink-color)' }}>
            {parts}
          </li>
        );
      }
      
      return (
        <p key={idx} style={{ marginBottom: '8px', lineHeight: '1.5' }}>
          {parts}
        </p>
      );
    });
  };

  const transition = { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={transition}
      className="flex flex-col gap-6"
      style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}
    >
      <div className="flex justify-between align-center">
        <div className="flex flex-col gap-1">
          <h1 className="serif-title" style={{ fontSize: '2.5rem', fontWeight: 400, fontStyle: 'italic' }}>AI Financial Coach</h1>
          <p style={{ color: 'var(--ink-muted)' }}>Conversational budget queries and personalized optimization models.</p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={handleClearHistory}
          >
            <Trash2 size={13} />
            Reset Chat
          </button>
          <button
            className="btn btn-secondary"
            style={{ 
              padding: '6px 12px', 
              fontSize: '0.78rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              color: showKeySetup ? 'var(--emerald-gains)' : 'var(--ink-color)' 
            }}
            onClick={() => setShowKeySetup(!showKeySetup)}
          >
            <Key size={13} />
            {apiKey ? 'API Settings' : 'Configure Key'}
          </button>
        </div>
      </div>

      {/* CHAT VIEW */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} className="card">
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
              onClick={() => handleSend(messages[messages.length - 1]?.text || '')}
            >
              Retry
            </button>
          </div>
        )}

        {/* Messages Scroll Area */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '12px 16px',
                    borderRadius: '16px',
                    borderBottomRightRadius: isUser ? '4px' : '16px',
                    borderBottomLeftRadius: isUser ? '16px' : '4px',
                    backgroundColor: isUser ? 'var(--emerald-gains-bg)' : 'var(--bg-color)',
                    border: isUser ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border-color)',
                    fontSize: '0.85rem',
                    color: 'var(--ink-color)',
                  }}
                >
                  {formatMessageText(msg.text)}
                </div>
              </div>
            );
          })}
          
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
              <div style={{
                padding: '12px 16px',
                borderRadius: '16px',
                borderBottomLeftRadius: '4px',
                backgroundColor: 'var(--bg-color)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.8rem',
                color: 'var(--ink-muted)'
              }}>
                <Loader2 className="animate-spin" size={14} style={{ color: 'var(--emerald-gains)' }} />
                <span>Lumen AI is formulating options...</span>
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Quick suggestions chips */}
        {messages.length === 1 && !loading && (
          <div className="flex flex-wrap gap-2" style={{ padding: '16px 0 8px 0', borderTop: '1px solid var(--border-color)', marginTop: '16px' }}>
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                className="btn btn-secondary"
                style={{ borderRadius: '16px', padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => handleSend(chip)}
              >
                <Sparkles size={11} style={{ color: 'var(--emerald-gains)' }} />
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
          paddingTop: '16px',
          marginTop: messages.length === 1 ? '0' : '16px'
        }}>
          <input
            type="text"
            placeholder="Ask anything about your ledger, runway, or savings targets..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(inputVal)}
            className="input-field"
            style={{ flex: 1, fontSize: '0.85rem' }}
            disabled={loading}
          />
          <button
            type="button"
            className="btn btn-primary"
            style={{
              width: '40px',
              height: '40px',
              minWidth: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              backgroundColor: 'var(--ink-color)',
              color: 'var(--bg-color)',
            }}
            onClick={() => handleSend(inputVal)}
            disabled={loading || !inputVal.trim()}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};



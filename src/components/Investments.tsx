import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, AlertCircle, Globe, X, TrendingUp, TrendingDown } from 'lucide-react';

interface Holding {
  ticker: string;
  shares: number;
  avgPrice: number;
}

interface Stock {
  ticker: string;
  name: string;
  price: number;
  prevPrice: number;
  currency: string;
  changePercent: number;
}

interface InvestmentsProps {
  generalBalance: number;
  holdings: Holding[];
  onTrade: (ticker: string, shares: number, price: number, type: 'buy' | 'sell') => void;
  exchangeRates: {
    USD: number;
    MUR: number;
    EUR: number;
  };
}

const INITIAL_STOCKS: Stock[] = [
  { ticker: 'MCB.MU', name: 'Mauritius Commercial Bank', price: 345.50, prevPrice: 345.50, currency: 'Rs', changePercent: 0.25 },
  { ticker: 'SBM.MU', name: 'State Bank of Mauritius', price: 6.22, prevPrice: 6.22, currency: 'Rs', changePercent: -0.15 },
  { ticker: 'AAPL', name: 'Apple Inc.', price: 189.45, prevPrice: 189.45, currency: '$', changePercent: 1.12 },
  { ticker: 'VOO', name: 'Vanguard S&P 500 ETF', price: 478.20, prevPrice: 478.20, currency: '$', changePercent: 0.45 },
  { ticker: 'MSFT', name: 'Microsoft Corp.', price: 415.60, prevPrice: 415.60, currency: '$', changePercent: -0.32 },
];

const PRINCIPLES = [
  {
    title: 'Dollar-Cost Averaging (DCA)',
    body: 'Investing a fixed amount regularly (e.g. monthly) regardless of price. This reduces the impact of volatility and removes emotional timing from the equation.',
  },
  {
    title: 'Time in the Market beats Timing the Market',
    body: 'Missing just the 10 best days in the stock market over a 20-year period can cut your final portfolio returns in half. Stay invested through market cycles.',
  },
  {
    title: 'Broad Index Funds over Stock Picking',
    body: 'Over 90% of professional fund managers fail to beat the index (like S&P 500) over 15 years. Buying the entire market is cheaper and statistically superior.',
  },
  {
    title: 'Diversification is the Only Free Lunch',
    body: 'Spreading investments across stocks, bonds, geography, and sectors reduces overall risk without sacrificing long-term expected returns.',
  },
];

export const Investments: React.FC<InvestmentsProps> = ({
  generalBalance,
  holdings,
  onTrade,
  exchangeRates,
}) => {
  const [stocks, setStocks] = useState<Stock[]>(INITIAL_STOCKS);
  const [activeTickers, setActiveTickers] = useState<Record<string, 'up' | 'down' | null>>({});

  // Display currency state
  const [displayCurrency, setDisplayCurrency] = useState<'MUR' | 'USD' | 'EUR'>('MUR');

  // Buy/Sell modal state
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [sharesInput, setSharesInput] = useState('');

  // Finnhub API fetch fallback
  useEffect(() => {
    // Perform simulated live tick updates
    const interval = setInterval(() => {
      setStocks((prevStocks) => {
        return prevStocks.map((stock) => {
          // 30% chance of stock price moving slightly
          if (Math.random() > 0.45) {
            const pct = (Math.random() * 0.4 - 0.2) / 100; // -0.2% to +0.2%
            const newPrice = Math.max(0.01, parseFloat((stock.price * (1 + pct)).toFixed(2)));
            const direction = newPrice > stock.price ? 'up' : 'down';
            
            // Trigger visual highlight tick
            setActiveTickers(prev => ({ ...prev, [stock.ticker]: direction }));
            setTimeout(() => {
              setActiveTickers(prev => ({ ...prev, [stock.ticker]: null }));
            }, 800);

            const totalChange = ((newPrice - INITIAL_STOCKS.find(s => s.ticker === stock.ticker)!.price) / INITIAL_STOCKS.find(s => s.ticker === stock.ticker)!.price) * 100;

            return {
              ...stock,
              prevPrice: stock.price,
              price: newPrice,
              changePercent: parseFloat(totalChange.toFixed(2)),
            };
          }
          return stock;
        });
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Multi-currency calculation utilities
  const getStockCurrencyCode = (stock: Stock): 'MUR' | 'USD' | 'EUR' => {
    return stock.currency === '$' ? 'USD' : 'MUR';
  };

  const convertAmount = (amount: number, from: 'MUR' | 'USD' | 'EUR', to: 'MUR' | 'USD' | 'EUR') => {
    if (from === to) return amount;
    
    // Convert to USD base first
    let amountInUsd = amount;
    if (from === 'MUR') {
      amountInUsd = amount / exchangeRates.MUR;
    } else if (from === 'EUR') {
      amountInUsd = amount / exchangeRates.EUR;
    }
    
    // Convert USD base to target
    if (to === 'MUR') {
      return amountInUsd * exchangeRates.MUR;
    } else if (to === 'EUR') {
      return amountInUsd * exchangeRates.EUR;
    }
    return amountInUsd;
  };

  const getDisplayPrice = (stock: Stock) => {
    const stockCurrency = getStockCurrencyCode(stock);
    return convertAmount(stock.price, stockCurrency, displayCurrency);
  };

  const getStockMurPrice = (stock: Stock) => {
    const stockCurrency = getStockCurrencyCode(stock);
    return convertAmount(stock.price, stockCurrency, 'MUR');
  };

  const getCurrencySymbol = (curr: 'MUR' | 'USD' | 'EUR') => {
    if (curr === 'MUR') return 'Rs. ';
    if (curr === 'USD') return '$';
    if (curr === 'EUR') return '€';
    return '';
  };

  const handleTradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock || !sharesInput) return;
    const shares = parseFloat(sharesInput) || 0;
    if (shares <= 0) return;

    // Convert stock price to MUR (Rs) for general ledger
    const priceInMur = getStockMurPrice(selectedStock);
    const totalCostMur = shares * priceInMur;

    if (tradeType === 'buy' && totalCostMur > generalBalance) {
      return;
    }

    if (tradeType === 'sell') {
      const currentHolding = holdings.find(h => h.ticker === selectedStock.ticker);
      if (!currentHolding || currentHolding.shares < shares) {
        return;
      }
    }

    onTrade(selectedStock.ticker, shares, priceInMur, tradeType);
    setSharesInput('');
    setSelectedStock(null);
  };

  const getPortfolioValueMur = () => {
    return holdings.reduce((acc, holding) => {
      const stock = stocks.find(s => s.ticker === holding.ticker);
      if (!stock) return acc;
      return acc + (holding.shares * getStockMurPrice(stock));
    }, 0);
  };

  const getPortfolioCostMur = () => {
    return holdings.reduce((acc, holding) => acc + (holding.shares * holding.avgPrice), 0);
  };

  // Convert summaries to active displayCurrency
  const portfolioValueMur = getPortfolioValueMur();
  const portfolioCostMur = getPortfolioCostMur();
  const portfolioValueDisplay = convertAmount(portfolioValueMur, 'MUR', displayCurrency);
  const portfolioCostDisplay = convertAmount(portfolioCostMur, 'MUR', displayCurrency);
  const portfolioReturnDisplay = portfolioValueDisplay - portfolioCostDisplay;
  const portfolioReturnRate = portfolioCostMur > 0 ? ((portfolioValueMur - portfolioCostMur) / portfolioCostMur) * 100 : 0;

  const shares = parseFloat(sharesInput) || 0;
  const priceInDisplay = selectedStock ? getDisplayPrice(selectedStock) : 0;
  const totalCostDisplay = shares * priceInDisplay;
  const displayBalance = convertAmount(generalBalance, 'MUR', displayCurrency);
  const currentHolding = selectedStock ? holdings.find(h => h.ticker === selectedStock.ticker) : null;
  
  // Overdraft verification in MUR to be perfectly consistent with ledger
  const priceInMur = selectedStock ? getStockMurPrice(selectedStock) : 0;
  const totalCostMur = shares * priceInMur;
  const isOverdraft = selectedStock ? (tradeType === 'buy' && totalCostMur > generalBalance) : false;
  const isInsuffShares = selectedStock ? (tradeType === 'sell' && (!currentHolding || currentHolding.shares < shares)) : false;
  const hasError = isOverdraft || isInsuffShares;

  // ── Shared modal style constants ──────────────────────────────────────────
  const BACKDROP: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem',
  };
  const MODAL_PANEL: React.CSSProperties = {
    background: 'var(--card-bg)', border: '1px solid var(--border-color)',
    borderRadius: '1.5rem', padding: '1.5rem', width: '100%', maxWidth: '420px',
    position: 'relative', zIndex: 1001,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--ink-color)', margin: 0 }}>Investments & Assets</h1>
          <p style={{ color: 'var(--ink-light)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
            Simulated live prices · Portfolio tracking · Investment principles
          </p>
        </div>

        {/* Dynamic Currency Switcher */}
        <div className="flex align-center gap-2" style={{ marginBottom: '4px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Display Base</span>
          <div className="segmented-control" style={{ width: 'auto', display: 'inline-flex' }}>
            {(['MUR', 'USD', 'EUR'] as const).map((curr) => (
              <button
                key={curr}
                type="button"
                className={`segment-btn ${displayCurrency === curr ? 'active' : ''}`}
                style={{ padding: '4px 12px', fontSize: '0.78rem', minWidth: '50px' }}
                onClick={() => setDisplayCurrency(curr)}
              >
                {displayCurrency === curr && (
                  <motion.div
                    layoutId="activeCurrencyBg"
                    className="active-indicator"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span>{curr}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Portfolio Value Summary Card */}
      <div className="card grid grid-3 gap-6">
        <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: 'var(--space-4)' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--ink-light)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Portfolio Value</span>
          <h2 className="num" style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.04em', marginTop: '2px', marginBottom: 0 }}>
            {getCurrencySymbol(displayCurrency)}{portfolioValueDisplay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>Cost: {getCurrencySymbol(displayCurrency)}{portfolioCostDisplay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: 'var(--space-4)', paddingLeft: 'var(--space-2)' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--ink-light)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>All-Time Return</span>
          <h2 className={`num ${portfolioReturnDisplay >= 0 ? 'text-gain' : 'text-loss'}`} style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.04em', marginTop: '2px', marginBottom: 0 }}>
            {portfolioReturnDisplay >= 0 ? '+' : ''}{getCurrencySymbol(displayCurrency)}{Math.abs(portfolioReturnDisplay).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
            {portfolioReturnDisplay >= 0 ? <TrendingUp size={12} style={{ color: 'var(--emerald-gains)' }} /> : <TrendingDown size={12} style={{ color: 'var(--coral-losses)' }} />}
            <span style={{ fontSize: '0.75rem', color: portfolioReturnDisplay >= 0 ? 'var(--emerald-gains)' : 'var(--coral-losses)', fontWeight: 600 }}>{portfolioReturnRate >= 0 ? '+' : ''}{portfolioReturnRate.toFixed(2)}% all time</span>
          </div>
        </div>
        <div style={{ paddingLeft: 'var(--space-2)' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--ink-light)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Holdings</span>
          <h2 className="num" style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.04em', marginTop: '2px', marginBottom: 0 }}>{holdings.length}</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{holdings.length === 1 ? 'position' : 'positions'} tracked</span>
        </div>
      </div>

      <div className="grid grid-2 gap-6">
        {/* Watchlist Section */}
        <div className="card flex flex-col gap-4">
          <div className="flex justify-between align-center" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-2)' }}>
            <div className="card-title" style={{ margin: 0 }}>Live Asset Simulation</div>
            <div className="flex align-center gap-2" style={{
              fontSize: '0.72rem',
              color: 'var(--ink-muted)',
              background: 'var(--nav-pill-bg)',
              padding: '3px 8px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              display: 'flex',
            }}>
              <Globe size={11} />
              <span>1 USD = Rs. {exchangeRates.MUR.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {stocks.map((stock) => {
              const tickState = activeTickers[stock.ticker];
              const displayPrice = getDisplayPrice(stock);
              const isAlternativeCurrency = displayCurrency !== getStockCurrencyCode(stock);
              
              return (
                <div
                  key={stock.ticker}
                  className="flex justify-between align-center"
                  style={{
                    padding: 'var(--space-3) var(--space-4)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: tickState === 'up' 
                      ? 'rgba(15, 122, 92, 0.08)' 
                      : tickState === 'down' 
                        ? 'rgba(232, 93, 93, 0.08)' 
                        : 'var(--card-bg)',
                    transition: 'background-color 0.2s ease',
                  }}
                >
                  <div className="flex flex-col">
                    <span style={{ fontWeight: 650, fontSize: '0.95rem' }}>{stock.ticker}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--ink-light)' }}>{stock.name}</span>
                  </div>

                  <div className="flex align-center gap-4">
                    <div style={{ textAlign: 'right' }}>
                      <div className="num" style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                        {getCurrencySymbol(displayCurrency)}{displayPrice.toFixed(2)}
                      </div>
                      {isAlternativeCurrency && (
                        <div className="num" style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                          Original: {stock.currency}{stock.price.toFixed(2)}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col align-end" style={{ minWidth: '70px' }}>
                      <span className={`num ${stock.changePercent >= 0 ? 'text-gain' : 'text-loss'}`} style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </span>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '2px 8px', fontSize: '0.75rem', marginTop: '4px' }}
                        onClick={() => {
                          setSelectedStock(stock);
                          setTradeType('buy');
                        }}
                      >
                        Trade
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Portfolio Tracker Section */}
        <div className="card flex flex-col gap-4">
          <div className="card-title" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-2)', marginBottom: '0' }}>Portfolio Holdings</div>
          {holdings.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', gap: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', lineHeight: 1 }}>📊</div>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink-color)', margin: 0 }}>No positions yet</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', margin: 0 }}>Buy a stock from the watchlist to start tracking.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {holdings.map((holding) => {
                const stock = stocks.find(s => s.ticker === holding.ticker);
                if (!stock) return null;

                const stockMurPrice = getStockMurPrice(stock);
                const holdingValueMur = holding.shares * stockMurPrice;
                const holdingCostMur = holding.shares * holding.avgPrice;
                const holdingReturnRate = holdingCostMur > 0 ? ((holdingValueMur - holdingCostMur) / holdingCostMur) * 100 : 0;
                const allocationPct = portfolioValueMur > 0 ? (holdingValueMur / portfolioValueMur) * 100 : 0;
                const holdingValueDisplay = convertAmount(holdingValueMur, 'MUR', displayCurrency);
                const holdingAvgPriceDisplay = convertAmount(holding.avgPrice, 'MUR', displayCurrency);
                const returnColor = holdingReturnRate >= 0 ? 'var(--emerald-gains)' : 'var(--coral-losses)';

                return (
                  <div key={holding.ticker} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{holding.ticker}</span>
                        <span style={{ fontSize: '0.74rem', color: 'var(--ink-light)' }}>
                          {holding.shares} sh · Avg {getCurrencySymbol(displayCurrency)}{holdingAvgPriceDisplay.toFixed(1)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div className="num" style={{ fontWeight: 650, fontSize: '0.9rem' }}>
                            {getCurrencySymbol(displayCurrency)}{holdingValueDisplay.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                          </div>
                          <div className="num" style={{ fontSize: '0.74rem', color: returnColor, fontWeight: 600 }}>
                            {holdingReturnRate >= 0 ? '+' : ''}{holdingReturnRate.toFixed(2)}%
                          </div>
                        </div>
                        <button className="btn btn-secondary"
                          style={{ padding: '3px 8px', fontSize: '0.72rem', color: 'var(--coral-losses)', borderColor: 'var(--coral-losses)' }}
                          onClick={() => { setSelectedStock(stock); setTradeType('sell'); }}>
                          Sell
                        </button>
                      </div>
                    </div>
                    {/* Allocation bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                      <div style={{ flex: 1, height: '3px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${allocationPct}%`, background: returnColor, borderRadius: '2px', transition: 'width 0.6s ease' }} />
                      </div>
                      <span className="num" style={{ fontSize: '0.68rem', color: 'var(--ink-muted)', fontWeight: 600, minWidth: '30px', textAlign: 'right' }}>{allocationPct.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Best practices feed */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-3)' }}>
          <BookOpen size={15} style={{ color: 'var(--ink-muted)' }} />
          <span className="card-title" style={{ margin: 0 }}>Investment Principles</span>
        </div>
        <div className="grid grid-2 gap-4">
          {PRINCIPLES.map((p, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '12px', padding: '12px', background: 'var(--nav-pill-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--emerald-gains-bg)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.7rem', fontWeight: 700, color: 'var(--emerald-gains)', marginTop: '1px' }}>
                {idx + 1}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h4 style={{ fontWeight: 650, fontSize: '0.88rem', margin: 0, color: 'var(--ink-color)' }}>{p.title}</h4>
                <p style={{ color: 'var(--ink-muted)', fontSize: '0.8rem', lineHeight: 1.5, margin: 0 }}>{p.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trade Modal */}
      {selectedStock && (
        <div style={BACKDROP}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onClick={() => setSelectedStock(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={MODAL_PANEL}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink-color)', margin: 0 }}>
                  {selectedStock.ticker}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', margin: '2px 0 0 0' }}>{selectedStock.name}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div className="num" style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--ink-color)' }}>
                    {getCurrencySymbol(displayCurrency)}{priceInDisplay.toFixed(2)}
                  </div>
                  <div className={`num ${selectedStock.changePercent >= 0 ? 'text-gain' : 'text-loss'}`} style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    {selectedStock.changePercent >= 0 ? '+' : ''}{selectedStock.changePercent.toFixed(2)}%
                  </div>
                </div>
                <button type="button" className="icon-btn" onClick={() => setSelectedStock(null)}><X size={16} /></button>
              </div>
            </div>

            <form onSubmit={handleTradeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Buy / Sell pill toggle */}
              <div className="input-group">
                <label className="input-label">Order Type</label>
                <div style={{ display: 'flex', background: 'var(--nav-pill-bg)', padding: '3px', borderRadius: '9999px', gap: '3px' }}>
                  <button type="button" onClick={() => setTradeType('buy')}
                    style={{ flex: 1, padding: '8px 0', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: tradeType === 'buy' ? 650 : 500, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                      background: tradeType === 'buy' ? 'var(--emerald-gains-bg)' : 'transparent',
                      color: tradeType === 'buy' ? 'var(--emerald-gains)' : 'var(--ink-muted)' }}>
                    Buy · Invest
                  </button>
                  <button type="button" onClick={() => setTradeType('sell')}
                    style={{ flex: 1, padding: '8px 0', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: tradeType === 'sell' ? 650 : 500, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                      background: tradeType === 'sell' ? 'var(--coral-losses-bg)' : 'transparent',
                      color: tradeType === 'sell' ? 'var(--coral-losses)' : 'var(--ink-muted)' }}>
                    Sell · Liquidate
                  </button>
                </div>
              </div>

              {tradeType === 'sell' && currentHolding && (
                <div style={{ padding: '8px 12px', background: 'var(--nav-pill-bg)', border: '1px solid var(--border-color)', borderRadius: '10px', fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                  You hold <span className="num" style={{ fontWeight: 700, color: 'var(--ink-color)' }}>{currentHolding.shares} shares</span> of {selectedStock.ticker}
                </div>
              )}

              <div className="input-group">
                <label className="input-label">Number of Shares</label>
                <input type="text" placeholder="e.g. 10" value={sharesInput}
                  onChange={(e) => setSharesInput(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="input-field num-input" required autoFocus />
              </div>

              {/* Order summary */}
              <div style={{ background: 'var(--nav-pill-bg)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--ink-muted)' }}>Order value</span>
                  <span className="num" style={{ fontWeight: 650, color: 'var(--ink-color)' }}>
                    {getCurrencySymbol(displayCurrency)}{totalCostDisplay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--ink-muted)' }}>Cash available</span>
                  <span className="num" style={{ fontWeight: 650, color: 'var(--ink-color)' }}>
                    {getCurrencySymbol(displayCurrency)}{displayBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {displayCurrency !== 'MUR' && <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}> · Rs. {generalBalance.toLocaleString()}</span>}
                  </span>
                </div>
              </div>

              {hasError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--coral-losses-bg)', border: '1px solid var(--coral-losses)', padding: '10px 12px', borderRadius: '10px', color: 'var(--coral-losses)', fontSize: '0.82rem' }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  <span>{isOverdraft ? 'Insufficient cash balance for this order.' : 'You don\'t have enough shares to sell.'}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '0.25rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSelectedStock(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={!sharesInput || shares <= 0 || hasError}>
                  {tradeType === 'buy' ? 'Confirm Buy' : 'Confirm Sell'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, AlertCircle, Globe } from 'lucide-react';

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-8"
    >
      <div className="flex justify-between align-end gap-4" style={{ flexWrap: 'wrap' }}>
        <div className="flex flex-col gap-2">
          <h1 className="serif-title" style={{ fontSize: '2.5rem', fontWeight: 400, fontStyle: 'italic' }}>Investments & Assets</h1>
          <p style={{ color: 'var(--ink-muted)' }}>
            Track real-time stock simulations, log portfolio purchase/sales, and read principles.
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
      <div className="card grid grid-3 gap-6" style={{ backgroundColor: 'var(--card-bg)' }}>
        <div className="flex flex-col gap-1" style={{ borderRight: '1px solid var(--border-color)', paddingRight: 'var(--space-4)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Assets Valuation</span>
          <h2 className="num" style={{ fontSize: '1.8rem', fontWeight: 550 }}>
            {getCurrencySymbol(displayCurrency)}{portfolioValueDisplay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
        </div>
        <div className="flex flex-col gap-1" style={{ borderRight: '1px solid var(--border-color)', paddingRight: 'var(--space-4)', paddingLeft: 'var(--space-2)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', fontWeight: 600, textTransform: 'uppercase' }}>All-Time Returns</span>
          <h2 className={`num ${portfolioReturnDisplay >= 0 ? 'text-gain' : 'text-loss'}`} style={{ fontSize: '1.8rem', fontWeight: 550 }}>
            {portfolioReturnDisplay >= 0 ? '+' : ''}{getCurrencySymbol(displayCurrency)}{portfolioReturnDisplay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
        </div>
        <div className="flex flex-col gap-1" style={{ paddingLeft: 'var(--space-2)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Return rate %</span>
          <div className="flex align-center gap-2" style={{ marginTop: '2px' }}>
            <span className={`num ${portfolioReturnRate >= 0 ? 'text-gain' : 'text-loss'}`} style={{ fontSize: '1.8rem', fontWeight: 550 }}>
              {portfolioReturnRate >= 0 ? '+' : ''}{portfolioReturnRate.toFixed(2)}%
            </span>
          </div>
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
          <div className="card-title">Portfolio Holdings</div>
          {holdings.length === 0 ? (
            <div className="flex flex-col align-center justify-center" style={{ padding: 'var(--space-8) 0', color: 'var(--ink-light)', gap: 'var(--space-2)' }}>
              <AlertCircle size={20} style={{ opacity: 0.5 }} />
              <p style={{ fontSize: '0.9rem' }}>No asset holdings logged yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {holdings.map((holding) => {
                const stock = stocks.find(s => s.ticker === holding.ticker);
                if (!stock) return null;
                
                const stockMurPrice = getStockMurPrice(stock);
                const holdingValueMur = holding.shares * stockMurPrice;
                const holdingCostMur = holding.shares * holding.avgPrice;
                const holdingReturnRate = holdingCostMur > 0 ? ((holdingValueMur - holdingCostMur) / holdingCostMur) * 100 : 0;
                
                const holdingValueDisplay = convertAmount(holdingValueMur, 'MUR', displayCurrency);
                const holdingAvgPriceDisplay = convertAmount(holding.avgPrice, 'MUR', displayCurrency);

                return (
                  <div key={holding.ticker} className="flex justify-between align-center" style={{
                    padding: 'var(--space-3) 0',
                    borderBottom: '1px solid var(--border-color)',
                  }}>
                    <div className="flex flex-col">
                      <span style={{ fontWeight: 650, fontSize: '0.95rem' }}>{holding.ticker}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--ink-light)' }}>
                        {holding.shares} Shares @ Avg {getCurrencySymbol(displayCurrency)}{holdingAvgPriceDisplay.toFixed(1)}
                      </span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div className="num" style={{ fontWeight: 600 }}>
                        {getCurrencySymbol(displayCurrency)}{holdingValueDisplay.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                      </div>
                      <div className={`num ${holdingReturnRate >= 0 ? 'text-gain' : 'text-loss'}`} style={{ fontSize: '0.75rem' }}>
                        {holdingReturnRate >= 0 ? '+' : ''}{holdingReturnRate.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Best practices feed */}
      <div className="card flex flex-col gap-4">
        <div className="flex align-center gap-2" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-3)' }}>
          <BookOpen size={16} style={{ color: 'var(--ink-muted)' }} />
          <span className="card-title" style={{ margin: 0 }}>Investment Principles Feed</span>
        </div>
        <div className="grid grid-2 gap-6">
          {PRINCIPLES.map((p, idx) => (
            <div key={idx} className="flex flex-col gap-2" style={{ paddingRight: 'var(--space-2)' }}>
              <h4 style={{ fontWeight: 600, fontSize: '0.98rem' }}>{p.title}</h4>
              <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', lineHeight: 1.4 }}>{p.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trade Modal */}
      {selectedStock && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(10, 10, 10, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 'var(--space-4)',
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="card"
            style={{
              width: '100%',
              maxWidth: '400px',
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
            }}
          >
            <h3 className="serif-title" style={{ fontSize: '1.6rem', marginBottom: 'var(--space-2)' }}>
              Trade {selectedStock.ticker}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginBottom: 'var(--space-4)' }}>
              Current Price: {getCurrencySymbol(displayCurrency)}{priceInDisplay.toFixed(2)} 
              {displayCurrency !== getStockCurrencyCode(selectedStock) && ` (${selectedStock.currency}${selectedStock.price.toFixed(2)})`}
            </p>

            <form onSubmit={handleTradeSubmit} className="flex flex-col gap-4">
              <div className="input-group">
                <label className="input-label">Action</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn"
                    style={{
                      flex: 1,
                      backgroundColor: tradeType === 'buy' ? 'var(--ink-color)' : 'var(--nav-pill-bg)',
                      color: tradeType === 'buy' ? 'var(--bg-color)' : 'var(--ink-color)',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.85rem',
                      padding: '8px 0',
                    }}
                    onClick={() => setTradeType('buy')}
                  >
                    Buy (Invest)
                  </button>
                  <button
                    type="button"
                    className="btn"
                    style={{
                      flex: 1,
                      backgroundColor: tradeType === 'sell' ? 'var(--ink-color)' : 'var(--nav-pill-bg)',
                      color: tradeType === 'sell' ? 'var(--bg-color)' : 'var(--ink-color)',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.85rem',
                      padding: '8px 0',
                    }}
                    onClick={() => setTradeType('sell')}
                  >
                    Sell (Liquidate)
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Number of Shares</label>
                <input
                  type="text"
                  placeholder="e.g. 10"
                  value={sharesInput}
                  onChange={(e) => setSharesInput(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="input-field num-input"
                  style={{
                    backgroundColor: 'var(--bg-color)',
                    color: 'var(--ink-color)',
                    border: '1px solid var(--border-color)',
                  }}
                  required
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1" style={{ fontSize: '0.85rem', padding: 'var(--space-2) 0' }}>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--ink-muted)' }}>Estimated Value</span>
                  <span className="num" style={{ fontWeight: 600 }}>
                    {getCurrencySymbol(displayCurrency)}{totalCostDisplay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--ink-muted)' }}>Cash Balance</span>
                  <span className="num" style={{ fontWeight: 600 }}>
                    {getCurrencySymbol(displayCurrency)}{displayBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {displayCurrency !== 'MUR' && ` (~Rs. ${generalBalance.toLocaleString()})`}
                  </span>
                </div>
              </div>

              {hasError && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'var(--coral-losses-bg)',
                  border: '1px solid rgba(232, 93, 93, 0.2)',
                  padding: '12px',
                  borderRadius: '8px',
                  color: 'var(--coral-losses)',
                  fontSize: '0.85rem',
                  marginTop: 'var(--space-2)'
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>
                    {isOverdraft 
                      ? "Insufficient general cash balance." 
                      : "You do not own enough shares to sell."}
                  </span>
                </div>
              )}

              <div className="flex justify-between" style={{ marginTop: 'var(--space-4)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedStock(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={!sharesInput || shares <= 0 || hasError}>
                  Confirm Order
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

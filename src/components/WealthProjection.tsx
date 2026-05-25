import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';


interface WealthProjectionProps {
  initialNetWorth: number;
  monthlyDeposit: number;
}

export const WealthProjection: React.FC<WealthProjectionProps> = ({
  initialNetWorth,
  monthlyDeposit: defaultMonthlyDeposit,
}) => {
  const [principal, setPrincipal] = useState(initialNetWorth);
  const [monthly, setMonthly] = useState(defaultMonthlyDeposit);
  const [rate, setRate] = useState(8); // 8% default stock market return
  const [years] = useState(30);

  const [principalInput, setPrincipalInput] = useState(initialNetWorth.toLocaleString('en-US'));
  const [monthlyInput, setMonthlyInput] = useState(defaultMonthlyDeposit.toLocaleString('en-US'));

  // Hover/Scrubbing state
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const chartRef = useRef<SVGSVGElement | null>(null);

  // Sync with props when they change (initial state loads)
  useEffect(() => {
    setPrincipal(initialNetWorth);
    setMonthly(defaultMonthlyDeposit);
    setPrincipalInput(initialNetWorth.toLocaleString('en-US'));
    setMonthlyInput(defaultMonthlyDeposit.toLocaleString('en-US'));
  }, [initialNetWorth, defaultMonthlyDeposit]);

  const handleCurrencyChange = (value: string, setter: (val: string) => void) => {
    const clean = value.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) return; // ignore multiple decimals
    
    // Add thousands separators to the integer part
    const formattedInt = parts[0] ? parseInt(parts[0], 10).toLocaleString('en-US') : '';
    const formatted = parts[1] !== undefined ? `${formattedInt}.${parts[1].slice(0, 2)}` : formattedInt;
    
    setter(clean === '' ? '' : formatted);
  };

  const handlePrincipalChange = (val: string) => {
    handleCurrencyChange(val, setPrincipalInput);
    const parsed = parseFloat(val.replace(/,/g, '')) || 0;
    setPrincipal(parsed);
  };

  const handleMonthlyChange = (val: string) => {
    handleCurrencyChange(val, setMonthlyInput);
    const parsed = parseFloat(val.replace(/,/g, '')) || 0;
    setMonthly(parsed);
  };

  // Compute compound interest year by year
  const calculateData = () => {
    const dataPoints: { year: number; balance: number; interestEarned: number; principalPaid: number }[] = [];
    let currentBalance = principal;
    let totalInvested = principal;
    const r = rate / 100 / 12;

    dataPoints.push({
      year: 0,
      balance: Math.round(currentBalance),
      interestEarned: 0,
      principalPaid: Math.round(totalInvested),
    });

    for (let y = 1; y <= years; y++) {
      for (let m = 0; m < 12; m++) {
        currentBalance = currentBalance * (1 + r) + monthly;
        totalInvested += monthly;
      }
      dataPoints.push({
        year: y,
        balance: Math.round(currentBalance),
        interestEarned: Math.max(0, Math.round(currentBalance - totalInvested)),
        principalPaid: Math.round(totalInvested),
      });
    }
    return dataPoints;
  };

  const points = calculateData();
  const maxBalance = Math.max(...points.map(p => p.balance));
  const minBalance = Math.min(...points.map(p => p.balance));

  // Chart dimensions
  const width = 800;
  const height = 240;
  const padding = 20;

  // Convert points to SVG coordinates
  const svgPoints = points.map((p, idx) => {
    const x = padding + (idx / (points.length - 1)) * (width - 2 * padding);
    const ratio = maxBalance === minBalance ? 0.5 : (p.balance - minBalance) / (maxBalance - minBalance);
    const y = height - padding - ratio * (height - 2 * padding);
    return { x, y, data: p };
  });

  // Create path string
  const pathString = svgPoints.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  // Handle hover scrubbing
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relativeX = (x / rect.width) * width;
    
    // Find closest index
    let closestIdx = 0;
    let closestDist = Infinity;
    svgPoints.forEach((p, idx) => {
      const dist = Math.abs(p.x - relativeX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = idx;
      }
    });

    setHoverIndex(closestIdx);
    // map relative position back to screen coords for tooltip
    const svgPoint = svgPoints[closestIdx];
    setHoverPos({
      x: (svgPoint.x / width) * rect.width,
      y: (svgPoint.y / height) * rect.height,
    });
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const getProjectionAtYear = (y: number) => {
    const found = points.find(p => p.year === y);
    return found ? found.balance : 0;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-8"
    >
      <div className="flex flex-col gap-2">
        <h1 className="serif-title" style={{ fontSize: '2.5rem', fontWeight: 400, fontStyle: 'italic' }}>Wealth Projection</h1>
        <p style={{ color: 'var(--ink-muted)' }}>
          Visualize compound growth potential over up to 30 years based on recurring contributions.
        </p>
      </div>

      {/* SVG Line Chart Card */}
      <div className="card flex flex-col gap-4" style={{ position: 'relative', overflow: 'visible' }}>
        <div className="flex justify-between align-center">
          <div className="card-title" style={{ margin: 0 }}>Compounding Curve</div>
          <span className="num" style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
            Initial Rs. {principal.toLocaleString()} • Rs. {monthly.toLocaleString()} / mo @ {rate}%
          </span>
        </div>

        {/* Chart render container */}
        <div style={{ position: 'relative', width: '100%', minHeight: `${height}px`, overflow: 'visible' }}>
          <svg
            ref={chartRef}
            viewBox={`0 0 ${width} ${height}`}
            width="100%"
            height="100%"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ overflow: 'visible', cursor: 'crosshair' }}
          >
            {/* Grid horizontal guidelines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = height - padding - ratio * (height - 2 * padding);
              return (
                <line
                  key={ratio}
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="var(--border-color)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              );
            })}

            {/* Spark line path */}
            <motion.path
              d={pathString}
              fill="none"
              stroke="var(--emerald-gains)"
              strokeWidth="2.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            />

            {/* Area under curve */}
            {svgPoints.length > 0 && (
              <path
                d={`${pathString} L ${svgPoints[svgPoints.length - 1].x} ${height - padding} L ${svgPoints[0].x} ${height - padding} Z`}
                fill="url(#glow-gradient)"
                opacity="0.3"
              />
            )}

            <defs>
              <linearGradient id="glow-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--emerald-gains)" stopOpacity="0.12" />
                <stop offset="100%" stopColor="var(--emerald-gains)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Render hover pointer */}
            {hoverIndex !== null && (
              <>
                <line
                  x1={svgPoints[hoverIndex].x}
                  y1={padding}
                  x2={svgPoints[hoverIndex].x}
                  y2={height - padding}
                  stroke="var(--ink-color)"
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                />
                <circle
                  cx={svgPoints[hoverIndex].x}
                  cy={svgPoints[hoverIndex].y}
                  r="5"
                  fill="var(--emerald-gains)"
                  stroke="var(--card-bg)"
                  strokeWidth="2"
                />
              </>
            )}
          </svg>

          {/* Floating Scrubbing Tooltip */}
          {hoverIndex !== null && (
            <div style={{
              position: 'absolute',
              top: `${hoverPos.y - 76}px`,
              left: `${hoverPos.x}px`,
              transform: 'translateX(-50%)',
              backgroundColor: 'var(--card-bg)',
              color: 'var(--ink-color)',
              border: '1px solid var(--border-color)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              pointerEvents: 'none',
              boxShadow: '0 8px 16px rgba(0,0,0,0.06)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              whiteSpace: 'nowrap',
              zIndex: 10,
            }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', fontWeight: 550 }}>Year {points[hoverIndex].year}</span>
              <span className="num" style={{ fontWeight: 700, color: 'var(--ink-color)', marginTop: '2px' }}>
                Rs. {points[hoverIndex].balance.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* X Axis Indicators */}
        <div className="flex justify-between" style={{ fontSize: '0.78rem', color: 'var(--ink-light)', padding: '0 var(--space-4)' }}>
          <span>Year 0</span>
          <span>Year {Math.round(years / 2)}</span>
          <span>Year {years}</span>
        </div>
      </div>

      {/* Control sliders */}
      <div className="grid grid-3 gap-6">
        <div className="card flex flex-col gap-2">
          <span className="input-label">Initial Net Worth</span>
          <div className="flex align-center gap-1">
            <span style={{ fontSize: '0.9rem', color: 'var(--ink-muted)' }}>Rs.</span>
            <input
              type="text"
              value={principalInput}
              onChange={(e) => handlePrincipalChange(e.target.value)}
              className="input-field num-input"
              style={{ padding: '8px 12px', height: '40px', fontSize: '0.95rem' }}
            />
          </div>
        </div>

        <div className="card flex flex-col gap-2">
          <span className="input-label">Monthly Savings Add</span>
          <div className="flex align-center gap-1">
            <span style={{ fontSize: '0.9rem', color: 'var(--ink-muted)' }}>Rs.</span>
            <input
              type="text"
              value={monthlyInput}
              onChange={(e) => handleMonthlyChange(e.target.value)}
              className="input-field num-input"
              style={{ padding: '8px 12px', height: '40px', fontSize: '0.95rem' }}
            />
          </div>
        </div>

        <div className="card flex flex-col gap-2">
          <div className="flex justify-between">
            <span className="input-label">Annual Yield %</span>
            <span className="num" style={{ fontSize: '0.95rem', fontWeight: 600 }}>{rate}%</span>
          </div>
          <input
            type="range"
            min="1"
            max="18"
            value={rate}
            onChange={(e) => setRate(parseInt(e.target.value))}
            className="custom-slider"
            style={{ margin: 0 }}
          />
        </div>
      </div>

      {/* Snapshot projections */}
      <div className="card flex flex-col gap-4">
        <div className="card-title">Projection Timelines</div>
        <div className="grid grid-4 gap-6">
          <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: 'var(--space-2)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>In 5 Years</span>
            <h3 className="num" style={{ fontSize: '1.4rem', fontWeight: 600, marginTop: '2px' }}>
              Rs. {getProjectionAtYear(Math.min(years, 5)).toLocaleString()}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--ink-light)' }}>
              Growth: Rs. {Math.max(0, getProjectionAtYear(Math.min(years, 5)) - (principal + (monthly * 12 * Math.min(years, 5)))).toLocaleString()}
            </span>
          </div>
          <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: 'var(--space-2)', paddingLeft: 'var(--space-2)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>In 10 Years</span>
            <h3 className="num" style={{ fontSize: '1.4rem', fontWeight: 600, marginTop: '2px' }}>
              Rs. {getProjectionAtYear(Math.min(years, 10)).toLocaleString()}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--ink-light)' }}>
              Growth: Rs. {Math.max(0, getProjectionAtYear(Math.min(years, 10)) - (principal + (monthly * 12 * Math.min(years, 10)))).toLocaleString()}
            </span>
          </div>
          <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: 'var(--space-2)', paddingLeft: 'var(--space-2)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>In 20 Years</span>
            <h3 className="num" style={{ fontSize: '1.4rem', fontWeight: 600, marginTop: '2px' }}>
              Rs. {getProjectionAtYear(Math.min(years, 20)).toLocaleString()}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--ink-light)' }}>
              Growth: Rs. {Math.max(0, getProjectionAtYear(Math.min(years, 20)) - (principal + (monthly * 12 * Math.min(years, 20)))).toLocaleString()}
            </span>
          </div>
          <div style={{ paddingLeft: 'var(--space-2)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>In 30 Years</span>
            <h3 className="num" style={{ fontSize: '1.4rem', fontWeight: 600, marginTop: '2px' }}>
              Rs. {getProjectionAtYear(Math.min(years, 30)).toLocaleString()}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--ink-light)' }}>
              Growth: Rs. {Math.max(0, getProjectionAtYear(Math.min(years, 30)) - (principal + (monthly * 12 * Math.min(years, 30)))).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

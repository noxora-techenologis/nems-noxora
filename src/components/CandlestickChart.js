'use client';

import { useState } from 'react';
import { formatCurrency, formatNumber } from '@/lib/format';

// Sample Trading Datasets (Open, High, Low, Close, Volume, Period Label)
const DATASETS = {
  '1M': [
    { period: 'يناير', open: 90, high: 108, low: 85, close: 100, volume: 12500 },
    { period: 'فبراير', open: 100, high: 120, low: 96, close: 112, volume: 18200 },
    { period: 'مارس', open: 112, high: 116, low: 98, close: 105, volume: 14800 },
    { period: 'أبريل', open: 105, high: 135, low: 102, close: 130, volume: 24500 },
    { period: 'مايو', open: 130, high: 152, low: 126, close: 145, volume: 31000 },
    { period: 'يونيو', open: 145, high: 168, low: 140, close: 160, volume: 36400 },
    { period: 'يوليو', open: 160, high: 192, low: 156, close: 185, volume: 49200 },
  ],
  '1W': [
    { period: 'الأسبوع 1', open: 152, high: 164, low: 148, close: 160, volume: 8400 },
    { period: 'الأسبوع 2', open: 160, high: 174, low: 156, close: 168, volume: 11200 },
    { period: 'الأسبوع 3', open: 168, high: 171, low: 160, close: 162, volume: 9100 },
    { period: 'الأسبوع 4', open: 162, high: 192, low: 161, close: 185, volume: 20500 },
  ],
  '1D': [
    { period: '09:00', open: 175, high: 179, low: 173, close: 178, volume: 2100 },
    { period: '11:00', open: 178, high: 182, low: 175, close: 176, volume: 1800 },
    { period: '13:00', open: 176, high: 185, low: 174, close: 183, volume: 3400 },
    { period: '15:00', open: 183, high: 188, low: 181, close: 182, volume: 2900 },
    { period: '17:00', open: 182, high: 192, low: 180, close: 185, volume: 4800 },
  ],
};

export default function CandlestickChart() {
  const [timeframe, setTimeframe] = useState('1M');
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const rawData = DATASETS[timeframe] || DATASETS['1M'];
  const activeIndex = hoveredIndex !== null ? hoveredIndex : rawData.length - 1;
  const activeCandle = rawData[activeIndex];

  // Calculate High/Low bounds for chart scaling
  const allPrices = rawData.flatMap(d => [d.high, d.low]);
  const minPrice = Math.min(...allPrices) * 0.95;
  const maxPrice = Math.max(...allPrices) * 1.05;
  const priceRange = maxPrice - minPrice || 1;

  const maxVolume = Math.max(...rawData.map(d => d.volume)) || 1;

  // Chart dimensions
  const chartHeight = 220;
  const chartWidth = 600;
  const paddingLeft = 40;
  const paddingRight = 70;
  const paddingTop = 30;
  const paddingBottom = 40;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const getX = (index) => {
    if (rawData.length === 1) return paddingLeft + innerWidth / 2;
    return paddingLeft + (index / (rawData.length - 1)) * innerWidth;
  };

  const getY = (price) => {
    return paddingTop + innerHeight - ((price - minPrice) / priceRange) * innerHeight;
  };

  const getVolY = (vol) => {
    const volHeight = (vol / maxVolume) * 45; // max 45px height for volume bars
    return paddingTop + innerHeight - volHeight;
  };

  // Change percentage for active candle
  const isBullish = activeCandle.close >= activeCandle.open;
  const changeVal = activeCandle.close - activeCandle.open;
  const changePct = ((changeVal / activeCandle.open) * 100).toFixed(2);

  return (
    <div className="trading-chart-card" style={{
      background: 'linear-gradient(180deg, #131722 0%, #0A0B0E 100%)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '18px',
      boxShadow: 'var(--shadow-md)',
      color: '#D1D4DC',
      position: 'relative'
    }}>
      {/* Top Header: Timeframe Tabs & Active Candle Specs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px', fontWeight: 900, color: '#F3F5FA' }}>🕯️ مخطط الشموع اليابانية (NOX/MRU)</span>
            <span style={{
              fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px',
              background: isBullish ? 'rgba(38, 166, 154, 0.2)' : 'rgba(239, 83, 80, 0.2)',
              color: isBullish ? '#26a69a' : '#ef5350',
              border: `1px solid ${isBullish ? '#26a69a' : '#ef5350'}`
            }}>
              {isBullish ? '▲ صاعد' : '▼ هابط'} {changePct > 0 ? `+${changePct}` : changePct}%
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#787B86', marginTop: '4px' }}>
            نوكسورا تكنولوجيز · سوق الأسهم المالي
          </div>
        </div>

        {/* Timeframe Selector Buttons */}
        <div style={{ display: 'flex', gap: '4px', background: '#1E222D', padding: '3px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
          {['1D', '1W', '1M'].map(tf => (
            <button
              key={tf}
              onClick={() => { setTimeframe(tf); setHoveredIndex(null); }}
              style={{
                background: timeframe === tf ? '#2962FF' : 'transparent',
                color: timeframe === tf ? '#FFFFFF' : '#787B86',
                border: 'none', borderRadius: '4px', padding: '4px 10px',
                fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {tf === '1D' ? 'يومي (1D)' : tf === '1W' ? 'أسبوعي (1W)' : 'شهري (1M)'}
            </button>
          ))}
        </div>
      </div>

      {/* OHLC Bar Metrics */}
      <div style={{
        display: 'flex', gap: '16px', flexWrap: 'wrap',
        fontSize: '11.5px', background: 'rgba(255,255,255,0.03)',
        padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)',
        marginBottom: '14px', fontFamily: 'monospace'
      }}>
        <div><span style={{ color: '#787B86' }}>الفترة:</span> <strong style={{ color: '#F3F5FA' }}>{activeCandle.period}</strong></div>
        <div><span style={{ color: '#787B86' }}>الافتتاح:</span> <strong style={{ color: '#F3F5FA' }}>{formatCurrency(activeCandle.open, 'MRU')}</strong></div>
        <div><span style={{ color: '#787B86' }}>الأعلى:</span> <strong style={{ color: '#26a69a' }}>{formatCurrency(activeCandle.high, 'MRU')}</strong></div>
        <div><span style={{ color: '#787B86' }}>الأدنى:</span> <strong style={{ color: '#ef5350' }}>{formatCurrency(activeCandle.low, 'MRU')}</strong></div>
        <div><span style={{ color: '#787B86' }}>الإغلاق:</span> <strong style={{ color: isBullish ? '#26a69a' : '#ef5350' }}>{formatCurrency(activeCandle.close, 'MRU')}</strong></div>
        <div><span style={{ color: '#787B86' }}>الحجم:</span> <strong style={{ color: '#F3F5FA' }}>{formatNumber(activeCandle.volume)} أسهم</strong></div>
      </div>

      {/* SVG Canvas Chart */}
      <div style={{ position: 'relative', width: '100%', height: `${chartHeight}px` }}>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          {/* Grid Horizontal Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const p = minPrice + ratio * priceRange;
            const y = getY(p);
            return (
              <g key={i}>
                <line x1={paddingLeft} y1={y} x2={chartWidth - paddingRight} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="2 2" />
                <text x={chartWidth - paddingRight + 8} y={y + 3} fill="#787B86" fontSize="9px" fontFamily="monospace">
                  {formatCurrency(p, 'MRU').split(' ')[0]}
                </text>
              </g>
            );
          })}

          {/* Candlesticks Render */}
          {rawData.map((d, index) => {
            const cx = getX(index);
            const yHigh = getY(d.high);
            const yLow = getY(d.low);
            const yOpen = getY(d.open);
            const yClose = getY(d.close);

            const candleIsBullish = d.close >= d.open;
            const color = candleIsBullish ? '#26a69a' : '#ef5350';
            const bodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(3, Math.abs(yOpen - yClose));
            const candleWidth = 14;

            // Volume bar Y
            const volY = getVolY(d.volume);
            const volHeight = paddingTop + innerHeight - volY;

            const isHovered = hoveredIndex === index;

            return (
              <g
                key={index}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Volume Bar */}
                <rect
                  x={cx - candleWidth / 2}
                  y={volY}
                  width={candleWidth}
                  height={volHeight}
                  fill={color}
                  opacity={isHovered ? 0.6 : 0.25}
                  rx="1"
                />

                {/* Candlestick Wick Line */}
                <line
                  x1={cx}
                  y1={yHigh}
                  x2={cx}
                  y2={yLow}
                  stroke={color}
                  strokeWidth="1.5"
                />

                {/* Candlestick Body Rect */}
                <rect
                  x={cx - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={color}
                  stroke={color}
                  strokeWidth="1"
                  rx="2"
                  style={{
                    transition: 'all 0.2s ease',
                    filter: isHovered ? `drop-shadow(0 0 6px ${color})` : 'none'
                  }}
                />

                {/* Hover vertical crosshair */}
                {isHovered && (
                  <line
                    x1={cx}
                    y1={paddingTop}
                    x2={cx}
                    y2={paddingTop + innerHeight}
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Date Label on X Axis */}
                <text
                  x={cx}
                  y={chartHeight - 10}
                  textAnchor="middle"
                  fill={isHovered ? '#FFFFFF' : '#787B86'}
                  fontSize="9px"
                  fontWeight={isHovered ? 'bold' : 'normal'}
                >
                  {d.period}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

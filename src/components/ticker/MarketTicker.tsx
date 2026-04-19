'use client';

import { useEffect, useState } from 'react';

interface TickerItem {
  symbol: string;
  price: number;
  changePercent: number;
  name: string;
  type: 'crypto' | 'index' | 'stock';
}

export default function MarketTicker({ locale }: { locale: 'en' | 'tr' }) {
  const [tickers, setTickers] = useState<TickerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTickers = async () => {
      try {
        const res = await fetch('/api/ticker');
        if (!res.ok) return;
        const data = await res.json();
        setTickers(data.tickers || []);
      } catch (e) {
        console.error('Ticker load error:', e);
      } finally {
        setLoading(false);
      }
    };

    loadTickers();
    // Refresh every 5 seconds
    const interval = setInterval(loadTickers, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-[#0f0f20] border-b border-[#2a2a3e] px-4 py-2 text-xs text-[#555570]">
        {locale === 'tr' ? 'Fiyatlar yükleniyor...' : 'Loading prices...'}
      </div>
    );
  }

  // Group by type
  const cryptos = tickers.filter(t => t.type === 'crypto').slice(0, 8);
  const indices = tickers.filter(t => t.type === 'index');
  const mag7 = tickers.filter(t => t.type === 'stock');

  return (
    <div className="bg-[#0f0f20] border-b border-[#2a2a3e] overflow-hidden py-2">
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .ticker-scroll {
          animation: scroll 60s linear infinite;
        }
        .ticker-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="ticker-scroll flex gap-8 px-4 whitespace-nowrap">
        {/* First set */}
        {/* Cryptos */}
        {cryptos.map(t => (
          <TickerItemComponent key={`1-${t.symbol}`} item={t} />
        ))}
        <div className="w-px bg-[#2a2a3e]" />
        {/* Indices */}
        {indices.map(t => (
          <TickerItemComponent key={`1-idx-${t.symbol}`} item={t} />
        ))}
        <div className="w-px bg-[#2a2a3e]" />
        {/* Mag7 */}
        {mag7.map(t => (
          <TickerItemComponent key={`1-mag7-${t.symbol}`} item={t} />
        ))}

        {/* Duplicate for seamless loop */}
        <div className="w-px bg-[#2a2a3e]" />
        {/* Cryptos (repeat) */}
        {cryptos.map(t => (
          <TickerItemComponent key={`2-${t.symbol}`} item={t} />
        ))}
        <div className="w-px bg-[#2a2a3e]" />
        {/* Indices (repeat) */}
        {indices.map(t => (
          <TickerItemComponent key={`2-idx-${t.symbol}`} item={t} />
        ))}
        <div className="w-px bg-[#2a2a3e]" />
        {/* Mag7 (repeat) */}
        {mag7.map(t => (
          <TickerItemComponent key={`2-mag7-${t.symbol}`} item={t} />
        ))}
      </div>
    </div>
  );
}

function TickerItemComponent({ item }: { item: TickerItem }) {
  const isPositive = item.changePercent >= 0;
  const displayName =
    item.type === 'index'
      ? item.name
      : item.type === 'stock'
      ? item.symbol
      : item.name;

  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span className="text-xs font-medium text-[#e0e0e0]">{displayName}</span>
      <span className="text-xs font-mono text-[#c0c0d0]">
        ${item.price.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>
      <span
        className={`text-xs font-medium ${
          isPositive ? 'text-[#26a69a]' : 'text-[#ef5350]'
        }`}
      >
        {isPositive ? '▲' : '▼'} {Math.abs(item.changePercent).toFixed(2)}%
      </span>
    </div>
  );
}

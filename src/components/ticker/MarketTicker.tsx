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
        /* İçerik iki kez render olduğu için 0 → -50% tam bir kopya genişliğine
           denk gelir; loop sonunda ikinci kopya birinci kopyanın başlangıç
           pozisyonuna oturduğundan jump/duraksama olmadan dönüyor. */
        @keyframes scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-scroll {
          /* 90s çok yavaştı (~10px/s); 45s ile yaklaşık 2× hız ve hâlâ
             rahat okunabilir. */
          animation: scroll 45s linear infinite;
          will-change: transform;
        }
        .ticker-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
      {/* Parent flex'te gap YOK — kopyalar bitişik olmalı ki translateX(-50%)
          tam olarak bir kopya genişliği olsun. Kopya içi gap her child'da
          tutulur; kopya sonuna pr-8 ile ekleyerek bir sonraki kopyanın
          ilk öğesi ile araya görsel boşluk konur. */}
      <div className="ticker-scroll flex whitespace-nowrap pl-4">
        {[0, 1].map(copy => (
          <div key={copy} className="flex gap-8 pr-8 shrink-0">
            {cryptos.map(t => (
              <TickerItemComponent key={`${copy}-${t.symbol}`} item={t} />
            ))}
            <div className="w-px bg-[#2a2a3e]" />
            {indices.map(t => (
              <TickerItemComponent key={`${copy}-idx-${t.symbol}`} item={t} />
            ))}
            <div className="w-px bg-[#2a2a3e]" />
            {mag7.map(t => (
              <TickerItemComponent key={`${copy}-mag7-${t.symbol}`} item={t} />
            ))}
          </div>
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

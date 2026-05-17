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
    // 30s polling — 5s'lik refresh layout reflow'a sebep oluyordu (animasyon mid-flight'ta data
    // değişince DOM widthleri kayıp atlama oluşturuyor).
    const interval = setInterval(loadTickers, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-[#0f0f20] border-b border-[#2a2a3e] px-4 py-2 text-xs text-[#555570]">
        {locale === 'tr' ? 'Fiyatlar yükleniyor...' : 'Loading prices...'}
      </div>
    );
  }

  // Grup sırası: BTC/ETH → 12 endeks → Mag7. Tek liste — sub-section divider yok
  // (boş kripto gibi durumlarda kenarda bulutsu divider duruyordu).
  const ordered: TickerItem[] = [
    ...tickers.filter(t => t.type === 'crypto'),
    ...tickers.filter(t => t.type === 'index'),
    ...tickers.filter(t => t.type === 'stock'),
  ];

  if (ordered.length === 0) {
    return (
      <div className="bg-[#0f0f20] border-b border-[#2a2a3e] px-4 py-2 text-xs text-[#555570]">
        {locale === 'tr' ? 'Veri çekilemedi' : 'No data'}
      </div>
    );
  }

  return (
    <div className="bg-[#0f0f20] border-b border-[#2a2a3e] overflow-hidden py-1.5">
      <style>{`
        /* Seamless marquee: tek "track" element içinde iki bitişik kopya.
           translateX(-50%) tam bir kopyalık offset → loop kapanışında ikinci
           kopya birinci kopyanın başlangıç pozisyonuna oturur, görsel jump yok.
           ÖNEMLİ: track'in kendisinde padding/margin/border OLMAMALI;
           translateX yüzdesi padding-content-border'ı dahil eder, asymmetric
           olur. Sol/sağ pad gerekirse dış wrapper'a koy. */
        @keyframes axiom-ticker-scroll {
          from { transform: translate3d(0, 0, 0); }
          to   { transform: translate3d(-50%, 0, 0); }
        }
        .axiom-ticker-track {
          display: flex;
          width: max-content;
          animation: axiom-ticker-scroll 60s linear infinite;
          will-change: transform;
        }
        .axiom-ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="axiom-ticker-track" aria-hidden>
        {/* İki bitişik kopya → seamless loop */}
        <TickerCopy items={ordered} />
        <TickerCopy items={ordered} />
      </div>
    </div>
  );
}

function TickerCopy({ items }: { items: TickerItem[] }) {
  return (
    <div className="flex shrink-0">
      {items.map((t, i) => (
        <TickerItemComponent key={`${t.type}-${t.symbol}-${i}`} item={t} />
      ))}
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
    <div className="flex items-center gap-2 whitespace-nowrap px-4">
      <span className="text-sm font-medium text-[#e0e0e0]">{displayName}</span>
      <span className="text-sm font-mono text-[#c0c0d0]">
        {item.type === 'crypto' || item.type === 'stock'
          ? `$${item.price.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          : item.price.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
      </span>
      <span
        className={`text-sm font-medium ${
          isPositive ? 'text-[#26a69a]' : 'text-[#ef5350]'
        }`}
      >
        {isPositive ? '▲' : '▼'} {Math.abs(item.changePercent).toFixed(2)}%
      </span>
    </div>
  );
}

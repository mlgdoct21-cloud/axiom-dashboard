'use client';

import { useEffect, useRef, useState } from 'react';

interface FavoritesBarProps {
  favorites: string[];
  onAddFavorite: (symbol: string) => void;
  onRemoveFavorite: (symbol: string) => void;
  locale: 'en' | 'tr';
}

interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  high24h?: number;
  low24h?: number;
  timestamp: number;
  source: 'binance' | 'yahoo';
}

// Anlik fiyat her 15 saniyede yenilenir
const QUOTE_REFRESH_INTERVAL = 15000;
// Sparkline 1h candle * 24 = son 24 saat
const SPARKLINE_RESOLUTION = '60';
const SPARKLINE_LIMIT = 24;

function formatPrice(p: number, locale: 'en' | 'tr'): string {
  if (p < 0.0001) return p.toFixed(8);
  if (p < 0.01)  return p.toFixed(6);
  if (p < 1)     return p.toFixed(4);
  if (p < 100)   return p.toFixed(2);
  return p.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function displaySymbol(sym: string): string {
  return sym
    .replace('BINANCE:', '')
    .replace('OANDA:', '')
    .replace('_', '/')
    .replace('USDT', '');
}

/** Basit inline SVG sparkline */
function Sparkline({ data, color, width = 60, height = 20 }: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data
    .map((v, i) => `${i * step},${height - ((v - min) / range) * height}`)
    .join(' ');

  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        points={points}
      />
    </svg>
  );
}

export default function FavoritesBar({
  favorites,
  onAddFavorite,
  onRemoveFavorite,
  locale,
}: FavoritesBarProps) {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [newSymbol, setNewSymbol] = useState('');
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [pulsing, setPulsing] = useState<Set<string>>(new Set());
  const prevPricesRef = useRef<Record<string, number>>({});

  // Anlik fiyat fetch
  const loadQuotes = async () => {
    if (favorites.length === 0) {
      setQuotes({});
      return;
    }
    try {
      const symbolsParam = favorites.join(',');
      const res = await fetch(`/api/quote?symbols=${encodeURIComponent(symbolsParam)}`);
      if (!res.ok) return;
      const data = await res.json();
      const newQuotes: Record<string, Quote> = {};
      const nowPulse = new Set<string>();

      (data.quotes as Quote[]).forEach(q => {
        newQuotes[q.symbol] = q;
        const prev = prevPricesRef.current[q.symbol];
        if (prev !== undefined && prev !== q.price) {
          nowPulse.add(q.symbol);
        }
        prevPricesRef.current[q.symbol] = q.price;
      });

      setQuotes(newQuotes);
      setPulsing(nowPulse);
      setLastUpdate(Date.now());

      // Pulse'u 500ms sonra temizle
      if (nowPulse.size > 0) {
        setTimeout(() => setPulsing(new Set()), 600);
      }
    } catch (e) {
      console.error('Quote fetch error:', e);
    }
  };

  // Sparkline verisi (ilk yuklemede cek, sonra 5dk'da bir)
  const loadSparklines = async () => {
    if (favorites.length === 0) return;
    const newSparks: Record<string, number[]> = {};
    await Promise.all(
      favorites.map(async sym => {
        try {
          const res = await fetch(
            `/api/candles?symbol=${encodeURIComponent(sym)}&resolution=${SPARKLINE_RESOLUTION}`
          );
          if (!res.ok) return;
          const data = await res.json();
          const candles = (data.candles || []).slice(-SPARKLINE_LIMIT);
          if (candles.length > 0) {
            newSparks[sym] = candles.map((c: { close: number }) => c.close);
          }
        } catch (e) {}
      })
    );
    setSparklines(newSparks);
  };

  // Ilk yukleme + favori degisikligi
  useEffect(() => {
    loadQuotes();
    loadSparklines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites.join(',')]);

  // Otomatik yenileme
  useEffect(() => {
    const interval = setInterval(loadQuotes, QUOTE_REFRESH_INTERVAL);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites.join(',')]);

  // Sparkline her 5 dakikada bir yenile
  useEffect(() => {
    const interval = setInterval(loadSparklines, 5 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites.join(',')]);

  const handleAddFavorite = () => {
    if (!newSymbol.trim()) return;
    let input = newSymbol.trim().toUpperCase();
    // Akilli prefix: BTC -> BINANCE:BTCUSDT, USDT ile bitmiyorsa ve 4+ harfli ise
    if (!input.includes(':') && !input.includes('.')) {
      // 2-6 harfli ve yaygin kripto semboluyse BINANCE ekle
      const cryptoTickers = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'LINK', 'MATIC', 'SHIB', 'PEPE'];
      if (cryptoTickers.includes(input)) {
        input = `BINANCE:${input}USDT`;
      }
      // aksi durumda AAPL, TSLA gibi hisse varsayiyoruz
    }
    if (!favorites.includes(input)) {
      onAddFavorite(input);
    }
    setNewSymbol('');
  };

  const refreshTimeAgo = () => {
    if (!lastUpdate) return '';
    const diff = Math.floor((Date.now() - lastUpdate) / 1000);
    if (diff < 60) return `${diff}s`;
    return `${Math.floor(diff / 60)}m`;
  };

  return (
    <div className="flex flex-col h-full bg-[#141425]">
      {/* Header */}
      <div className="p-2 border-b border-[#2a2a3e] space-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-[#8888a0] uppercase tracking-wider font-semibold">
            {locale === 'tr' ? '⭐ Favoriler' : '⭐ Watchlist'}
          </span>
          {lastUpdate > 0 && (
            <span className="flex items-center gap-1 text-[#26a69a]">
              <span className="w-1.5 h-1.5 bg-[#26a69a] rounded-full animate-pulse" />
              {refreshTimeAgo()}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <input
            type="text"
            placeholder={locale === 'tr' ? 'BTC, AAPL...' : 'BTC, AAPL...'}
            value={newSymbol}
            onChange={e => setNewSymbol(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleAddFavorite()}
            className="flex-1 px-2 py-1 bg-[#1a1a2e] border border-[#2a2a3e] rounded text-xs text-[#e0e0e0] placeholder-[#555570] focus:border-[#4fc3f7] focus:outline-none"
          />
          <button
            onClick={handleAddFavorite}
            className="px-2 py-1 bg-[#1a1a2e] border border-[#2a2a3e] text-[#4fc3f7] rounded text-xs hover:bg-[#1e1e38] transition"
          >
            +
          </button>
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto">
        {favorites.length === 0 ? (
          <div className="p-3 text-center text-[#555570] text-xs">
            {locale === 'tr' ? 'Sembol ekleyin' : 'Add symbols'}
            <div className="text-[10px] mt-2 text-[#444460]">
              {locale === 'tr'
                ? 'Orn: BTC, ETH, AAPL, TSLA'
                : 'Ex: BTC, ETH, AAPL, TSLA'}
            </div>
          </div>
        ) : (
          favorites.map(symbol => {
            const q = quotes[symbol];
            const spark = sparklines[symbol];
            const isPositive = q ? q.changePercent >= 0 : true;
            const isPulsing = pulsing.has(symbol);

            return (
              <div
                key={symbol}
                className={`px-2 py-2 border-b border-[#2a2a3e] hover:bg-[#1a1a30] transition group ${
                  isPulsing
                    ? isPositive ? 'bg-[#4caf50]/10' : 'bg-[#f44336]/10'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#e0e0e0] font-mono">
                    {displaySymbol(symbol)}
                  </span>
                  <button
                    onClick={() => onRemoveFavorite(symbol)}
                    className="opacity-0 group-hover:opacity-100 text-[10px] text-[#555570] hover:text-[#f44336] transition"
                  >
                    ✕
                  </button>
                </div>

                {q ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-semibold font-mono transition-colors ${
                        isPulsing
                          ? isPositive ? 'text-[#4caf50]' : 'text-[#f44336]'
                          : 'text-[#e0e0e0]'
                      }`}>
                        ${formatPrice(q.price, locale)}
                      </span>
                      <span
                        className={`text-[11px] font-medium ${
                          isPositive ? 'text-[#4caf50]' : 'text-[#f44336]'
                        }`}
                      >
                        {isPositive ? '+' : ''}{q.changePercent.toFixed(2)}%
                      </span>
                    </div>

                    {/* Sparkline */}
                    {spark && spark.length > 1 && (
                      <div className="mt-1 flex justify-center">
                        <Sparkline
                          data={spark}
                          color={isPositive ? '#4caf50' : '#f44336'}
                          width={100}
                          height={18}
                        />
                      </div>
                    )}

                    {/* 24h H/L mini bar */}
                    {q.high24h && q.low24h && q.high24h > q.low24h && (
                      <div className="mt-1 flex items-center gap-1 text-[9px] text-[#555570] font-mono">
                        <span>{formatPrice(q.low24h, locale)}</span>
                        <div className="flex-1 h-0.5 bg-[#2a2a3e] rounded relative">
                          <div
                            className="absolute top-[-2px] w-1 h-[6px] bg-[#4fc3f7] rounded"
                            style={{
                              left: `${Math.min(100, Math.max(0, ((q.price - q.low24h) / (q.high24h - q.low24h)) * 100))}%`,
                            }}
                          />
                        </div>
                        <span>{formatPrice(q.high24h, locale)}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-[10px] text-[#555570]">
                    {locale === 'tr' ? 'Yukleniyor...' : 'Loading...'}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

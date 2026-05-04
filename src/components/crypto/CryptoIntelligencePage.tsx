'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import CryptoDashboard from './CryptoDashboard';
import OnChainTab from './OnChainTab';

const SYMBOLS = ['BTC', 'ETH', 'SOL', 'ARB', 'AVAX', 'ADA', 'DOT', 'LINK', 'UNI', 'NEAR'];

type TabKey = 'whitepaper' | 'onchain';

const TABS: { key: TabKey; label: string; icon: string; available: (symbol: string) => boolean }[] = [
  { key: 'whitepaper', label: 'Whitepaper', icon: '📄', available: () => true },
  { key: 'onchain',    label: 'On-Chain',   icon: '🔗', available: (s) => s === 'BTC' || s === 'ETH' },
];

interface CoinResult {
  id: string;
  symbol: string;
  name: string;
  market_cap_rank: number | null;
  thumb: string;
}

function CryptoIntelligencePageInner() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const initialTab: TabKey = searchParams?.get('tab') === 'onchain' ? 'onchain' : 'whitepaper';
  const initialSymbol = (searchParams?.get('symbol') || 'BTC').toUpperCase();

  const [symbol, setSymbol] = useState(initialSymbol);
  const [tab, setTab]       = useState<TabKey>(initialTab);
  const [query, setQuery]   = useState('');
  const [results, setResults] = useState<CoinResult[]>([]);
  const [open, setOpen]     = useState(false);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync URL when symbol/tab changes (deep-link friendly)
  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('symbol', symbol);
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, tab]);

  // If user picks a non-BTC/ETH coin while on On-Chain tab, fall back to Whitepaper
  useEffect(() => {
    if (tab === 'onchain' && symbol !== 'BTC' && symbol !== 'ETH') {
      setTab('whitepaper');
    }
  }, [symbol, tab]);

  // Debounced CoinGecko search
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) { setResults([]); setOpen(false); return; }

    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        setResults((data.coins ?? []).slice(0, 8));
        setOpen(true);
      } catch {
        // ağ hatası — dropdown gösterme
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [query]);

  // Dışarı tıklayınca kapat
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function select(coin: CoinResult) {
    setSymbol(coin.symbol.toUpperCase());
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#e0e0e0]">Kripto Analiz</h1>
        <p className="text-sm text-[#555570] mt-1">
          📄 Whitepaper analizi · 🔗 On-Chain akıllı para sinyalleri
        </p>
      </div>

      {/* Symbol selector */}
      <div className="flex flex-wrap gap-2">
        {SYMBOLS.map(s => (
          <button
            key={s}
            onClick={() => { setSymbol(s); setQuery(''); }}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              symbol === s
                ? 'bg-[#4fc3f7] text-[#0d0d1a]'
                : 'bg-[#0d0d1a] border border-[#2a2a3e] text-[#8888a0] hover:border-[#4fc3f7] hover:text-[#4fc3f7]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div ref={wrapperRef} className="relative">
        <div className="flex items-center gap-2 px-3 py-2.5 bg-[#0d0d1a] border border-[#2a2a3e] rounded-xl
          focus-within:border-[#4fc3f7]/60 transition-colors">
          <svg className="w-4 h-4 text-[#444] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Coin ara… (örn: Solana, MATIC, Injective)"
            className="flex-1 bg-transparent text-sm text-[#e0e0f0] placeholder-[#444] outline-none"
          />
          {searching && (
            <svg className="w-4 h-4 text-[#4fc3f7] animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {query && !searching && (
            <button onClick={() => { setQuery(''); setOpen(false); }}
              className="text-[#444] hover:text-[#e0e0f0] transition shrink-0">
              ✕
            </button>
          )}
        </div>

        {/* Dropdown */}
        {open && results.length > 0 && (
          <div className="absolute z-50 top-full mt-1 w-full bg-[#0d0d1a] border border-[#2a2a3e]
            rounded-xl overflow-hidden shadow-xl shadow-black/50">
            {results.map(coin => (
              <button
                key={coin.id}
                onClick={() => select(coin)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#4fc3f7]/8
                  transition text-left border-b border-[#1a1a2e] last:border-0"
              >
                {coin.thumb && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coin.thumb} alt="" className="w-6 h-6 rounded-full shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-[#e0e0f0]">{coin.name}</span>
                  <span className="text-xs text-[#555] ml-2 uppercase">{coin.symbol}</span>
                </div>
                {coin.market_cap_rank && (
                  <span className="text-[10px] text-[#4fc3f7] bg-[#4fc3f7]/10 px-1.5 py-0.5 rounded shrink-0">
                    #{coin.market_cap_rank}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-[#2a2a3e]">
        {TABS.map(t => {
          const isActive = tab === t.key;
          const isAvailable = t.available(symbol);
          const disabled = !isAvailable;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => isAvailable && setTab(t.key)}
              disabled={disabled}
              title={disabled ? 'Bu sekme yalnızca BTC ve ETH için mevcuttur' : undefined}
              className={`px-4 py-2.5 text-sm font-semibold transition-all relative ${
                isActive
                  ? 'text-[#4fc3f7]'
                  : disabled
                    ? 'text-[#333] cursor-not-allowed'
                    : 'text-[#888] hover:text-[#e0e0f0]'
              }`}
            >
              <span className="mr-1.5">{t.icon}</span>
              {t.label}
              {isActive && (
                <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-[#4fc3f7]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === 'whitepaper' ? (
        <CryptoDashboard symbol={symbol} />
      ) : (
        <OnChainTab symbol={symbol} />
      )}
    </div>
  );
}

export default function CryptoIntelligencePage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-10">
        <div className="w-8 h-8 border-4 border-[#4fc3f7] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CryptoIntelligencePageInner />
    </Suspense>
  );
}

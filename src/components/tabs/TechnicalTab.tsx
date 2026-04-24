'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import PriceChart from '@/components/charts/PriceChart';
import type { Resolution } from '@/lib/finnhub';

interface TechnicalTabProps {
  locale: 'en' | 'tr';
}

interface SearchResult {
  symbol: string;
  display: string;
  description: string;
  type: 'stock' | 'crypto' | 'bist' | 'forex';
}

interface ScalpSignal {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  horizon: 'scalp' | 'intraday' | 'swing';
  entry: { price: number; zone_low: number; zone_high: number } | null;
  stop_loss: number | null;
  targets: { price: number; rr: number; label: string }[];
  risk_reward: number | null;
  confluence_score: { trend: number; momentum: number; structure: number; volume: number; volatility: number; total: number };
  rationale: string;
  key_signals: string[];
  invalidation: string;
  warnings?: string[];
  data_sufficient: boolean;
}

interface ScalpResponse {
  success: boolean;
  symbol: string;
  timeframe: string;
  tier: 'free' | 'premium' | 'advance';
  rate_limit: { remaining: number | null; resetAt: number | null };
  signal: ScalpSignal;
  generated_at: number;
}

const INDICATORS = [
  'rsi', 'macd', 'bollinger', 'stochastic', 'atr', 'sma', 'ema', 'volume', 'fibonacci', 'sr'
];

const SUPPORTED_INDICATORS = new Set([
  'rsi', 'sma', 'ema', 'macd', 'bollinger', 'stochastic', 'atr', 'volume', 'fibonacci', 'sr'
]);

const TIMEFRAMES: { id: string; label: string; resolution: Resolution }[] = [
  { id: '5m', label: '5M', resolution: '5' },
  { id: '15m', label: '15M', resolution: '15' },
  { id: '1h', label: '1H', resolution: '60' },
  { id: '4h', label: '4H', resolution: '240' },
  { id: '1day', label: '1D', resolution: 'D' },
  { id: '1w', label: '1W', resolution: 'W' },
  { id: '1m', label: '1M', resolution: 'M' },
];

// Populer/kisayol semboller (kategori secilince gosterilecek)
const POPULAR_US: { display: string; symbol: string }[] = [
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AVGO', 'NFLX', 'AMD'
].map(s => ({ display: s, symbol: s }));

const POPULAR_BIST: { display: string; symbol: string }[] = [
  'ASELS', 'GARAN', 'THYAO', 'KCHOL', 'AKBNK', 'BIMAS', 'SASA', 'TOASO', 'EREGL', 'TUPRS'
].map(s => ({ display: s, symbol: `BIST:${s}` }));

const POPULAR_CRYPTO: { display: string; symbol: string }[] = [
  { display: 'BTC', symbol: 'BINANCE:BTCUSDT' },
  { display: 'ETH', symbol: 'BINANCE:ETHUSDT' },
  { display: 'SOL', symbol: 'BINANCE:SOLUSDT' },
  { display: 'BNB', symbol: 'BINANCE:BNBUSDT' },
  { display: 'XRP', symbol: 'BINANCE:XRPUSDT' },
  { display: 'ADA', symbol: 'BINANCE:ADAUSDT' },
  { display: 'DOGE', symbol: 'BINANCE:DOGEUSDT' },
  { display: 'AVAX', symbol: 'BINANCE:AVAXUSDT' },
  { display: 'DOT', symbol: 'BINANCE:DOTUSDT' },
  { display: 'LINK', symbol: 'BINANCE:LINKUSDT' },
];

type MarketCategory = 'us' | 'tr' | 'crypto';

const CATEGORY_TO_TYPE: Record<MarketCategory, string> = {
  us: 'stock',
  tr: 'bist',
  crypto: 'crypto',
};

export default function TechnicalTab({ locale }: TechnicalTabProps) {
  const t = useTranslations('technical');
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [selectedSymbolDisplay, setSelectedSymbolDisplay] = useState('AAPL');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1day');
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(['rsi', 'sma']);
  const [searchInput, setSearchInput] = useState('');
  const [marketCategory, setMarketCategory] = useState<MarketCategory>('us');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const [signal, setSignal] = useState<ScalpResponse | null>(null);
  const [signalLoading, setSignalLoading] = useState(false);
  const [signalError, setSignalError] = useState<string | null>(null);
  // TODO: auth geldiginde session'dan cek. Simdilik test icin sinirsiz.
  type UserTier = 'free' | 'premium' | 'advance';
  const userTier = 'advance' as UserTier;

  const generateSignal = async () => {
    setSignalLoading(true);
    setSignalError(null);
    try {
      const tf = TIMEFRAMES.find(x => x.id === selectedTimeframe) || TIMEFRAMES[4];
      const candlesRes = await fetch(
        `/api/candles?symbol=${encodeURIComponent(selectedSymbol)}&resolution=${tf.resolution}`
      );
      const candlesData = await candlesRes.json();
      const candles = candlesData.candles || [];
      if (candles.length < 40) {
        setSignalError(locale === 'tr'
          ? 'Yeterli mum verisi yok (en az 40 bar gerekli).'
          : 'Insufficient candle data (40 bars minimum).');
        setSignalLoading(false);
        return;
      }
      const res = await fetch('/api/scalp-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedSymbol,
          timeframe: tf.label,
          candles,
          tier: userTier,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const parts = [data.error || data.message || 'Signal error'];
        if (data.gemini_status) parts.push(`Gemini HTTP ${data.gemini_status}`);
        if (data.gemini_detail) parts.push(data.gemini_detail);
        if (data.finish_reason) parts.push(`finish: ${data.finish_reason}`);
        if (data.raw_preview) parts.push(`raw: ${data.raw_preview}`);
        setSignalError(parts.join(' · '));
        setSignalLoading(false);
        return;
      }
      setSignal(data as ScalpResponse);
    } catch (e) {
      setSignalError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSignalLoading(false);
    }
  };

  useEffect(() => {
    setSignal(null);
    setSignalError(null);
  }, [selectedSymbol, selectedTimeframe]);

  // Populer semboller (kategoriye gore)
  const getPopular = (): { display: string; symbol: string }[] => {
    if (marketCategory === 'us') return POPULAR_US;
    if (marketCategory === 'tr') return POPULAR_BIST;
    return POPULAR_CRYPTO;
  };

  const toggleIndicator = (indicator: string) => {
    setSelectedIndicators(prev =>
      prev.includes(indicator)
        ? prev.filter(i => i !== indicator)
        : [...prev, indicator]
    );
  };

  const handleCategoryChange = (cat: MarketCategory) => {
    setMarketCategory(cat);
    setSearchInput('');
    setSearchResults([]);
    setShowDropdown(false);
    if (cat === 'us') { setSelectedSymbol('AAPL'); setSelectedSymbolDisplay('AAPL'); }
    else if (cat === 'tr') { setSelectedSymbol('BIST:ASELS'); setSelectedSymbolDisplay('ASELS'); }
    else { setSelectedSymbol('BINANCE:BTCUSDT'); setSelectedSymbolDisplay('BTC'); }
  };

  const selectSymbol = (symbol: string, display: string) => {
    setSelectedSymbol(symbol);
    setSelectedSymbolDisplay(display);
    setSearchInput('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  // Debounced search
  useEffect(() => {
    if (!searchInput || searchInput.length < 1) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const type = CATEGORY_TO_TYPE[marketCategory];
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchInput)}&type=${type}`);
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch (e) {
        console.error('Search error:', e);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, marketCategory]);

  // Dropdown disina tiklayinca kapat
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentTimeframe = TIMEFRAMES.find(tf => tf.id === selectedTimeframe) || TIMEFRAMES[4];
  const activeSupportedIndicators = selectedIndicators.filter(i => SUPPORTED_INDICATORS.has(i));
  const popular = getPopular();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">{t('title')}</h1>
        <p className="text-slate-400">{locale === 'tr'
          ? 'Grafikleri analiz edin ve indikatörleri özelleştirin'
          : 'Analyze charts and customize indicators'
        }</p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Symbol Selection */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-300">
            {locale === 'tr' ? 'Sembol Seç' : 'Select Symbol'}
            <span className="ml-2 text-xs text-slate-500">
              ({locale === 'tr' ? 'secili' : 'selected'}: <span className="text-cyan-400 font-semibold">{selectedSymbolDisplay}</span>)
            </span>
          </label>

          {/* Market Category Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => handleCategoryChange('us')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                marketCategory === 'us'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              🇺🇸 {locale === 'tr' ? 'ABD' : 'US'}
            </button>
            <button
              onClick={() => handleCategoryChange('tr')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                marketCategory === 'tr'
                  ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              🇹🇷 BIST
            </button>
            <button
              onClick={() => handleCategoryChange('crypto')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                marketCategory === 'crypto'
                  ? 'bg-gradient-to-r from-yellow-600 to-orange-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              ₿ {locale === 'tr' ? 'Kripto' : 'Crypto'}
            </button>
          </div>

          {/* Search Box with Dropdown */}
          <div className="relative" ref={searchBoxRef}>
            <input
              type="text"
              placeholder={
                marketCategory === 'us'
                  ? (locale === 'tr' ? 'Ara: AAPL, Tesla, Microsoft...' : 'Search: AAPL, Tesla, Microsoft...')
                  : marketCategory === 'tr'
                  ? (locale === 'tr' ? 'Ara: ASELS, Garanti, Turkcell...' : 'Search: ASELS, Garanti, Turkcell...')
                  : (locale === 'tr' ? 'Ara: BTC, SHIB, PEPE...' : 'Search: BTC, SHIB, PEPE...')
              }
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none transition-smooth"
            />

            {/* Search Dropdown */}
            {showDropdown && searchInput.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                {isSearching ? (
                  <div className="p-3 text-sm text-slate-400 text-center">
                    {locale === 'tr' ? 'Araniyor...' : 'Searching...'}
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-3 text-sm text-slate-400 text-center">
                    {locale === 'tr' ? 'Sonuc bulunamadi' : 'No results found'}
                  </div>
                ) : (
                  <div className="py-1">
                    {searchResults.map((r, i) => (
                      <button
                        key={`${r.symbol}-${i}`}
                        onClick={() => selectSymbol(r.symbol, r.display)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-b-0"
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="font-semibold text-cyan-400">{r.display}</span>
                          <span className="text-xs text-slate-400 truncate">{r.description}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Popular Quick Buttons */}
          <div>
            <div className="text-xs text-slate-500 mb-2">
              {locale === 'tr' ? 'Populer:' : 'Popular:'}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {popular.map(sym => (
                <button
                  key={sym.symbol}
                  onClick={() => selectSymbol(sym.symbol, sym.display)}
                  className={`px-2 py-2 rounded-lg text-sm font-medium transition-smooth ${
                    selectedSymbol === sym.symbol
                      ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {sym.display}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Timeframe Selection */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-300">{locale === 'tr' ? 'Zaman Aralığı' : 'Timeframe'}</label>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.id}
                onClick={() => setSelectedTimeframe(tf.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-smooth ${
                  selectedTimeframe === tf.id
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Info box for timeframe */}
          <div className="text-xs text-slate-500 p-2 bg-slate-800/50 rounded border border-slate-700">
            {locale === 'tr'
              ? '💡 4H sadece kripto icin tam destekli, hisseler icin 1H verisi gosterilir'
              : '💡 4H is fully supported for crypto, 1H data is shown for stocks'
            }
          </div>
        </div>
      </div>

      {/* Real Chart */}
      <PriceChart
        embedded
        symbol={selectedSymbol}
        resolution={currentTimeframe.resolution}
        indicators={activeSupportedIndicators}
        locale={locale}
        height={450}
      />

      {/* Trade Signal (AI) */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-purple-500/30 rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              ⚡ {locale === 'tr' ? 'AI Al/Sat Sinyali' : 'AI Trade Signal'}
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              {locale === 'tr'
                ? `Scalp Desk AI ${selectedSymbolDisplay} (${currentTimeframe.label}) için indikatör sinyallerini analiz eder.`
                : `Scalp Desk AI analyzes indicator signals for ${selectedSymbolDisplay} (${currentTimeframe.label}).`}
            </p>
          </div>
          <button
            onClick={generateSignal}
            disabled={signalLoading}
            className="px-5 py-2.5 rounded-lg font-semibold bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {signalLoading
              ? (locale === 'tr' ? 'Analiz ediliyor...' : 'Analyzing...')
              : (locale === 'tr' ? 'Sinyal Üret' : 'Generate Signal')}
          </button>
        </div>

        {/* Tier/rate-limit info */}
        <div className="text-xs text-slate-500">
          {userTier === 'free' && (locale === 'tr' ? 'Ücretsiz plan: 1 sinyal / 24 saat' : 'Free plan: 1 signal / 24h')}
          {userTier === 'premium' && (locale === 'tr' ? 'Premium plan: 5 sinyal / 24 saat' : 'Premium plan: 5 signals / 24h')}
          {userTier === 'advance' && (locale === 'tr' ? 'Advance plan: sınırsız' : 'Advance plan: unlimited')}
          {signal?.rate_limit?.remaining != null && (
            <span className="ml-2 text-cyan-400">
              · {locale === 'tr' ? 'Kalan' : 'Remaining'}: {signal.rate_limit.remaining}
            </span>
          )}
        </div>

        {signalError && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300">
            ⚠️ {signalError}
          </div>
        )}

        {!signal && !signalError && !signalLoading && (
          <div className="p-4 rounded-lg bg-slate-700/30 border border-slate-700 text-sm text-slate-400">
            {locale === 'tr'
              ? 'Sinyal üretmek için yukarıdaki butona tıklayın. 7 indikatör + destek/direnç analiz edilip net al/sat/bekle önerisi verilir.'
              : 'Click the button above to generate a signal. 7 indicators + S/R are analyzed to produce a decisive buy/sell/hold call.'}
          </div>
        )}

        {signal && (() => {
          const s = signal.signal;
          const actionColor =
            s.action === 'BUY' ? 'from-green-600 to-emerald-500'
            : s.action === 'SELL' ? 'from-red-600 to-rose-500'
            : 'from-slate-600 to-slate-500';
          const actionBg =
            s.action === 'BUY' ? 'bg-green-500/10 border-green-500/40'
            : s.action === 'SELL' ? 'bg-red-500/10 border-red-500/40'
            : 'bg-slate-500/10 border-slate-500/40';
          const rationale = s.rationale;
          const fmt = (n: number | null | undefined) =>
            n == null ? '—' : Number.isFinite(n) ? n.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US', { maximumFractionDigits: n < 10 ? 4 : 2 }) : '—';

          return (
            <div className="space-y-4">
              {/* Action banner */}
              <div className={`p-4 rounded-lg border ${actionBg} flex items-center justify-between gap-4 flex-wrap`}>
                <div className="flex items-center gap-4">
                  <div className={`px-4 py-2 rounded-lg bg-gradient-to-r ${actionColor} text-white font-bold text-2xl`}>
                    {s.action}
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">
                      {locale === 'tr' ? 'Güven' : 'Confidence'}
                    </div>
                    <div className="text-lg font-bold text-white">{s.confidence}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">
                      {locale === 'tr' ? 'Vade' : 'Horizon'}
                    </div>
                    <div className="text-sm font-semibold text-cyan-400 capitalize">{s.horizon}</div>
                  </div>
                  {s.risk_reward != null && (
                    <div>
                      <div className="text-xs text-slate-400">R:R</div>
                      <div className="text-sm font-semibold text-purple-400">1:{s.risk_reward.toFixed(2)}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Entry/Stop/Targets grid */}
              {(s.entry || s.stop_loss != null || s.targets.length > 0) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {s.entry && (
                    <div className="p-3 rounded-lg bg-slate-700/40 border border-slate-600">
                      <div className="text-xs text-slate-400 mb-1">
                        {locale === 'tr' ? 'Giriş' : 'Entry'}
                      </div>
                      <div className="text-lg font-bold text-white">{fmt(s.entry.price)}</div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {fmt(s.entry.zone_low)} – {fmt(s.entry.zone_high)}
                      </div>
                    </div>
                  )}
                  {s.stop_loss != null && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                      <div className="text-xs text-red-300 mb-1">
                        {locale === 'tr' ? 'Stop' : 'Stop Loss'}
                      </div>
                      <div className="text-lg font-bold text-red-200">{fmt(s.stop_loss)}</div>
                    </div>
                  )}
                  {s.targets.slice(0, 2).map((t, i) => (
                    <div key={i} className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                      <div className="text-xs text-green-300 mb-1">
                        {t.label} · R:R 1:{t.rr.toFixed(1)}
                      </div>
                      <div className="text-lg font-bold text-green-200">{fmt(t.price)}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Rationale */}
              <div className="p-4 rounded-lg bg-slate-700/30 border border-slate-700">
                <div className="text-xs text-slate-400 mb-2 uppercase tracking-wider">
                  {locale === 'tr' ? 'Analiz' : 'Rationale'}
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">{rationale}</p>
              </div>

              {/* Key signals */}
              {s.key_signals.length > 0 && (
                <div className="p-4 rounded-lg bg-slate-700/30 border border-slate-700">
                  <div className="text-xs text-slate-400 mb-2 uppercase tracking-wider">
                    {locale === 'tr' ? 'Ana Sinyaller' : 'Key Signals'}
                  </div>
                  <ul className="space-y-1">
                    {s.key_signals.map((k, i) => (
                      <li key={i} className="text-sm text-slate-300 flex gap-2">
                        <span className="text-cyan-400">•</span><span>{k}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Confluence bars */}
              <div className="p-4 rounded-lg bg-slate-700/30 border border-slate-700">
                <div className="text-xs text-slate-400 mb-3 uppercase tracking-wider">
                  {locale === 'tr' ? 'Konfluans Skoru' : 'Confluence Score'}
                  <span className="ml-2 text-purple-400 font-bold">
                    ({s.confluence_score.total >= 0 ? '+' : ''}{s.confluence_score.total})
                  </span>
                </div>
                <div className="space-y-2">
                  {(['trend', 'momentum', 'structure', 'volume', 'volatility'] as const).map(key => {
                    const v = s.confluence_score[key];
                    const pct = Math.min(100, (Math.abs(v) / 2) * 100);
                    const color = v > 0 ? 'bg-green-500' : v < 0 ? 'bg-red-500' : 'bg-slate-500';
                    const label =
                      locale === 'tr'
                        ? { trend: 'Trend', momentum: 'Momentum', structure: 'Yapı', volume: 'Hacim', volatility: 'Volatilite' }[key]
                        : { trend: 'Trend', momentum: 'Momentum', structure: 'Structure', volume: 'Volume', volatility: 'Volatility' }[key];
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <div className="text-xs text-slate-400 w-24">{label}</div>
                        <div className="flex-1 h-2 bg-slate-800 rounded overflow-hidden relative">
                          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-600" />
                          <div
                            className={`absolute top-0 bottom-0 ${color}`}
                            style={{
                              width: `${pct / 2}%`,
                              left: v >= 0 ? '50%' : `${50 - pct / 2}%`,
                            }}
                          />
                        </div>
                        <div className={`text-xs font-mono w-10 text-right ${v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                          {v > 0 ? '+' : ''}{v}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Invalidation */}
              {s.invalidation && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-200">
                  <span className="font-semibold">
                    {locale === 'tr' ? '🚫 Geçersizlik koşulu: ' : '🚫 Invalidation: '}
                  </span>
                  {s.invalidation}
                </div>
              )}

              {/* Warnings */}
              {s.warnings && s.warnings.length > 0 && (
                <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 text-sm text-orange-200 space-y-1">
                  {s.warnings.map((w, i) => (
                    <div key={i}>⚠️ {w}</div>
                  ))}
                </div>
              )}

              <div className="text-[10px] text-slate-600 text-right">
                {locale === 'tr' ? 'Yatırım tavsiyesi değildir.' : 'Not investment advice.'}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Indicator Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white">{t('selectIndicators')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {INDICATORS.map(indicator => {
            const isSupported = SUPPORTED_INDICATORS.has(indicator);
            const isSelected = selectedIndicators.includes(indicator);
            return (
              <button
                key={indicator}
                onClick={() => toggleIndicator(indicator)}
                className={`relative px-4 py-3 rounded-lg font-medium text-sm transition-smooth border ${
                  isSelected
                    ? isSupported
                      ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/30'
                      : 'bg-slate-600 border-slate-500 text-slate-300'
                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                }`}
              >
                {t(`indicators.${indicator}`)}
                {!isSupported && (
                  <span className="absolute -top-1 -right-1 text-[9px] bg-yellow-600 text-white px-1 rounded">
                    {locale === 'tr' ? 'Yakında' : 'Soon'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Indicators Display */}
      {selectedIndicators.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 space-y-4">
          <h3 className="font-bold text-white">{t('aiAnalysis')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedIndicators.map(indicator => {
              const isSupported = SUPPORTED_INDICATORS.has(indicator);
              return (
                <div key={indicator} className="bg-slate-700/50 rounded p-4 border border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-cyan-400">{t(`indicators.${indicator}`)}</div>
                    {isSupported ? (
                      <span className="text-xs bg-green-600/20 text-green-400 px-2 py-0.5 rounded border border-green-600/40">
                        ● {locale === 'tr' ? 'Aktif' : 'Active'}
                      </span>
                    ) : (
                      <span className="text-xs bg-yellow-600/20 text-yellow-400 px-2 py-0.5 rounded border border-yellow-600/40">
                        {locale === 'tr' ? 'Yakında' : 'Coming Soon'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400">
                    {isSupported
                      ? (locale === 'tr'
                          ? `${t(`indicators.${indicator}`)} grafikte gosteriliyor`
                          : `${t(`indicators.${indicator}`)} is displayed on chart`)
                      : (locale === 'tr'
                          ? 'Bu indikator yakinda eklenecek'
                          : 'This indicator will be added soon')
                    }
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
        <p className="text-sm text-cyan-300">
          {locale === 'tr'
            ? '📊 Canli grafik Yahoo Finance (hisse/forex) ve Binance (kripto) verileriyle calisiyor. 600+ kripto ve binlerce hisse destekleniyor.'
            : '📊 Live chart powered by Yahoo Finance (stocks/forex) and Binance (crypto). 600+ cryptos and thousands of stocks supported.'}
        </p>
      </div>
    </div>
  );
}

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

const INDICATORS = [
  'rsi', 'macd', 'bollinger', 'stochastic', 'atr', 'sma', 'ema', 'volume', 'fibonacci'
];

const SUPPORTED_INDICATORS = new Set(['rsi', 'sma', 'ema']);

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

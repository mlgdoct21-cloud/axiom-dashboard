'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import NewsList from '@/components/news/NewsList';
import NewsDetail from '@/components/news/NewsDetail';
import FavoritesBar from '@/components/news/FavoritesBar';
import { DashboardSummary } from '@/components/dashboard/DashboardSummary';
import MarketTicker from '@/components/ticker/MarketTicker';
import { useNewsStream, type StreamedNews } from '@/hooks/useNewsStream';
import {
  getVotes,
  getFavorites,
  saveFavorites,
  addVote,
  getLastCategory,
  saveLastCategory,
  NewsVote,
  type NewsCategoryFilter,
} from '@/lib/news-storage';

// Bu tip /api/news'ten gelen NewsItem ile senkron olmali
export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: 'crypto' | 'stocks' | 'forex' | 'economy' | 'general';
  url: string;
  publishedAt: number;    // Unix ms
  imageUrl?: string;
  symbols?: string[];
  telegram_hook?: string;
  dashboard_summary?: string;
  axiom_analysis?: string;
  // Backend'den gelen analiz durumu. false → UI "özet hazırlanıyor" loading
  // state'i gösterir; SSE ile gelen event ile true'ya geçer ve içerik dolar.
  analyzed?: boolean;
  is_urgent?: boolean;
}

interface NewsTabProps {
  locale: 'en' | 'tr';
}

// SSE bağlantısı canlı tutulamazsa (WAF/timeout) fallback polling.
// Day 28 #10: 2dk → 30sn. Yayın akışı sırasında SSE down olursa kullanıcı
// 2 dk haber bekleyemez. 30sn fallback breaking news'i max ~45s gecikmeyle
// gösterir (15s crawler + 30s analyze + 30s fallback poll).
const REFRESH_INTERVAL = 30 * 1000;

// Ilk acilista kullanicinin takip listesi boşsa doldurulacak varsayılanlar:
//   5 popüler kripto + Magnificent 7 ABD hisseleri.
const DEFAULT_FAVORITES = [
  'BINANCE:BTCUSDT',
  'BINANCE:ETHUSDT',
  'BINANCE:SOLUSDT',
  'BINANCE:XRPUSDT',
  'BINANCE:AVAXUSDT',
  'AAPL',
  'MSFT',
  'GOOGL',
  'AMZN',
  'NVDA',
  'TSLA',
  'META',
];

// Seed sürüm etiketi — DEFAULT_FAVORITES listesi her güncellendiğinde burayı
// değiştir. Mevcut kullanıcıların localStorage'ı eski seed ile dolu olsa bile
// yeni sürüm ile bir kez zorla seed yapılır (kullanıcı sembol sildiyse de).
const FAVORITES_SEED_VERSION = '2026-04-23-mag7-crypto-v1';
const SEED_VERSION_KEY = 'axiom_favorites_seed_version';

// SSE'den gelen haber için kategoriyi sembol prefix'i + baslik kelimelerinden
// türet — /api/news route'u ile ayni sinirlandirma. Backend bazen
// prefix'siz kripto sembolu (BTCUSD, APRILUSD) veya sembolsuz (Turkce Bitcoin
// basligi) gonderiyor — bu yuzden baslik fallback'i kritik.
const _CRYPTO_TICKERS = new Set([
  'BTC', 'ETH', 'SOL', 'XRP', 'AVAX', 'BNB', 'ADA', 'DOGE', 'DOT', 'LINK',
  'MATIC', 'SHIB', 'PEPE', 'LTC', 'ATOM', 'NEAR', 'APT', 'ARB', 'OP', 'INJ',
  'SUI', 'TRX', 'UNI', 'FIL', 'ICP', 'ETC', 'XLM', 'HBAR', 'VET', 'FTM',
  'ALGO', 'GRT', 'AAVE', 'MKR', 'SAND', 'MANA', 'APE', 'CRV', 'RUNE', 'KAS',
  'TON', 'PI', 'WLD', 'RENDER', 'RNDR', 'TAO',
]);
const _CRYPTO_REGEX = /\b(bitcoin|ethereum|btc|eth|xrp|sol|ada|doge|dot|link|avax|bnb|polkadot|avalanche|solana|cardano|dogecoin|chainlink|ripple|tron|binance|coinbase|kraken|kripto|crypto|cryptocurrency|altcoin|stablecoin|memecoin|blockchain|web3|defi|nft|polymarket|pepe|shiba|shib)\b/i;
const _STOCK_REGEX = /\b(hisse|hisseler|nasdaq|nyse|dow\s+jones|s&p\s*500|bist|earnings|bilanco|bilanço|temettu|temettü|dividend|stocks?|shares?|ipo|equities|wall\s+street)\b/i;
function classifyNewsCategory(
  symbol?: string | null,
  title?: string | null,
): 'crypto' | 'stocks' | 'forex' | 'economy' | 'general' {
  if (symbol) {
    const s = symbol.toUpperCase();
    if (s.startsWith('BINANCE:') || s.startsWith('COINBASE:') || s.startsWith('KRAKEN:')) return 'crypto';
    if (s.startsWith('OANDA:') || s.startsWith('FX:')) return 'forex';
    if (s.startsWith('BIST:')) return 'stocks';
    if (/^[A-Z0-9]{2,10}USD[TC]?$/.test(s)) return 'crypto';
    if (_CRYPTO_TICKERS.has(s)) return 'crypto';
    if (/^[A-Z]{1,5}(\.[A-Z]{1,3})?$/.test(s)) return 'stocks';
  }
  if (title) {
    if (_CRYPTO_REGEX.test(title)) return 'crypto';
    if (_STOCK_REGEX.test(title)) return 'stocks';
  }
  return 'general';
}

function mapStreamedToNewsItem(n: StreamedNews): NewsItem {
  return {
    id: String(n.id),
    title: n.title,
    summary: n.dashboard_summary || '',
    source: n.source || 'Axiom',
    category: classifyNewsCategory(n.symbol, n.title),
    url: n.link,
    publishedAt: n.created_at ? new Date(n.created_at).getTime() : Date.now(),
    symbols: n.symbol ? [n.symbol] : undefined,
    telegram_hook: n.telegram_hook || '',
    dashboard_summary: n.dashboard_summary || '',
    axiom_analysis: n.axiom_analysis || '',
    // SSE sadece batch_analyze_loop bittikten sonra publish ediliyor,
    // dolayısıyla SSE'den gelen her item analyzed=true.
    analyzed: true,
    is_urgent: Boolean(n.is_urgent),
  };
}

export default function NewsTab({ locale }: NewsTabProps) {
  const t = useTranslations('news');

  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
  const [newsModalOpen, setNewsModalOpen] = useState(false);
  const [votes, setVotes] = useState<Record<string, NewsVote>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [category, setCategory] = useState<NewsCategoryFilter>('all');
  const [lastRefresh, setLastRefresh] = useState<number>(0);
  const [sourceStats, setSourceStats] = useState<Record<string, number>>({});

  // Ilk yuklemede votes/favorites/category'i localStorage'dan oku.
  // Seed sürümü eski ise (ilk kullanıcı dahil) DEFAULT_FAVORITES ile zorla
  // doldur — kullanıcı eskiden eklediği 2-3 sembolle kalmasın, temiz bir
  // watchlist alsın.
  useEffect(() => {
    setVotes(getVotes());
    const seededVersion = typeof window !== 'undefined'
      ? localStorage.getItem(SEED_VERSION_KEY)
      : null;
    const storedFavs = getFavorites();
    if (seededVersion !== FAVORITES_SEED_VERSION || storedFavs.length === 0) {
      setFavorites(DEFAULT_FAVORITES);
      saveFavorites(DEFAULT_FAVORITES);
      if (typeof window !== 'undefined') {
        localStorage.setItem(SEED_VERSION_KEY, FAVORITES_SEED_VERSION);
      }
    } else {
      setFavorites(storedFavs);
    }
    setCategory(getLastCategory());
  }, []);

  // Kategori degistiginde localStorage'a yaz
  useEffect(() => {
    saveLastCategory(category);
  }, [category]);

  // Haberleri /api/news'ten cek
  const loadNews = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      params.set('limit', '100');

      const res = await fetch(`/api/news?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setNews(data.news || []);
      setSourceStats(data.sources || {});
      setLastRefresh(data.fetchedAt || Date.now());
    } catch (e) {
      console.error('News load error:', e);
      setError(locale === 'tr' ? 'Haberler yuklenemedi' : 'Failed to load news');
      if (!silent) setNews([]);
    } finally {
      setLoading(false);
    }
  }, [category, locale]);

  // Kategori degisince yeniden cek
  useEffect(() => {
    loadNews();
  }, [loadNews]);

  // Auto-refresh (2dk) — SSE fallback'i için güvenlik ağı.
  useEffect(() => {
    const interval = setInterval(() => loadNews(true), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadNews]);

  // ESC ile haber pop-up modal'ı kapat
  useEffect(() => {
    if (!newsModalOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNewsModalOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [newsModalOpen]);

  // 🔴 CANLI AKIŞ: Backend SSE → yeni analiz edilmiş haberi listeye ekle
  // VEYA mevcut (analyzed=false) item'ı in-place güncelle (özet doldur).
  //
  // İki akış var:
  //   a) Haber hiç listede yok → en başa ekle.
  //   b) Haber zaten listede (fast_fetch eklemiş, analyzed=false) → summary /
  //      axiom_analysis / analyzed=true ile güncelle. Kullanıcı "hazırlanıyor"
  //      loading'inden içerikli görünüme GEÇİŞ yapar — yenileme gerekmez.
  useNewsStream(
    useCallback((streamed: StreamedNews) => {
      const mapped = mapStreamedToNewsItem(streamed);
      setNews((prev) => {
        const existingIdx = prev.findIndex((n) => n.id === mapped.id);
        if (existingIdx === -1) {
          // Yeni haber — en başa.
          return [mapped, ...prev].slice(0, 200);
        }
        // Mevcut item'ı güncelle (analyzed false → true + özet dolar)
        const next = [...prev];
        next[existingIdx] = {
          ...prev[existingIdx],
          ...mapped,
          // Önceden user-side state'i (örn. publishedAt) koru
          publishedAt: prev[existingIdx].publishedAt || mapped.publishedAt,
        };
        return next;
      });
      setLastRefresh(Date.now());
    }, []),
    true
  );

  // UI listesi için kategoriye göre filtre. Backend proxy zaten category
  // query parametresi ile filtreli veri döndürüyor, ama SSE'den akan canlı
  // haberler state'e eklendiği için render anında tekrar filtrelemek gerek;
  // aksi halde "Kripto" sekmesindeyken forex haberi listeye sızabilir.
  const displayedNews =
    category === 'all'
      ? news
      : news.filter(n => (n.category || 'general') === category);

  // Secili haber + voting
  const selectedNews = selectedNewsId ? news.find(n => n.id === selectedNewsId) ?? null : null;
  const selectedVotes = selectedNewsId ? votes[selectedNewsId] ?? null : null;

  const handleVote = (voteType: 'bullish' | 'bearish' | 'panic') => {
    if (!selectedNewsId) return;
    setVotes(addVote(selectedNewsId, voteType));
  };

  const handleAddFavorite = (symbol: string) => {
    if (favorites.includes(symbol)) return;
    const updated = [...favorites, symbol];
    setFavorites(updated);
    saveFavorites(updated);
  };

  const handleRemoveFavorite = (symbol: string) => {
    const updated = favorites.filter(s => s !== symbol);
    setFavorites(updated);
    saveFavorites(updated);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#141425]">
      {/* Market Ticker — Top 20 Cryptos + Indices + Mag7 */}
      <MarketTicker locale={locale} />

      {/* Dashboard Summary — 3-row modular layout (digest + 6 FMP panels) */}
      <div className="px-4 pt-1.5 pb-1.5 border-b border-[#2a2a3e]">
        <DashboardSummary />
      </div>

      {/* Main Grid: News List + Detail + Watchlist */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-0 flex-1 overflow-hidden">
        {/* Sol: haber listesi + kategori tablari */}
        <div className="col-span-1 md:col-span-3 border-r border-[#2a2a3e] flex flex-col overflow-hidden">
        <NewsList
          items={displayedNews}
          loading={loading}
          error={error}
          selectedId={selectedNewsId}
          onSelectNews={(id) => {
            setSelectedNewsId(id);
            setNewsModalOpen(true);
          }}
          category={category}
          onCategoryChange={setCategory}
          locale={locale}
          onRefresh={() => loadNews()}
          lastRefresh={lastRefresh}
          sourceStats={sourceStats}
          votes={votes}
        />
      </div>

        {/* Orta: 3 önemli haber (NewsDetail item=null → AxiomDigestEmptyState) */}
        <div className="col-span-1 md:col-span-7 border-r border-[#2a2a3e] flex flex-col overflow-hidden">
          <NewsDetail
            item={null}
            votes={null}
            locale={locale}
            onVote={handleVote}
            onAddFavorite={handleAddFavorite}
            favorites={favorites}
            allNews={news}
            onSelectNews={(id) => {
              setSelectedNewsId(id);
              setNewsModalOpen(true);
            }}
          />
        </div>

        {/* Sag: Favoriler / Watchlist */}
        <div className="col-span-1 md:col-span-2 flex flex-col overflow-hidden">
          <FavoritesBar
            favorites={favorites}
            onAddFavorite={handleAddFavorite}
            onRemoveFavorite={handleRemoveFavorite}
            locale={locale}
            category={category}
          />
        </div>
      </div>

      {/* Haber pop-up — listeden tıklayınca tam ekran modal'da özet + yorum */}
      {newsModalOpen && selectedNews && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setNewsModalOpen(false)}
        >
          <div
            className="bg-[#141425] border border-[#2a2a3e] rounded-lg shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-end px-3 py-2 border-b border-[#2a2a3e]">
              <button
                onClick={() => setNewsModalOpen(false)}
                className="text-[#8888a0] hover:text-[#e0e0e0] transition text-xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-[#1f1f3a]"
                title="Kapat (Esc)"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NewsDetail
                item={selectedNews}
                votes={selectedVotes}
                locale={locale}
                onVote={handleVote}
                onAddFavorite={handleAddFavorite}
                favorites={favorites}
                allNews={news}
                onSelectNews={(id) => setSelectedNewsId(id)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

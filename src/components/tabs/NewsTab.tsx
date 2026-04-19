'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import NewsList from '@/components/news/NewsList';
import NewsDetail from '@/components/news/NewsDetail';
import FavoritesBar from '@/components/news/FavoritesBar';
import MarketTicker from '@/components/ticker/MarketTicker';
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
}

interface NewsTabProps {
  locale: 'en' | 'tr';
}

// 2 dakikada bir haberleri yenile (canli his icin)
const REFRESH_INTERVAL = 2 * 60 * 1000;

export default function NewsTab({ locale }: NewsTabProps) {
  const t = useTranslations('news');

  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
  const [votes, setVotes] = useState<Record<string, NewsVote>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [category, setCategory] = useState<NewsCategoryFilter>('all');
  const [lastRefresh, setLastRefresh] = useState<number>(0);
  const [sourceStats, setSourceStats] = useState<Record<string, number>>({});

  // Ilk yuklemede votes/favorites/category'i localStorage'dan oku
  useEffect(() => {
    setVotes(getVotes());
    setFavorites(getFavorites());
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

  // Auto-refresh (2dk)
  useEffect(() => {
    const interval = setInterval(() => loadNews(true), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadNews]);

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

      {/* Main Grid: News List + Detail + Watchlist */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-0 flex-1 overflow-hidden">
        {/* Sol: haber listesi + kategori tablari */}
        <div className="col-span-1 md:col-span-3 border-r border-[#2a2a3e] flex flex-col overflow-hidden">
        <NewsList
          items={news}
          loading={loading}
          error={error}
          selectedId={selectedNewsId}
          onSelectNews={setSelectedNewsId}
          category={category}
          onCategoryChange={setCategory}
          locale={locale}
          onRefresh={() => loadNews()}
          lastRefresh={lastRefresh}
          sourceStats={sourceStats}
          votes={votes}
        />
      </div>

        {/* Orta: haber detay + voting + price snapshot */}
        <div className="col-span-1 md:col-span-7 border-r border-[#2a2a3e] flex flex-col overflow-hidden">
          <NewsDetail
            item={selectedNews}
            votes={selectedVotes}
            locale={locale}
            onVote={handleVote}
            onAddFavorite={handleAddFavorite}
            favorites={favorites}
          />
        </div>

        {/* Sag: Favoriler / Watchlist */}
        <div className="col-span-1 md:col-span-2 flex flex-col overflow-hidden">
          <FavoritesBar
            favorites={favorites}
            onAddFavorite={handleAddFavorite}
            onRemoveFavorite={handleRemoveFavorite}
            locale={locale}
          />
        </div>
      </div>
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import type { NewsItem } from '@/components/tabs/NewsTab';
import type { NewsCategoryFilter, NewsVote } from '@/lib/news-storage';

interface NewsListProps {
  items: NewsItem[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelectNews: (id: string) => void;
  category: NewsCategoryFilter;
  onCategoryChange: (cat: NewsCategoryFilter) => void;
  locale: 'en' | 'tr';
  onRefresh: () => void;
  lastRefresh: number;
  sourceStats: Record<string, number>;
  votes: Record<string, NewsVote>;
}

// Kategori sekmeleri — plan dan Quick Win #6
const CATEGORIES: { id: NewsCategoryFilter; labelTr: string; labelEn: string; icon: string }[] = [
  { id: 'all',     labelTr: 'Tumu',    labelEn: 'All',      icon: '📰' },
  { id: 'crypto',  labelTr: 'Kripto',  labelEn: 'Crypto',   icon: '₿'  },
  { id: 'stocks',  labelTr: 'Hisse',   labelEn: 'Stocks',   icon: '📈' },
  { id: 'forex',   labelTr: 'Forex',   labelEn: 'Forex',    icon: '💱' },
  { id: 'economy', labelTr: 'Ekonomi', labelEn: 'Economy',  icon: '🏦' },
  { id: 'general', labelTr: 'Genel',   labelEn: 'General',  icon: '🌐' },
];

// Zaman rengi — Quick Win #7
function getTimeHighlight(ageMs: number) {
  const hours = ageMs / 3600000;
  if (hours < 1)   return { color: '#ff4757', label: '🔴', badge: 'BREAKING' }; // <1h breaking
  if (hours < 6)   return { color: '#ff9800', label: '🟠', badge: null };        // <6h fresh
  if (hours < 24)  return { color: '#4fc3f7', label: '🔵', badge: null };        // <24h today
  return { color: '#6a6a80', label: '⚪', badge: null };                         // older
}

function timeAgo(ts: number, locale: 'en' | 'tr'): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return locale === 'tr' ? 'simdi' : 'now';
  if (mins < 60) return `${mins}${locale === 'tr' ? 'dk' : 'm'}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}${locale === 'tr' ? 'sa' : 'h'}`;
  const days = Math.floor(hrs / 24);
  return `${days}${locale === 'tr' ? 'g' : 'd'}`;
}

function totalVotes(v?: NewsVote): number {
  if (!v) return 0;
  return (v.bullish || 0) + (v.bearish || 0) + (v.panic || 0);
}

function topSentiment(v?: NewsVote): '👍' | '👎' | '🚨' | null {
  if (!v) return null;
  const max = Math.max(v.bullish, v.bearish, v.panic);
  if (max === 0) return null;
  if (v.bullish === max) return '👍';
  if (v.bearish === max) return '👎';
  return '🚨';
}

export default function NewsList({
  items,
  loading,
  error,
  selectedId,
  onSelectNews,
  category,
  onCategoryChange,
  locale,
  onRefresh,
  lastRefresh,
  sourceStats,
  votes,
}: NewsListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      n =>
        n.title.toLowerCase().includes(q) ||
        n.summary.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const refreshTimeAgo = () => {
    if (!lastRefresh) return '';
    const diff = Math.floor((Date.now() - lastRefresh) / 1000);
    if (diff < 60) return locale === 'tr' ? `${diff}s once` : `${diff}s ago`;
    return locale === 'tr' ? `${Math.floor(diff / 60)}dk once` : `${Math.floor(diff / 60)}m ago`;
  };

  const totalSources = Object.values(sourceStats).filter(c => c > 0).length;

  return (
    <div className="flex flex-col h-full bg-[#141425]">
      {/* Ust: Kategori tablari */}
      <div className="flex border-b border-[#2a2a3e] bg-[#0f0f20] overflow-x-auto">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={`flex-shrink-0 px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
              category === cat.id
                ? 'border-[#4fc3f7] text-[#4fc3f7] bg-[#141425]'
                : 'border-transparent text-[#6a6a80] hover:text-[#e0e0e0]'
            }`}
          >
            <span className="mr-1">{cat.icon}</span>
            {locale === 'tr' ? cat.labelTr : cat.labelEn}
          </button>
        ))}
      </div>

      {/* Ara + Yenile */}
      <div className="p-2 border-b border-[#2a2a3e] space-y-1.5">
        <input
          type="text"
          placeholder={locale === 'tr' ? 'Ara...' : 'Search...'}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full px-2 py-1 bg-[#1a1a2e] border border-[#2a2a3e] rounded text-xs text-[#e0e0e0] placeholder-[#555570] focus:border-[#4fc3f7] focus:outline-none"
        />
        <div className="flex items-center justify-between text-[10px] text-[#555570]">
          <span>
            {filtered.length} {locale === 'tr' ? 'haber' : 'news'}
            {totalSources > 0 && (
              <span className="ml-2 text-[#26a69a]">
                ● {totalSources} {locale === 'tr' ? 'kaynak' : 'sources'}
              </span>
            )}
          </span>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-[#4fc3f7] hover:text-[#ff9800] transition disabled:opacity-50"
            title={locale === 'tr' ? 'Yenile' : 'Refresh'}
          >
            {loading ? '⟳' : '↻'} {refreshTimeAgo()}
          </button>
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto">
        {error && !loading && (
          <div className="p-4 text-center text-[#f44336] text-xs">{error}</div>
        )}
        {loading && items.length === 0 && (
          <div className="p-4 text-center text-[#555570] text-xs">
            {locale === 'tr' ? 'Yukleniyor...' : 'Loading...'}
          </div>
        )}
        {!loading && filtered.length === 0 && !error && (
          <div className="p-4 text-center text-[#555570] text-xs">
            {locale === 'tr' ? 'Haber bulunamadi' : 'No news found'}
          </div>
        )}

        {filtered.map(item => {
          const age = Date.now() - item.publishedAt;
          const hl = getTimeHighlight(age);
          const voteCount = totalVotes(votes[item.id]);
          const sentiment = topSentiment(votes[item.id]);

          return (
            <button
              key={item.id}
              onClick={() => onSelectNews(item.id)}
              className={`w-full text-left px-3 py-2.5 border-b border-[#2a2a3e] transition-colors ${
                selectedId === item.id ? 'bg-[#1e1e38]' : 'hover:bg-[#1a1a30]'
              }`}
            >
              {/* Baslik satiri: zaman + breaking badge + baslik */}
              <div className="flex gap-2 items-start mb-1">
                <span
                  className="text-[10px] flex-shrink-0 mt-0.5 w-10 font-mono"
                  style={{ color: hl.color }}
                >
                  {hl.label} {timeAgo(item.publishedAt, locale)}
                </span>
                <div className="flex-1 min-w-0">
                  {hl.badge && (
                    <span className="inline-block mr-1.5 px-1.5 py-0.5 bg-[#ff4757] text-white text-[9px] font-bold rounded animate-pulse">
                      🔴 {hl.badge}
                    </span>
                  )}
                  <h3 className="text-xs font-medium text-[#e0e0e0] line-clamp-2 inline">
                    {item.title}
                  </h3>
                </div>
              </div>

              {/* Ozet */}
              {item.summary && (
                <p className="text-[11px] text-[#6a6a80] line-clamp-2 mb-1.5 ml-12">
                  {item.summary}
                </p>
              )}

              {/* Alt satir: kaynak + sembol chip'leri + vote */}
              <div className="flex gap-1.5 items-center ml-12 flex-wrap">
                <span className="text-[10px] text-[#4fc3f7] font-medium">{item.source}</span>

                {/* Symbol chips — Quick Win #5 */}
                {item.symbols && item.symbols.length > 0 && (
                  <>
                    {item.symbols.slice(0, 3).map(sym => (
                      <span
                        key={sym}
                        className="inline-block px-1.5 py-0.5 bg-[#2a2a3e] text-[#ff9800] text-[10px] rounded font-mono"
                      >
                        {sym.replace('BINANCE:', '').replace('OANDA:', '').replace('_', '/').replace('USDT', '')}
                      </span>
                    ))}
                  </>
                )}

                {/* Vote count — Quick Win #2 */}
                {voteCount > 0 && (
                  <span className="ml-auto text-[10px] text-[#8888a0]">
                    {sentiment} {voteCount}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

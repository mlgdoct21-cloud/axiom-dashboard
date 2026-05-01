'use client';

/**
 * News listesinde haber seçilmediğinde gösterilen empty state.
 * Eski statik demo bölümünün yerine: AI tarafından seçilen "Bugünün Öne
 * Çıkan 3 Haberi" — büyük featured card layout. Tıklanınca ilgili haber
 * sağdaki detay panelinde açılır.
 */

import React, { useMemo, useState } from 'react';
import type { NewsItem } from '@/components/tabs/NewsTab';
import NewsPreviewModal from './NewsPreviewModal';

interface Props {
  locale: 'en' | 'tr';
  news?: NewsItem[];
  /** "Tam panelde aç" butonu için: NewsTab'taki setSelectedNewsId */
  onSelectNews?: (id: string) => void;
}

function timeAgo(ts: number, locale: 'en' | 'tr'): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return locale === 'tr' ? 'şimdi' : 'now';
  if (mins < 60) return `${mins}${locale === 'tr' ? ' dk önce' : 'm ago'}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}${locale === 'tr' ? ' saat önce' : 'h ago'}`;
  return `${Math.floor(hrs / 24)}${locale === 'tr' ? ' g önce' : 'd ago'}`;
}

function categoryLabel(c: string, locale: 'en' | 'tr'): string {
  const map: Record<string, { tr: string; en: string }> = {
    crypto:   { tr: 'Kripto',  en: 'Crypto' },
    stocks:   { tr: 'Hisse',   en: 'Stocks' },
    forex:    { tr: 'Forex',   en: 'Forex' },
    economy:  { tr: 'Ekonomi', en: 'Economy' },
    general:  { tr: 'Genel',   en: 'General' },
  };
  const entry = map[c] || map.general;
  return locale === 'tr' ? entry.tr : entry.en;
}

function categoryColor(c: string): string {
  const map: Record<string, string> = {
    crypto:   'text-[#ff9800] border-[#ff9800]/40 bg-[#ff9800]/10',
    stocks:   'text-[#26a69a] border-[#26a69a]/40 bg-[#26a69a]/10',
    forex:    'text-[#4fc3f7] border-[#4fc3f7]/40 bg-[#4fc3f7]/10',
    economy:  'text-[#ba68c8] border-[#ba68c8]/40 bg-[#ba68c8]/10',
    general:  'text-[#8888a0] border-[#8888a0]/40 bg-[#8888a0]/10',
  };
  return map[c] || map.general;
}

function FeaturedCard({
  item,
  rank,
  locale,
  onClick,
}: {
  item: NewsItem;
  rank: number;
  locale: 'en' | 'tr';
  onClick: () => void;
}) {
  const summary = item.dashboard_summary || item.summary || '';
  const isBreaking = item.is_urgent || (Date.now() - item.publishedAt < 3600000);

  return (
    <button
      onClick={onClick}
      className="text-left bg-[#141425] border border-[#2a2a3e] hover:border-[#4fc3f7]/60 hover:bg-[#1a1a30] rounded-lg p-4 transition-all flex flex-col gap-2 group focus:outline-none focus:ring-2 focus:ring-[#4fc3f7]/50"
    >
      {/* Top row: rank badge + category + time + breaking */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold text-[#4fc3f7] bg-[#4fc3f7]/10 border border-[#4fc3f7]/40 rounded w-5 h-5 flex items-center justify-center">
          {rank}
        </span>
        <span
          className={`text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded border ${categoryColor(
            item.category || 'general',
          )}`}
        >
          {categoryLabel(item.category || 'general', locale)}
        </span>
        {isBreaking && (
          <span className="text-[9px] font-bold uppercase text-[#ef5350] bg-[#ef5350]/10 border border-[#ef5350]/40 px-1.5 py-0.5 rounded animate-pulse">
            🔴 {locale === 'tr' ? 'Acil' : 'Breaking'}
          </span>
        )}
        <span className="text-[10px] text-[#8888a0] ml-auto">
          {timeAgo(item.publishedAt, locale)}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-[#e0e0e0] leading-snug line-clamp-2 group-hover:text-white">
        {item.title}
      </h3>

      {/* Summary */}
      {summary && (
        <p className="text-[12px] text-[#a0a0b8] leading-relaxed line-clamp-3">{summary}</p>
      )}

      {/* Footer: source + symbols + CTA */}
      <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px]">
        <span className="text-[#4fc3f7] font-medium">{item.source}</span>
        {item.symbols && item.symbols.length > 0 && (
          <>
            <span className="text-[#555570]">·</span>
            <div className="flex gap-1 flex-wrap">
              {item.symbols.slice(0, 3).map((sym) => (
                <span
                  key={sym}
                  className="font-mono text-[10px] text-[#ff9800] bg-[#ff9800]/10 px-1.5 py-0.5 rounded"
                >
                  {sym.replace('BINANCE:', '').replace('OANDA:', '').replace('USDT', '')}
                </span>
              ))}
            </div>
          </>
        )}
        <span className="ml-auto text-[#8888a0] group-hover:text-[#4fc3f7] transition-colors">
          {locale === 'tr' ? 'Detayları gör →' : 'View details →'}
        </span>
      </div>
    </button>
  );
}

export default function AxiomDigestEmptyState({ locale, news, onSelectNews }: Props) {
  const [previewItem, setPreviewItem] = useState<NewsItem | null>(null);

  // Top 3 öne çıkan haberi seç:
  //   1) is_urgent=true olanlar önce
  //   2) Sonra son 12 saatlik haberler
  //   3) Sonra en yeniler (fallback)
  const top3 = useMemo<NewsItem[]>(() => {
    if (!news || news.length === 0) return [];
    const twelveHoursAgo = Date.now() - 12 * 3600 * 1000;
    const urgent = news
      .filter((n) => n.is_urgent && n.publishedAt > twelveHoursAgo)
      .sort((a, b) => b.publishedAt - a.publishedAt);
    const recent = news
      .filter(
        (n) =>
          !n.is_urgent &&
          n.publishedAt > twelveHoursAgo &&
          (n.dashboard_summary || n.summary),
      )
      .sort((a, b) => b.publishedAt - a.publishedAt);
    const fallback = [...news].sort((a, b) => b.publishedAt - a.publishedAt);
    const seen = new Set<string>();
    const out: NewsItem[] = [];
    for (const list of [urgent, recent, fallback]) {
      for (const n of list) {
        if (out.length >= 3) break;
        if (seen.has(n.id)) continue;
        seen.add(n.id);
        out.push(n);
      }
      if (out.length >= 3) break;
    }
    return out;
  }, [news]);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (locale === 'en') {
      if (hour < 11) return '🌙 While You Were Sleeping';
      if (hour > 18) return '🌇 Daily Wrap-Up';
      return '⚡ Today’s Top Stories';
    }
    if (hour < 11) return '🌙 Bugünün Öne Çıkan Haberleri';
    if (hour > 18) return '🌇 Günün Özeti';
    return '⚡ Bugünün En Önemlileri';
  })();

  const subtitle =
    locale === 'tr'
      ? 'Solda bir haber seç veya aşağıdaki AI seçimi 3 başlıktan birini aç.'
      : 'Pick a story on the left, or jump into one of the AI-curated headlines below.';

  return (
    <div className="flex flex-col h-full bg-[#0d0d1a] p-5 md:p-7 overflow-y-auto">
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-4">
        {/* Header */}
        <div className="text-center mb-2">
          <h1 className="text-xl md:text-2xl font-bold text-[#e0e0e0]">{greeting}</h1>
          <p className="text-[11px] md:text-[12px] text-[#8888a0] mt-1.5">{subtitle}</p>
        </div>

        {/* Top 3 featured cards */}
        {top3.length > 0 ? (
          <div className="flex flex-col gap-3">
            {top3.map((item, i) => (
              <FeaturedCard
                key={item.id}
                item={item}
                rank={i + 1}
                locale={locale}
                onClick={() => setPreviewItem(item)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-[#555570] text-sm italic">
            {locale === 'tr'
              ? 'Henüz haber akışı hazırlanıyor...'
              : 'News feed is loading...'}
          </div>
        )}
      </div>

      {/* Featured haber pop-up modal */}
      <NewsPreviewModal
        item={previewItem}
        locale={locale}
        onClose={() => setPreviewItem(null)}
        onOpenFull={onSelectNews}
      />
    </div>
  );
}

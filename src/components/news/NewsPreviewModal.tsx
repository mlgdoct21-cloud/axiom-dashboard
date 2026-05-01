'use client';

/**
 * Featured haber pop-up'ı — Top 3 öne çıkan habere tıklandığında
 * sağ paneli kullanmadan tüm içeriği bir modalda gösterir.
 * Kullanıcı kart tıklayınca sayfa kaydırmadan haberi okuyabilir.
 */

import React, { useEffect } from 'react';
import type { NewsItem } from '@/components/tabs/NewsTab';

interface Props {
  item: NewsItem | null;
  locale: 'en' | 'tr';
  onClose: () => void;
  /** "Tam panelde aç" — sağdaki NewsDetail'e taşı, modalı kapat */
  onOpenFull?: (id: string) => void;
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
    crypto:  { tr: 'Kripto',  en: 'Crypto' },
    stocks:  { tr: 'Hisse',   en: 'Stocks' },
    forex:   { tr: 'Forex',   en: 'Forex' },
    economy: { tr: 'Ekonomi', en: 'Economy' },
    general: { tr: 'Genel',   en: 'General' },
  };
  const entry = map[c] || map.general;
  return locale === 'tr' ? entry.tr : entry.en;
}

function categoryColor(c: string): string {
  const map: Record<string, string> = {
    crypto:  'text-[#ff9800] border-[#ff9800]/40 bg-[#ff9800]/10',
    stocks:  'text-[#26a69a] border-[#26a69a]/40 bg-[#26a69a]/10',
    forex:   'text-[#4fc3f7] border-[#4fc3f7]/40 bg-[#4fc3f7]/10',
    economy: 'text-[#ba68c8] border-[#ba68c8]/40 bg-[#ba68c8]/10',
    general: 'text-[#8888a0] border-[#8888a0]/40 bg-[#8888a0]/10',
  };
  return map[c] || map.general;
}

function displaySymbol(sym: string): string {
  return sym.replace('BINANCE:', '').replace('OANDA:', '').replace('_', '/').replace('USDT', '');
}

export default function NewsPreviewModal({ item, locale, onClose, onOpenFull }: Props) {
  // ESC + body scroll lock
  useEffect(() => {
    if (!item) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = original;
    };
  }, [item, onClose]);

  if (!item) return null;

  const summary = item.dashboard_summary || item.summary || '';
  const analysis = item.axiom_analysis || '';
  const isBreaking = item.is_urgent || Date.now() - item.publishedAt < 3600000;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#141425] border border-[#2a2a3e] rounded-lg shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a3e]">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
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
            <span className="text-[10px] text-[#4fc3f7] font-medium truncate">{item.source}</span>
            <span className="text-[10px] text-[#8888a0]">{timeAgo(item.publishedAt, locale)}</span>
          </div>
          <button
            onClick={onClose}
            className="text-[#8888a0] hover:text-[#e0e0e0] transition text-lg leading-none w-7 h-7 flex items-center justify-center rounded hover:bg-[#1f1f3a] flex-shrink-0"
            title="Kapat (Esc)"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4">
          {/* Title */}
          <h2 className="text-lg md:text-xl font-bold text-[#e0e0e0] leading-snug">
            {item.title}
          </h2>

          {/* AI Summary */}
          {summary && (
            <div>
              <div className="text-[10px] text-[#8888a0] uppercase tracking-wider mb-1.5">
                {locale === 'tr' ? '📝 Özet' : '📝 Summary'}
              </div>
              <p className="text-[13px] text-[#e0e0e0] leading-relaxed">{summary}</p>
            </div>
          )}

          {/* Market Analysis */}
          {analysis && (
            <div>
              <div className="text-[10px] text-[#8888a0] uppercase tracking-wider mb-1.5">
                {locale === 'tr' ? '🎯 Axiom Analizi' : '🎯 Axiom Analysis'}
              </div>
              <p className="text-[13px] text-[#a0a0b8] leading-relaxed">{analysis}</p>
            </div>
          )}

          {/* No analysis fallback */}
          {!summary && !analysis && (
            <p className="text-[12px] text-[#8888a0] italic">
              {locale === 'tr'
                ? 'Bu haber için AI analizi henüz hazır değil. Tam panelde açarak detayları yükleyebilirsiniz.'
                : 'AI analysis is not ready yet. Open in full panel to load it.'}
            </p>
          )}

          {/* Symbols */}
          {item.symbols && item.symbols.length > 0 && (
            <div>
              <div className="text-[10px] text-[#8888a0] uppercase tracking-wider mb-1.5">
                {locale === 'tr' ? 'İlgili Semboller' : 'Related Symbols'}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {item.symbols.map((sym) => (
                  <span
                    key={sym}
                    className="font-mono text-[11px] text-[#ff9800] bg-[#ff9800]/10 border border-[#ff9800]/30 px-2 py-1 rounded"
                  >
                    {displaySymbol(sym)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-2 px-5 py-2.5 border-t border-[#2a2a3e]">
          <span className="text-[10px] text-[#555570]">Esc / dışına tıkla → kapat</span>
          <div className="flex gap-2">
            {onOpenFull && (
              <button
                onClick={() => {
                  onOpenFull(item.id);
                  onClose();
                }}
                className="text-[11px] text-[#4fc3f7] hover:text-[#ff9800] transition px-2 py-1 rounded hover:bg-[#1f1f3a]"
              >
                {locale === 'tr' ? '📋 Tam panelde aç' : '📋 Open full panel'}
              </button>
            )}
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[#26a69a] hover:text-[#4fc3f7] transition px-2 py-1 rounded hover:bg-[#1f1f3a]"
            >
              {locale === 'tr' ? '🔗 Kaynağı aç ↗' : '🔗 Source ↗'}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

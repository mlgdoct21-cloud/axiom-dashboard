'use client';

/**
 * Detail modal — bir chip'e tıklandığında o panelin tam içeriğini gösterir.
 * ESC ile veya backdrop tıklanınca kapanır.
 */

import React, { useEffect } from 'react';
import type {
  OvernightMarkets,
  EtfFlows,
  EconCalendarEvent,
  PreMarketMovers,
  EarningItem,
  SectorPerformance,
  FearIndices,
  IndexQuote,
} from '@/hooks/useDashboardSummary';
import type { DailyDigestCard } from '@/hooks/useDailyDigest';

// ─── Modal kind union ────────────────────────────────────────────────────

export type ModalContent =
  | { type: 'risk'; data: DailyDigestCard }
  | { type: 'quant'; data: DailyDigestCard }
  | { type: 'portfolio'; data: DailyDigestCard }
  | { type: 'overnight'; data: OvernightMarkets }
  | { type: 'etf'; data: EtfFlows }
  | { type: 'calendar'; data: EconCalendarEvent[] }
  | { type: 'movers'; data: PreMarketMovers }
  | { type: 'earnings'; data: EarningItem[] }
  | { type: 'sectors'; data: SectorPerformance[] }
  | { type: 'vix'; data: FearIndices };

// ─── Helpers (paylaşılan) ────────────────────────────────────────────────

function pctText(v?: number | null): string {
  if (v == null) return '—';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}%`;
}

function pctColor(v?: number | null): string {
  if (v == null) return 'text-[#8888a0]';
  if (v > 0) return 'text-[#26a69a]';
  if (v < 0) return 'text-[#ef5350]';
  return 'text-[#8888a0]';
}

function formatBigNum(v?: number): string {
  if (!v) return '—';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function flagFor(country?: string): string {
  const map: Record<string, string> = {
    US: '🇺🇸', EU: '🇪🇺', DE: '🇩🇪', GB: '🇬🇧', JP: '🇯🇵', TR: '🇹🇷', CN: '🇨🇳', FR: '🇫🇷',
  };
  return map[country || ''] || '🌍';
}

// ─── Per-type renderers ──────────────────────────────────────────────────

function DigestBody({ title, body, symbols }: { title: string; body?: string; symbols?: string[] }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[#e0e0e0] leading-relaxed">{body || 'Veri yok.'}</p>
      {symbols && symbols.length > 0 && (
        <div>
          <div className="text-[10px] text-[#8888a0] uppercase tracking-wider mb-2">İlgili Semboller</div>
          <div className="flex flex-wrap gap-1.5">
            {symbols.map((s) => (
              <span
                key={s}
                className="inline-block px-2 py-1 bg-[#0f0f20] border border-[#2a2a3e] text-[#ff9800] text-[11px] font-mono rounded"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IndexRow({ q }: { q: IndexQuote }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#2a2a3e] last:border-b-0">
      <span className="flex items-center gap-2 text-[12px]">
        <span>{q.flag}</span>
        <span className="text-[#e0e0e0] font-medium">{q.label}</span>
        <span className="text-[10px] text-[#555570] font-mono">{q.symbol}</span>
      </span>
      <span className="flex items-center gap-2 font-mono text-[12px]">
        <span className="text-[#e0e0e0]">{q.price.toLocaleString('tr-TR')}</span>
        <span className={pctColor(q.change_pct)}>{pctText(q.change_pct)}</span>
      </span>
    </div>
  );
}

function OvernightBody({ data }: { data: OvernightMarkets }) {
  const renderRegion = (label: string, items: IndexQuote[]) => {
    if (!items?.length) return null;
    return (
      <div>
        <div className="text-[10px] text-[#8888a0] uppercase tracking-wider mb-1">{label}</div>
        {items.map((q) => (
          <IndexRow key={q.symbol} q={q} />
        ))}
      </div>
    );
  };
  return (
    <div className="space-y-4">
      {renderRegion('Asya', data.asia)}
      {renderRegion('Avrupa', data.europe)}
      {renderRegion('US Futures', data.us_futures)}
    </div>
  );
}

function EtfBody({ data }: { data: EtfFlows }) {
  const renderAsset = (label: string, icon: string, agg: EtfFlows['btc']) => {
    if (!agg.etf_count) return null;
    const flow = agg.net_flow_est ?? 0;
    const flowColor =
      flow > 0 ? 'text-[#26a69a]' : flow < 0 ? 'text-[#ef5350]' : 'text-[#8888a0]';
    const flowSigned =
      flow >= 0 ? `+${formatBigNum(flow)}` : `-${formatBigNum(Math.abs(flow))}`;

    return (
      <div className="bg-[#0f0f20] border border-[#2a2a3e] rounded p-3 mb-3">
        <div className="text-[12px] font-semibold text-[#e0e0e0] mb-2">
          {icon} {label} Spot ETF
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="col-span-2 flex items-center justify-between p-2 bg-[#141425] rounded border border-[#2a2a3e]">
            <span className="text-[10px] text-[#8888a0] uppercase tracking-wider">
              Net Akış (Bugün)
            </span>
            <span className={`font-mono font-semibold text-[14px] ${flowColor}`}>
              {flow > 0 ? '▲' : flow < 0 ? '▼' : '–'} {flowSigned}
            </span>
          </div>
          <div>
            <div className="text-[#8888a0]">Toplam AUM</div>
            <div className="text-[#e0e0e0] font-mono">{formatBigNum(agg.total_aum)}</div>
          </div>
          <div>
            <div className="text-[#8888a0]">Günlük Hacim</div>
            <div className="text-[#e0e0e0] font-mono">{formatBigNum(agg.daily_volume)}</div>
          </div>
          <div>
            <div className="text-[#8888a0]">Ortalama Değişim</div>
            <div className={`font-mono ${pctColor(agg.avg_change_pct)}`}>
              {pctText(agg.avg_change_pct)}
            </div>
          </div>
          <div>
            <div className="text-[#8888a0]">ETF Sayısı</div>
            <div className="text-[#e0e0e0]">{agg.etf_count}</div>
          </div>
          {agg.top_etf && (
            <div className="col-span-2">
              <div className="text-[#8888a0]">Lider ETF</div>
              <div className="text-[#ff9800] font-mono">
                {agg.top_etf.symbol} · {formatBigNum(agg.top_etf.aum)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  return (
    <div>
      {renderAsset('Bitcoin', '₿', data.btc)}
      {renderAsset('Ethereum', 'Ξ', data.eth)}
    </div>
  );
}

function CalendarBody({ data }: { data: EconCalendarEvent[] }) {
  if (!data.length) {
    return <p className="text-[12px] text-[#555570] italic">Bugün önemli ekonomik veri açıklaması yok.</p>;
  }
  return (
    <div className="space-y-2">
      {data.map((e, i) => (
        <div
          key={`${e.event}-${i}`}
          className="flex items-start gap-2 py-1.5 border-b border-[#2a2a3e] last:border-b-0"
        >
          <span className="text-[#4fc3f7] font-mono text-[11px] w-12 flex-shrink-0">
            {formatTime(e.date)}
          </span>
          <span className="text-[14px] flex-shrink-0">{flagFor(e.country)}</span>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] text-[#e0e0e0]">{e.event}</div>
            {(e.estimate != null || e.previous != null || e.actual != null) && (
              <div className="text-[10px] text-[#8888a0] mt-0.5 flex gap-2 flex-wrap">
                {e.actual != null && (
                  <span>
                    Sonuç: <span className="text-[#26a69a]">{String(e.actual)}</span>
                  </span>
                )}
                {e.estimate != null && <span>Beklenti: {String(e.estimate)}</span>}
                {e.previous != null && <span>Önceki: {String(e.previous)}</span>}
                {e.currency && <span>· {e.currency}</span>}
              </div>
            )}
          </div>
          <span
            className={`text-[9px] uppercase font-semibold flex-shrink-0 ${
              e.impact === 'High' ? 'text-[#ef5350]' : 'text-[#ffa726]'
            }`}
          >
            {e.impact}
          </span>
        </div>
      ))}
    </div>
  );
}

function MoversBody({ data }: { data: PreMarketMovers }) {
  const renderList = (title: string, items: PreMarketMovers['gainers'], colorClass: string) => {
    if (!items.length) return null;
    return (
      <div>
        <div className={`text-[10px] uppercase tracking-wider mb-1 ${colorClass}`}>{title}</div>
        {items.map((m) => (
          <div
            key={m.symbol}
            className="flex items-center justify-between py-1.5 border-b border-[#2a2a3e] last:border-b-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-[12px] text-[#e0e0e0] font-medium">{m.symbol}</span>
              {m.name && <span className="text-[10px] text-[#8888a0] truncate">{m.name}</span>}
            </div>
            <div className="flex items-center gap-2 text-[12px] font-mono">
              <span className="text-[#e0e0e0]">${(m.price ?? 0).toFixed(2)}</span>
              <span className={pctColor(m.change_pct)}>{pctText(m.change_pct)}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };
  return (
    <div className="space-y-4">
      {renderList('▲ Kazananlar', data.gainers, 'text-[#26a69a]')}
      {renderList('▼ Kaybedenler', data.losers, 'text-[#ef5350]')}
      {renderList('🔥 En Aktifler', data.actives, 'text-[#ff9800]')}
    </div>
  );
}

function EarningsBody({ data }: { data: EarningItem[] }) {
  if (!data.length) {
    return <p className="text-[12px] text-[#555570] italic">Bugün açıklanacak bilanço yok.</p>;
  }
  const timeLabel = (t?: string): string => {
    if (t === 'bmo') return 'Açılış Önc.';
    if (t === 'amc') return 'Kapanış Snr.';
    if (t === 'dmh') return 'Saat Belirsiz';
    return t || '';
  };
  return (
    <div className="space-y-1">
      {data.map((e) => (
        <div
          key={e.symbol}
          className="flex items-center justify-between py-1.5 border-b border-[#2a2a3e] last:border-b-0"
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-[#ff9800] font-medium text-[12px]">{e.symbol}</span>
            {e.time && (
              <span className="text-[9px] text-[#8888a0] uppercase">{timeLabel(e.time)}</span>
            )}
          </div>
          <div className="flex gap-3 text-[10px]">
            {e.eps_estimate != null && (
              <span className="text-[#e0e0e0] font-mono">
                EPS Bek: <span className="text-[#4fc3f7]">${e.eps_estimate.toFixed(2)}</span>
              </span>
            )}
            {e.eps_actual != null && (
              <span className="text-[#e0e0e0] font-mono">
                EPS Sonuç: <span className="text-[#26a69a]">${e.eps_actual.toFixed(2)}</span>
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SectorsBody({ data }: { data: SectorPerformance[] }) {
  if (!data.length) {
    return <p className="text-[12px] text-[#555570] italic">Sektör verisi yok.</p>;
  }
  const maxAbs = Math.max(...data.map((s) => Math.abs(s.change_pct)), 0.5);
  return (
    <div className="space-y-2">
      {data.map((s) => {
        const ratio = Math.min(Math.abs(s.change_pct) / maxAbs, 1);
        return (
          <div key={s.sector} className="text-[12px]">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[#e0e0e0]">{s.sector}</span>
              <span className={`font-mono ${pctColor(s.change_pct)}`}>{pctText(s.change_pct)}</span>
            </div>
            <div className="h-1.5 bg-[#0f0f20] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  s.change_pct >= 0 ? 'bg-[#26a69a]' : 'bg-[#ef5350]'
                }`}
                style={{ width: `${ratio * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FearBody({ data }: { data: FearIndices }) {
  const { vix, crypto_fng } = data;
  const colorBg = (color?: string) => {
    if (color === 'red') return 'bg-[#ef5350]/20 border-[#ef5350]/40';
    if (color === 'yellow') return 'bg-[#ffa726]/20 border-[#ffa726]/40';
    if (color === 'green') return 'bg-[#26a69a]/20 border-[#26a69a]/40';
    return 'bg-[#0f0f20] border-[#2a2a3e]';
  };
  return (
    <div className="space-y-3">
      {vix && (
        <div className={`p-3 rounded border ${colorBg(vix.color)}`}>
          <div className="text-[10px] text-[#8888a0] uppercase tracking-wider mb-1">
            VIX — S&P 500 Volatilite Endeksi
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-mono font-bold text-[#e0e0e0]">{vix.current}</span>
            <span className="text-[12px] text-[#e0e0e0]">{vix.label}</span>
            <span className={`text-[11px] font-mono ${pctColor(vix.change_pct)}`}>
              {pctText(vix.change_pct)}
            </span>
          </div>
          <div className="text-[10px] text-[#8888a0] mt-1">
            Önceki kapanış: {vix.prev_close} · &lt;15 sakin · 20-30 orta · &gt;30 panik
          </div>
        </div>
      )}
      {crypto_fng && (
        <div className={`p-3 rounded border ${colorBg(crypto_fng.color)}`}>
          <div className="text-[10px] text-[#8888a0] uppercase tracking-wider mb-1">
            Kripto Fear &amp; Greed Index (alternative.me)
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-mono font-bold text-[#e0e0e0]">{crypto_fng.value}</span>
            <span className="text-[12px] text-[#e0e0e0]">{crypto_fng.label}</span>
            {crypto_fng.change != null && (
              <span className={`text-[11px] font-mono ${pctColor(crypto_fng.change)}`}>
                {crypto_fng.change >= 0 ? '+' : ''}
                {crypto_fng.change}
              </span>
            )}
          </div>
          <div className="text-[10px] text-[#8888a0] mt-1">
            0-24 aşırı korku · 25-44 korku · 45-55 nötr · 56-74 açgözlülük · 75+ aşırı açgözlülük
          </div>
        </div>
      )}
      {!vix && !crypto_fng && (
        <p className="text-[12px] text-[#555570] italic">Korku göstergeleri geçici olarak alınamadı.</p>
      )}
    </div>
  );
}

// ─── Main modal component ────────────────────────────────────────────────

const TITLE_MAP: Record<ModalContent['type'], { icon: string; title: string }> = {
  risk:       { icon: '🔴', title: 'Axiom Risk Radar' },
  quant:      { icon: '🟢', title: 'Axiom Kantitatif Analiz' },
  portfolio:  { icon: '🔵', title: 'Portföy Sinyal' },
  overnight:  { icon: '🌏', title: 'Sen Uyurken — Pazarlar' },
  etf:        { icon: '₿',  title: 'Spot ETF Akışları' },
  calendar:   { icon: '📅', title: 'Bugünün Ekonomik Takvimi' },
  movers:     { icon: '🚀', title: 'Pre-Market Hareketleri' },
  earnings:   { icon: '📊', title: 'Bugün Bilançolar' },
  sectors:    { icon: '🔥', title: 'Sektör Performansı' },
  vix:        { icon: '🌡️', title: 'VIX Volatilite Endeksi + Kripto F&G' },
};

export function SummaryDetailModal({
  content,
  onClose,
}: {
  content: ModalContent | null;
  onClose: () => void;
}) {
  // ESC ile kapat
  useEffect(() => {
    if (!content) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    // Body scroll lock
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = original;
    };
  }, [content, onClose]);

  if (!content) return null;

  const meta = TITLE_MAP[content.type];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#141425] border border-[#2a2a3e] rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a3e]">
          <h2 className="text-sm font-semibold text-[#e0e0e0] flex items-center gap-2">
            <span className="text-base">{meta.icon}</span>
            {meta.title}
          </h2>
          <button
            onClick={onClose}
            className="text-[#8888a0] hover:text-[#e0e0e0] transition text-lg leading-none w-7 h-7 flex items-center justify-center rounded hover:bg-[#1f1f3a]"
            title="Kapat (Esc)"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto flex-1">
          {content.type === 'risk' && (
            <DigestBody title="Risk" body={content.data.analysis} symbols={content.data.symbols} />
          )}
          {content.type === 'quant' && (
            <DigestBody title="Quant" body={content.data.trigger} symbols={content.data.symbols} />
          )}
          {content.type === 'portfolio' && (
            <DigestBody
              title="Portföy"
              body={content.data.recommendation}
              symbols={content.data.symbols}
            />
          )}
          {content.type === 'overnight' && <OvernightBody data={content.data} />}
          {content.type === 'etf' && <EtfBody data={content.data} />}
          {content.type === 'calendar' && <CalendarBody data={content.data} />}
          {content.type === 'movers' && <MoversBody data={content.data} />}
          {content.type === 'earnings' && <EarningsBody data={content.data} />}
          {content.type === 'sectors' && <SectorsBody data={content.data} />}
          {content.type === 'vix' && <FearBody data={content.data} />}
        </div>

        {/* Footer */}
        <div className="px-5 py-2 border-t border-[#2a2a3e] text-[10px] text-[#555570] text-right">
          Esc veya dışına tıkla → kapat
        </div>
      </div>
    </div>
  );
}

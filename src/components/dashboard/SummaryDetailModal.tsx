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
import type { MacroRelease } from '@/hooks/useMacroLatest';
import { useMacroUpcoming } from '@/hooks/useMacroLatest';
import { sectorLabelTr } from '@/lib/macro-sector-labels';
import type { OnChainSnapshot } from '@/lib/cryptoquant';

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
  | { type: 'vix'; data: FearIndices }
  | { type: 'macro'; data: MacroRelease; core?: MacroRelease | null }
  | { type: 'onchain'; data: OnChainSnapshot };

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

function formatEtfFreshness(scrapedAt?: string | null, ageHours?: number | null, isStale?: boolean | null) {
  if (!scrapedAt) return null;
  const d = new Date(scrapedAt);
  if (isNaN(d.getTime())) return null;

  const dateLine = d.toLocaleString('tr-TR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }) + ' UTC';

  const hours = ageHours ?? Math.floor((Date.now() - d.getTime()) / 3_600_000);
  let label: string;
  let cls: string;
  if (isStale || hours >= 25) {
    const days = Math.floor(hours / 24);
    label = days >= 1 ? `⚠ ${days} gün eski` : `⚠ ${Math.floor(hours)} saat eski`;
    cls = 'text-[#ef5350] border-[#ef5350]/40 bg-[#ef5350]/10';
  } else if (hours >= 12) {
    label = `${Math.floor(hours)} saat önce`;
    cls = 'text-[#fbbf24] border-[#fbbf24]/40 bg-[#fbbf24]/10';
  } else if (hours >= 1) {
    label = `${Math.floor(hours)} saat önce`;
    cls = 'text-[#26a69a] border-[#26a69a]/40 bg-[#26a69a]/10';
  } else {
    label = 'Az önce';
    cls = 'text-[#26a69a] border-[#26a69a]/40 bg-[#26a69a]/10';
  }
  return { label, cls, dateLine, title: `Veri tarihi: ${dateLine}` };
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

// ─── OnChain modal body ──────────────────────────────────────────────────
// Renders BTC CryptoQuant signals (exchange netflow, funding, whale ratio,
// MVRV, NUPL, SOPR, etc.) inline in the modal — no /dashboard/crypto
// navigation, no auth gate.
const SIGNAL_LABELS_TR: Record<string, string> = {
  exchange_netflow: 'Borsa Net Akışı',
  whale_ratio:      'Balina Oranı',
  miner_reserve:    'Madenci Rezerv',
  miner_outflow:    'Madenci Çıkışı',
  stablecoin_inflow:'Stablecoin Girişi',
  funding_rates:    'Funding Rate',
  open_interest:    'Açık Pozisyon',
  sopr:             'SOPR',
  coinbase_premium: 'Coinbase Premium',
  mvrv:             'MVRV',
  nupl:             'NUPL',
  mpi:              'Madenci Pozisyon İndeksi',
  puell:            'Puell Multiple',
  hash_rate:        'Hash Rate',
  leverage_ratio:   'Kaldıraç Oranı',
  realized_price:   'Gerçekleşmiş Fiyat',
};

function OnChainBody({ data }: { data: import('@/lib/cryptoquant').OnChainSnapshot }) {
  const score = data?.axiom_score;
  const zone  = data?.score_zone_tr ?? data?.score_zone ?? null;
  const overall = data?.overall_tr ?? data?.overall ?? null;
  const signals = data?.signals ?? {};
  const entries = Object.entries(signals);

  // Sort: BEARISH first (risk), then BULLISH, then NEUTRAL
  const order: Record<string, number> = { BEARISH: 0, BULLISH: 1, NEUTRAL: 2 };
  entries.sort((a, b) => (order[a[1]?.signal ?? 'NEUTRAL'] ?? 3) - (order[b[1]?.signal ?? 'NEUTRAL'] ?? 3));

  return (
    <div className="space-y-4">
      {/* Headline: Axiom Score + Overall */}
      <div className="flex items-center justify-between p-3 bg-[#0f0f20] border border-[#2a2a3e] rounded">
        <div>
          <div className="text-[10px] text-[#8888a0] uppercase tracking-wider mb-0.5">Axiom Skor</div>
          <div className="text-2xl font-bold text-[#e0e0e0] font-mono">
            {score != null ? score.toFixed(0) : '—'}
            <span className="text-[12px] text-[#8888a0] font-normal ml-2">/ 100</span>
          </div>
        </div>
        <div className="text-right">
          {zone && <div className="text-[12px] font-semibold text-[#ff9800]">{zone}</div>}
          {overall && <div className="text-[10px] text-[#8888a0] mt-0.5">{overall}</div>}
        </div>
      </div>

      {/* Signal table */}
      {entries.length > 0 ? (
        <div>
          <div className="text-[10px] text-[#8888a0] uppercase tracking-wider mb-2">Sinyaller</div>
          <div className="space-y-1">
            {entries.map(([key, sig]) => {
              const sigType = sig?.signal ?? 'NEUTRAL';
              const color =
                sigType === 'BULLISH' ? 'text-[#26a69a]' :
                sigType === 'BEARISH' ? 'text-[#ef5350]' :
                'text-[#8888a0]';
              return (
                <div
                  key={key}
                  className="flex items-center justify-between py-1.5 border-b border-[#2a2a3e] last:border-b-0 text-[12px]"
                >
                  <span className="text-[#e0e0e0]">
                    {SIGNAL_LABELS_TR[key] ?? key}
                  </span>
                  <span className="flex items-center gap-2 font-mono">
                    <span className="text-[#e0e0e0]">{sig?.value_str ?? '—'}</span>
                    <span className={color}>{sig?.label_tr ?? sigType}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#8888a0]">On-chain sinyal verisi yüklenemedi.</p>
      )}

      <div className="text-[10px] text-[#555570]">
        Kaynak: CryptoQuant · Güncellenme: {data?.fetched_at ? new Date(data.fetched_at).toLocaleString('tr-TR') : '—'}
      </div>
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
  const renderAsset = (label: string, icon: string, coin: string, agg: EtfFlows['btc']) => {
    if (!agg.etf_count) return null;
    const flowUsd = agg.net_flow_usd ?? 0;
    const flowCoins = agg.net_flow_coins ?? 0;
    const flowColor =
      flowUsd > 0 ? 'text-[#26a69a]' : flowUsd < 0 ? 'text-[#ef5350]' : 'text-[#8888a0]';

    const usdSigned =
      flowUsd >= 0 ? `+${formatBigNum(flowUsd)}` : `-${formatBigNum(Math.abs(flowUsd))}`;
    const coinAbs = Math.abs(flowCoins);
    const coinFormatted =
      coinAbs >= 1000 ? coinAbs.toFixed(0) : coinAbs >= 100 ? coinAbs.toFixed(1) : coinAbs.toFixed(2);
    const coinSigned = flowUsd >= 0 ? `+${coinFormatted} ${coin}` : `-${coinFormatted} ${coin}`;

    const freshness = formatEtfFreshness(agg.scraped_at, agg.age_hours, agg.is_stale);

    return (
      <div className="bg-[#0f0f20] border border-[#2a2a3e] rounded p-4 mb-3">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="text-[12px] font-semibold text-[#e0e0e0]">
            {icon} {label} Spot ETF
          </div>
          {freshness && (
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${freshness.cls}`}
              title={freshness.title}
            >
              {freshness.label}
            </span>
          )}
        </div>

        {/* Hero — SoSoValue tarzı USD + coin amount */}
        <div className="border-t border-b border-[#2a2a3e] py-3 mb-3">
          <div className="text-[10px] text-[#8888a0] uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Daily Total Net Inflow</span>
            {freshness && (
              <span className="text-[#555570] normal-case tracking-normal">{freshness.dateLine}</span>
            )}
          </div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className={`text-2xl font-bold font-mono ${flowColor}`}>{usdSigned}</span>
            <span className={`text-sm font-mono ${flowColor} opacity-80`}>{coinSigned}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
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
      {renderAsset('Bitcoin', '₿', 'BTC', data.btc)}
      {renderAsset('Ethereum', 'Ξ', 'ETH', data.eth)}
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

const PCT_DELTA_EVENTS = new Set(['CPI', 'PCE', 'CORE_CPI', 'CORE_PCE']);

const SHORT_LABEL_TR: Record<string, string> = {
  CPI: 'CPI',
  PCE: 'PCE',
  CORE_CPI: 'Çekirdek CPI',
  CORE_PCE: 'Çekirdek PCE',
  NFP: 'NFP',
  UNRATE: 'İşsizlik',
};

function fmtJobsK(v: number | null | undefined): string {
  if (v == null) return '—';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${Math.round(v)}K`;
}

function fmtLevelPct(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${Number(v).toFixed(1)}%`;
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${Number(v).toFixed(2)}%`;
}

function pctClass(v: number | null | undefined): string {
  if (v == null) return 'text-[#555570]';
  if (v > 0) return 'text-[#ef5350]';
  if (v < 0) return 'text-[#26a69a]';
  return 'text-[#e0e0e0]';
}

function MetricRow({ label, prior, expected, actual }: {
  label: string;
  prior: number | null | undefined;
  expected: number | null | undefined;
  actual: number | null | undefined;
}) {
  if (prior == null && expected == null && actual == null) return null;
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-0.5 items-baseline py-1 border-b border-[#1a1a2e] last:border-0">
      <span className="text-[12px] text-[#e0e0e0] font-medium">{label}</span>
      <div className="text-right">
        <div className="text-[8px] text-[#555570] uppercase tracking-wider leading-tight">Önceki</div>
        <div className="text-[12px] font-mono text-[#8888a0]">{fmtPct(prior)}</div>
      </div>
      <div className="text-right">
        <div className="text-[8px] text-[#555570] uppercase tracking-wider leading-tight">Beklenti</div>
        <div className="text-[12px] font-mono text-[#8888a0]">{fmtPct(expected)}</div>
      </div>
      <div className="text-right">
        <div className="text-[8px] text-[#555570] uppercase tracking-wider leading-tight">Gelen</div>
        <div className={`text-[13px] font-mono font-semibold ${pctClass(actual)}`}>{fmtPct(actual)}</div>
      </div>
    </div>
  );
}

type MarketReactionPayload = NonNullable<MacroRelease['market_reaction']>;

interface HistoryPoint {
  event_id: string;
  released_at: string;
  actual_value: number | null;
  prior_value: number | null;
  mom_pct: number | null;
  yoy_pct: number | null;
  change_k?: number | null;
}

interface HistoryPayload {
  event_type: string;
  source: string;
  points: HistoryPoint[];
}

function HistoryChart({ headlineType, coreType }: { headlineType: string; coreType: string | null }) {
  const [headline, setHeadline] = React.useState<HistoryPayload | null>(null);
  const [core, setCore] = React.useState<HistoryPayload | null>(null);
  const [hover, setHover] = React.useState<{ idx: number } | null>(null);
  const isNfp = headlineType === 'NFP';
  const valueOf = (p: HistoryPoint): number | null =>
    isNfp ? (p.change_k ?? null) : (p.mom_pct ?? null);
  const fmtTick = (v: number) => (isNfp ? `${v >= 0 ? '+' : ''}${v.toFixed(0)}K` : `${v.toFixed(1)}%`);
  const fmtCell = (v: number) => (isNfp ? `${v >= 0 ? '+' : ''}${v.toFixed(0)}K` : `${v > 0 ? '+' : ''}${v.toFixed(2)}%`);
  useEffect(() => {
    let active = true;
    fetch(`/api/macro/history/${headlineType}?months=14`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => active && setHeadline(d as HistoryPayload | null))
      .catch(() => {});
    if (coreType) {
      fetch(`/api/macro/history/${coreType}?months=14`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => active && setCore(d as HistoryPayload | null))
        .catch(() => {});
    }
    return () => { active = false; };
  }, [headlineType, coreType]);

  const pts = headline?.points ?? [];
  if (pts.length < 2) return null;

  const W = 560;
  const H = 140;
  const PAD_L = 36;
  const PAD_R = 8;
  const PAD_T = 12;
  const PAD_B = 22;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const seriesA = pts.map(valueOf).filter((v): v is number => v != null);
  const seriesB = (core?.points ?? []).map(valueOf).filter((v): v is number => v != null);
  const all = [...seriesA, ...seriesB];
  if (all.length === 0) return null;
  const yMin = Math.min(...all);
  const yMax = Math.max(...all);
  const yRange = yMax - yMin || 1;
  const yPad = yRange * 0.2;
  const yLo = yMin - yPad;
  const yHi = yMax + yPad;

  const xFor = (i: number) => PAD_L + (i / Math.max(1, pts.length - 1)) * innerW;
  const yFor = (v: number) => PAD_T + (1 - (v - yLo) / (yHi - yLo)) * innerH;

  const path = (points: (number | null)[]) =>
    points
      .map((v, i) => {
        if (v == null) return '';
        const cmd = i === 0 ? 'M' : 'L';
        return `${cmd}${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`;
      })
      .filter((s) => s)
      .join(' ');

  const headlinePath = path(pts.map(valueOf));
  const corePts = core?.points ?? [];
  // Align Core to headline by released_at — backend returns same period set.
  const corePath = corePts.length === pts.length ? path(corePts.map(valueOf)) : '';

  const labelMap: Record<string, string> = {
    CPI: 'CPI', PCE: 'PCE', CORE_CPI: 'Çekirdek CPI', CORE_PCE: 'Çekirdek PCE',
    NFP: 'NFP', UNRATE: 'İşsizlik',
  };
  const headlineLabel = labelMap[headlineType] ?? headlineType;
  const coreLabel = coreType ? (labelMap[coreType] ?? coreType) : null;

  const hovered = hover ? pts[hover.idx] : null;
  const hoveredCore = hover && core?.points?.[hover.idx] ? core.points[hover.idx] : null;
  const hoveredVal = hovered ? valueOf(hovered) : null;
  const hoveredCoreVal = hoveredCore ? valueOf(hoveredCore) : null;

  return (
    <div className="bg-[#0f0f20] border border-[#2a2a3e] rounded p-3" data-testid="macro-history-chart">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-[#8888a0] uppercase tracking-wider">
          14 ay {isNfp ? 'aylık değişim (K)' : 'MoM %'}
        </span>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 bg-[#4fc3f7]" /> {headlineLabel}
          </span>
          {coreLabel && (
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-3 h-0.5 bg-[#ffa726]" /> {coreLabel}
            </span>
          )}
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-[140px]"
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * W;
          const idx = Math.round(((x - PAD_L) / innerW) * (pts.length - 1));
          if (idx >= 0 && idx < pts.length) setHover({ idx });
        }}
        onMouseLeave={() => setHover(null)}
      >
        {/* zero line */}
        {yLo < 0 && yHi > 0 && (
          <line
            x1={PAD_L} x2={W - PAD_R} y1={yFor(0)} y2={yFor(0)}
            stroke="#2a2a3e" strokeDasharray="2 3"
          />
        )}
        {/* y-axis labels */}
        <text x={PAD_L - 4} y={yFor(yHi - yPad) + 3} textAnchor="end" fontSize="9" fill="#555570">{fmtTick(yHi - yPad)}</text>
        <text x={PAD_L - 4} y={yFor(yLo + yPad) + 3} textAnchor="end" fontSize="9" fill="#555570">{fmtTick(yLo + yPad)}</text>
        {/* x-axis: first + last released_at month */}
        <text x={PAD_L} y={H - 6} fontSize="9" fill="#555570">{pts[0].released_at.slice(0, 7)}</text>
        <text x={W - PAD_R} y={H - 6} textAnchor="end" fontSize="9" fill="#555570">{pts[pts.length - 1].released_at.slice(0, 7)}</text>
        {/* core line first (drawn under headline) */}
        {corePath && <path d={corePath} fill="none" stroke="#ffa726" strokeWidth="1.5" />}
        <path d={headlinePath} fill="none" stroke="#4fc3f7" strokeWidth="1.75" />
        {/* hover marker */}
        {hovered && hoveredVal != null && (
          <>
            <line
              x1={xFor(hover!.idx)} x2={xFor(hover!.idx)}
              y1={PAD_T} y2={H - PAD_B}
              stroke="#555570" strokeDasharray="2 2"
            />
            <circle cx={xFor(hover!.idx)} cy={yFor(hoveredVal)} r="3" fill="#4fc3f7" />
            {hoveredCoreVal != null && (
              <circle cx={xFor(hover!.idx)} cy={yFor(hoveredCoreVal)} r="3" fill="#ffa726" />
            )}
          </>
        )}
      </svg>
      {hovered && (
        <div className="text-[10px] text-[#8888a0] mt-1 flex gap-3">
          <span className="text-[#e0e0e0]">{hovered.released_at.slice(0, 7)}</span>
          {hoveredVal != null && (
            <span className="text-[#4fc3f7] font-mono">
              {headlineLabel} {fmtCell(hoveredVal)}
            </span>
          )}
          {hoveredCoreVal != null && (
            <span className="text-[#ffa726] font-mono">
              {coreLabel} {fmtCell(hoveredCoreVal)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function MarketReactionLine({ reaction }: { reaction: MarketReactionPayload }) {
  const dxy = reaction.dxy_change_pct;
  const spy = reaction.spy_change_pct;
  const us10y = reaction.us10y_change_bp;
  if (dxy == null && spy == null && us10y == null) return null;
  const cell = (label: string, val: number | null, fmt: (v: number) => string) => {
    if (val == null) return null;
    const cls = val > 0 ? 'text-[#ef5350]' : val < 0 ? 'text-[#26a69a]' : 'text-[#e0e0e0]';
    return (
      <span key={label} className="inline-flex items-baseline gap-1">
        <span className="text-[10px] text-[#8888a0] uppercase tracking-wider">{label}</span>
        <span className={`text-[12px] font-mono font-semibold ${cls}`}>{fmt(val)}</span>
      </span>
    );
  };
  return (
    <div className="bg-[#0f0f20] border border-[#2a2a3e] rounded px-3 py-2 flex items-center gap-4 flex-wrap" data-testid="macro-market-reaction">
      <span className="text-[10px] text-[#ff9800] uppercase tracking-wider">📉 Piyasa tepkisi (T+5dk)</span>
      {cell('DXY', dxy, (v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`)}
      {cell('SPY', spy, (v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`)}
      {cell('US10Y', us10y, (v) => `${v > 0 ? '+' : ''}${v.toFixed(0)}bp`)}
    </div>
  );
}

function NfpMetricRow({ label, prior, expected, actual, fmt }: {
  label: string;
  prior: number | null | undefined;
  expected: number | null | undefined;
  actual: number | null | undefined;
  fmt: (v: number | null | undefined) => string;
}) {
  if (prior == null && expected == null && actual == null) return null;
  const cls = (v: number | null | undefined) => {
    if (v == null) return 'text-[#555570]';
    if (v > 0) return 'text-[#26a69a]'; // jobs added = green
    if (v < 0) return 'text-[#ef5350]';
    return 'text-[#e0e0e0]';
  };
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-0.5 items-baseline py-1 border-b border-[#1a1a2e] last:border-0">
      <span className="text-[12px] text-[#e0e0e0] font-medium">{label}</span>
      <div className="text-right">
        <div className="text-[8px] text-[#555570] uppercase tracking-wider leading-tight">Önceki</div>
        <div className="text-[12px] font-mono text-[#8888a0]">{fmt(prior)}</div>
      </div>
      <div className="text-right">
        <div className="text-[8px] text-[#555570] uppercase tracking-wider leading-tight">Beklenti</div>
        <div className="text-[12px] font-mono text-[#8888a0]">{fmt(expected)}</div>
      </div>
      <div className="text-right">
        <div className="text-[8px] text-[#555570] uppercase tracking-wider leading-tight">Gelen</div>
        <div className={`text-[13px] font-mono font-semibold ${cls(actual)}`}>{fmt(actual)}</div>
      </div>
    </div>
  );
}

function MetricsTable({ headline, core }: { headline: MacroRelease; core: MacroRelease | null }) {
  const et = (headline.event_type || '').toUpperCase();
  // NFP path — raw K change + paired UNRATE level. Different formatting,
  // semantically the same Önceki | Beklenti | Gelen layout.
  if (et === 'NFP') {
    const headLabel = SHORT_LABEL_TR[et] ?? et;
    const isUnrate = core && (core.event_type || '').toUpperCase() === 'UNRATE';
    return (
      <div className="bg-[#0f0f20] border border-[#2a2a3e] rounded p-3" data-testid="macro-metrics-table">
        <NfpMetricRow
          label={`${headLabel} Aylık`}
          prior={headline.prior_change_k}
          expected={headline.expected_mom_pct}
          actual={headline.change_k}
          fmt={fmtJobsK}
        />
        {isUnrate && (
          <NfpMetricRow
            label="İşsizlik"
            prior={core!.prior_value}
            expected={core!.expected_mom_pct}
            actual={core!.actual_value}
            fmt={fmtLevelPct}
          />
        )}
      </div>
    );
  }
  if (!PCT_DELTA_EVENTS.has(et)) return null;
  const headLabel = SHORT_LABEL_TR[et] ?? et;
  const coreLabel = core ? (SHORT_LABEL_TR[(core.event_type || '').toUpperCase()] ?? core.event_type) : null;
  return (
    <div className="bg-[#0f0f20] border border-[#2a2a3e] rounded p-3" data-testid="macro-metrics-table">
      <MetricRow label={`${headLabel} MoM`} prior={headline.prior_mom_pct} expected={headline.expected_mom_pct} actual={headline.mom_pct} />
      {core && (
        <MetricRow label={`${coreLabel} MoM`} prior={core.prior_mom_pct} expected={core.expected_mom_pct} actual={core.mom_pct} />
      )}
      <MetricRow label={`${headLabel} YoY`} prior={headline.prior_yoy_pct} expected={headline.expected_yoy_pct} actual={headline.yoy_pct} />
      {core && (
        <MetricRow label={`${coreLabel} YoY`} prior={core.prior_yoy_pct} expected={core.expected_yoy_pct} actual={core.yoy_pct} />
      )}
    </div>
  );
}

function MacroBody({ data, core }: { data: MacroRelease; core: MacroRelease | null }) {
  const sentiment = data.sentiment_score;
  const tone = (() => {
    if (sentiment == null) return { label: 'Bilinmiyor', color: 'text-[#8888a0]', dot: 'bg-[#555570]' };
    if (sentiment >= 0.66) return { label: 'Güvercin / risk-on', color: 'text-[#26a69a]', dot: 'bg-[#26a69a]' };
    if (sentiment <= 0.33) return { label: 'Şahin / risk-off', color: 'text-[#ef5350]', dot: 'bg-[#ef5350]' };
    return { label: 'Karışık', color: 'text-[#ffa726]', dot: 'bg-[#ffa726]' };
  })();
  const gaugeColor = (() => {
    if (sentiment == null) return 'bg-[#555570]';
    if (sentiment >= 0.66) return 'bg-[#26a69a]';
    if (sentiment <= 0.33) return 'bg-[#ef5350]';
    return 'bg-[#ffa726]';
  })();
  const releasedHuman = data.released_at
    ? new Date(data.released_at).toLocaleString('tr-TR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '—';
  const sectorsPos = data.sectors_positive ?? [];
  const sectorsNeg = data.sectors_negative ?? [];
  const hasSectors = sectorsPos.length > 0 || sectorsNeg.length > 0;
  const momPct = data.mom_pct ?? null;
  const isPctEvent = ['CPI', 'PCE', 'CORE_CPI', 'CORE_PCE'].includes(
    (data.event_type || '').toUpperCase(),
  );
  const momColor = momPct == null ? 'text-[#8888a0]' : momPct > 0 ? 'text-[#ef5350]' : 'text-[#26a69a]';
  const trMonths = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const periodLabel = (() => {
    if (!data.released_at) return null;
    const d = new Date(data.released_at);
    return `${trMonths[d.getUTCMonth() + 1]} ${d.getUTCFullYear()}`;
  })();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-[12px]">
        <span className="px-2 py-0.5 rounded bg-[#0f0f20] border border-[#2a2a3e] text-[#ff9800] font-mono uppercase tracking-wider">
          {data.event_type}
        </span>
        <span className="text-[#8888a0]">{flagFor(data.country)} {data.country}</span>
        <span className="text-[#555570]">·</span>
        <span className="text-[#8888a0]">Yayın: {releasedHuman}</span>
        {periodLabel && (
          <>
            <span className="text-[#555570]">·</span>
            <span className="text-[#8888a0]">{periodLabel}</span>
          </>
        )}
      </div>

      <MetricsTable headline={data} core={core} />

      {(PCT_DELTA_EVENTS.has((data.event_type || '').toUpperCase()) ||
        (data.event_type || '').toUpperCase() === 'NFP') && (
        <HistoryChart
          headlineType={(data.event_type || '').toUpperCase()}
          coreType={
            // For NFP we don't overlay UNRATE — different unit (% vs K).
            (data.event_type || '').toUpperCase() === 'NFP'
              ? null
              : core ? (core.event_type || '').toUpperCase() : null
          }
        />
      )}

      {data.narrative_md ? (
        <p className="text-sm text-[#e0e0e0] leading-relaxed whitespace-pre-line">
          {data.narrative_md}
        </p>
      ) : (
        <p className="text-[12px] text-[#555570] italic">Henüz narrative üretilmedi.</p>
      )}

      {hasSectors && (
        <div className="space-y-1.5">
          {sectorsPos.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-[#8888a0] uppercase tracking-wider mr-1">Olumlu</span>
              {sectorsPos.map((s) => (
                <span
                  key={`pos-${s}`}
                  className="px-2 py-0.5 rounded text-[11px] bg-[#0f1f15] border border-[#26a69a]/40 text-[#26a69a]"
                  data-testid="macro-sector-pos"
                >
                  ↑ {sectorLabelTr(s)}
                </span>
              ))}
            </div>
          )}
          {sectorsNeg.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-[#8888a0] uppercase tracking-wider mr-1">Olumsuz</span>
              {sectorsNeg.map((s) => (
                <span
                  key={`neg-${s}`}
                  className="px-2 py-0.5 rounded text-[11px] bg-[#1f0f10] border border-[#ef5350]/40 text-[#ef5350]"
                  data-testid="macro-sector-neg"
                >
                  ↓ {sectorLabelTr(s)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-[11px]">
          <span className={`w-2 h-2 rounded-full ${tone.dot}`} />
          <span className="text-[#8888a0]">Piyasa tonu:</span>
          <span className={`font-semibold ${tone.color}`}>{tone.label}</span>
          {sentiment != null && (
            <span className="text-[#555570] font-mono ml-1">({sentiment.toFixed(2)})</span>
          )}
        </div>
        {sentiment != null && (
          <div className="flex items-center gap-2" data-testid="macro-gauge">
            <span className="text-[9px] text-[#555570]">Şahin</span>
            <div className="flex-1 h-1.5 rounded-full bg-[#0f0f20] border border-[#2a2a3e] overflow-hidden">
              <div
                className={`h-full ${gaugeColor}`}
                style={{ width: `${Math.max(0, Math.min(1, sentiment)) * 100}%` }}
              />
            </div>
            <span className="text-[9px] text-[#555570]">Güvercin</span>
          </div>
        )}
      </div>

      {!isPctEvent && (data.actual_value != null || data.prior_value != null) && (
        <div className="grid grid-cols-2 gap-2">
          {data.actual_value != null && (
            <div className="bg-[#0f0f20] border border-[#2a2a3e] rounded px-3 py-2">
              <div className="text-[9px] text-[#8888a0] uppercase tracking-wider">Bu dönem</div>
              <div className="text-[14px] font-mono text-[#e0e0e0]">
                {data.actual_value.toLocaleString('tr-TR')}
              </div>
            </div>
          )}
          {data.prior_value != null && (
            <div className="bg-[#0f0f20] border border-[#2a2a3e] rounded px-3 py-2">
              <div className="text-[9px] text-[#8888a0] uppercase tracking-wider">Önceki dönem</div>
              <div className="text-[14px] font-mono text-[#e0e0e0]">
                {data.prior_value.toLocaleString('tr-TR')}
              </div>
            </div>
          )}
        </div>
      )}

      {data.market_reaction && (
        <MarketReactionLine reaction={data.market_reaction} />
      )}

      {data.source_url && (
        <a
          href={data.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-[#4fc3f7] hover:text-[#ff9800]"
        >
          🔗 Resmi kaynak
        </a>
      )}

      <UpcomingReleases />

      <p className="text-[10px] text-[#555570] italic pt-2 border-t border-[#2a2a3e]" data-testid="macro-disclaimer">
        ⚠️ Yatırım tavsiyesi değildir.
      </p>
    </div>
  );
}

const _EVENT_LABELS_TR: Record<string, string> = {
  CPI: 'TÜFE (CPI)',
  NFP: 'Tarım Dışı İstihdam (NFP)',
  PCE: 'PCE Enflasyon',
  FOMC_DECISION: 'Fed Faiz Kararı (FOMC)',
};

function _formatUpcomingWhen(scheduledAt: string): string {
  const d = new Date(scheduledAt);
  const trMonths = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
    'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const day = d.getUTCDate();
  const month = trMonths[d.getUTCMonth()];
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${day} ${month} ${hh}:${mm} UTC`;
}

function _daysUntil(scheduledAt: string): number {
  const ms = new Date(scheduledAt).getTime() - Date.now();
  return Math.floor(ms / 86400000);
}

function UpcomingReleases() {
  const { data, loading } = useMacroUpcoming(true, { days: 30, limit: 4 });
  if (loading && !data) return null;
  const events = data?.events ?? [];
  if (events.length === 0) return null;
  return (
    <div className="space-y-2 pt-2 border-t border-[#2a2a3e]" data-testid="macro-upcoming">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#8888a0] uppercase tracking-wider">Sırada</span>
        <span className="text-[9px] text-[#555570]">FRED takvimi · 30 gün</span>
      </div>
      <div className="space-y-1">
        {events.map((e) => {
          const days = _daysUntil(e.scheduled_at);
          const label = _EVENT_LABELS_TR[e.event_type] ?? e.event_type;
          const dayBadge =
            days <= 0 ? 'bugün' :
            days === 1 ? 'yarın' :
            `${days} gün`;
          const dayColor =
            days <= 1 ? 'text-[#ff9800] border-[#ff9800]/40 bg-[#1f1610]' :
            days <= 7 ? 'text-[#4fc3f7] border-[#4fc3f7]/40 bg-[#0f1820]' :
            'text-[#8888a0] border-[#2a2a3e] bg-[#0f0f20]';
          return (
            <div
              key={`${e.event_type}-${e.scheduled_at}`}
              className="flex items-center gap-2 text-[12px] py-1"
            >
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${dayColor}`}>
                {dayBadge}
              </span>
              <span className="text-[#e0e0e0] flex-1 truncate">{label}</span>
              <span className="text-[10px] text-[#8888a0] font-mono">
                {_formatUpcomingWhen(e.scheduled_at)}
              </span>
            </div>
          );
        })}
      </div>
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
  macro:      { icon: '🌐', title: 'Makro Pulse — Son Release' },
  onchain:    { icon: '🔗', title: 'BTC On-Chain Sinyaller' },
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
          {content.type === 'macro' && <MacroBody data={content.data} core={content.core ?? null} />}
          {content.type === 'onchain' && <OnChainBody data={content.data} />}
        </div>

        {/* Footer */}
        <div className="px-5 py-2 border-t border-[#2a2a3e] text-[10px] text-[#555570] text-right">
          Esc veya dışına tıkla → kapat
        </div>
      </div>
    </div>
  );
}

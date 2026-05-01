'use client';

/**
 * Compact mini-chip components for the dashboard summary.
 * 9 chip toplam: 3 digest + 6 FMP panel. Tek bir kompakt grid'de render edilir.
 */

import React from 'react';
import type {
  OvernightMarkets,
  EtfFlows,
  EconCalendarEvent,
  PreMarketMovers,
  EarningItem,
  SectorPerformance,
  IndexQuote,
} from '@/hooks/useDashboardSummary';
import type { DailyDigestCard } from '@/hooks/useDailyDigest';

// ─── Helpers ─────────────────────────────────────────────────────────────

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
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function flagFor(country?: string): string {
  const map: Record<string, string> = {
    US: '🇺🇸', EU: '🇪🇺', DE: '🇩🇪', GB: '🇬🇧', JP: '🇯🇵', TR: '🇹🇷', CN: '🇨🇳', FR: '🇫🇷',
  };
  return map[country || ''] || '🌍';
}

function timeShort(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// ─── Chip building block ─────────────────────────────────────────────────

interface ChipProps {
  icon: string;
  title: string;
  primary?: React.ReactNode;
  secondary?: React.ReactNode;
  accent?: 'red' | 'yellow' | 'green' | 'blue' | 'gray';
  loading?: boolean;
  empty?: boolean;
  tooltip?: string;
}

const accentMap: Record<NonNullable<ChipProps['accent']>, { border: string; dot: string }> = {
  red:    { border: 'border-l-[#ef5350]', dot: 'bg-[#ef5350]' },
  yellow: { border: 'border-l-[#ffa726]', dot: 'bg-[#ffa726]' },
  green:  { border: 'border-l-[#26a69a]', dot: 'bg-[#26a69a]' },
  blue:   { border: 'border-l-[#4fc3f7]', dot: 'bg-[#4fc3f7]' },
  gray:   { border: 'border-l-[#555570]', dot: 'bg-[#555570]' },
};

export function Chip({ icon, title, primary, secondary, accent = 'gray', loading, empty, tooltip }: ChipProps) {
  const { border, dot } = accentMap[accent];
  return (
    <div
      title={tooltip}
      className={`bg-[#1a1a2e] border border-[#2a2a3e] border-l-[3px] ${border} rounded px-2.5 py-2 min-h-[68px] flex flex-col justify-center transition-all hover:bg-[#1f1f3a] cursor-default`}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        <span className="text-[9px] font-semibold text-[#8888a0] uppercase tracking-wider truncate">
          {icon} {title}
        </span>
      </div>
      {loading ? (
        <div className="h-3 bg-[#2a2a3e] rounded animate-pulse" />
      ) : empty ? (
        <div className="text-[10px] text-[#555570] italic">Veri yok</div>
      ) : (
        <>
          <div className="text-[11px] font-medium text-[#e0e0e0] leading-tight truncate">{primary}</div>
          {secondary && (
            <div className="text-[10px] text-[#8888a0] leading-tight truncate mt-0.5">{secondary}</div>
          )}
        </>
      )}
    </div>
  );
}

// ─── 3 Digest mini chips ─────────────────────────────────────────────────

function colorAccent(color?: string): ChipProps['accent'] {
  if (color === 'red' || color === 'yellow' || color === 'green' || color === 'blue') {
    return color;
  }
  return 'gray';
}

export function DigestRiskChip({ card, loading }: { card?: DailyDigestCard; loading?: boolean }) {
  const empty = !loading && (!card || (!card.analysis && !card.symbols?.length));
  const symbols = card?.symbols?.slice(0, 3).join(' · ');
  return (
    <Chip
      icon="🔴"
      title="Risk Radar"
      primary={card?.analysis}
      secondary={symbols}
      accent={colorAccent(card?.color)}
      loading={loading}
      empty={empty}
      tooltip={card?.analysis}
    />
  );
}

export function DigestQuantChip({ card, loading }: { card?: DailyDigestCard; loading?: boolean }) {
  const empty = !loading && (!card || (!card.trigger && !card.symbols?.length));
  const symbols = card?.symbols?.slice(0, 3).join(' · ');
  return (
    <Chip
      icon="🟢"
      title="Kantitatif"
      primary={card?.trigger}
      secondary={symbols}
      accent={colorAccent(card?.color)}
      loading={loading}
      empty={empty}
      tooltip={card?.trigger}
    />
  );
}

export function DigestPortfolioChip({ card, loading }: { card?: DailyDigestCard; loading?: boolean }) {
  const empty = !loading && (!card || (!card.recommendation && !card.symbols?.length));
  const symbols = card?.symbols?.slice(0, 3).join(' · ');
  return (
    <Chip
      icon="🔵"
      title="Portföy Sinyal"
      primary={card?.recommendation}
      secondary={symbols}
      accent={colorAccent(card?.color)}
      loading={loading}
      empty={empty}
      tooltip={card?.recommendation}
    />
  );
}

// ─── 6 FMP panel mini chips ──────────────────────────────────────────────

export function MiniOvernightChip({ data, loading }: { data?: OvernightMarkets | null; loading?: boolean }) {
  const all: IndexQuote[] = [
    ...(data?.asia || []),
    ...(data?.europe || []),
    ...(data?.us_futures || []),
  ];
  const empty = !loading && all.length === 0;
  const sorted = [...all].sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct));
  const top = sorted[0];
  const second = sorted[1];

  return (
    <Chip
      icon="🌏"
      title="Sen Uyurken"
      primary={
        top ? (
          <span>
            {top.flag} {top.label}{' '}
            <span className={pctColor(top.change_pct)}>{pctText(top.change_pct)}</span>
          </span>
        ) : null
      }
      secondary={
        second ? (
          <span>
            {second.flag} {second.label}{' '}
            <span className={pctColor(second.change_pct)}>{pctText(second.change_pct)}</span>
          </span>
        ) : null
      }
      accent="blue"
      loading={loading}
      empty={empty}
    />
  );
}

export function MiniEtfChip({ data, loading }: { data?: EtfFlows | null; loading?: boolean }) {
  const empty = !loading && (!data || (!data.btc.etf_count && !data.eth.etf_count));
  const btc = data?.btc;
  const eth = data?.eth;

  return (
    <Chip
      icon="₿"
      title="Spot ETF Akışları"
      primary={
        btc?.etf_count ? (
          <span>
            BTC {formatBigNum(btc.daily_volume)}{' '}
            <span className={pctColor(btc.avg_change_pct)}>{pctText(btc.avg_change_pct)}</span>
          </span>
        ) : null
      }
      secondary={
        eth?.etf_count ? (
          <span>
            ETH {formatBigNum(eth.daily_volume)}{' '}
            <span className={pctColor(eth.avg_change_pct)}>{pctText(eth.avg_change_pct)}</span>
          </span>
        ) : null
      }
      accent="yellow"
      loading={loading}
      empty={empty}
    />
  );
}

export function MiniCalChip({ data, loading }: { data?: EconCalendarEvent[] | null; loading?: boolean }) {
  const empty = !loading && (!data || data.length === 0);
  const next = data?.[0];
  const second = data?.[1];

  return (
    <Chip
      icon="📅"
      title="Bugünün Takvimi"
      primary={
        next ? (
          <span>
            <span className="text-[#4fc3f7] font-mono">{timeShort(next.date)}</span> {flagFor(next.country)}{' '}
            {next.event}
          </span>
        ) : null
      }
      secondary={
        second ? (
          <span>
            {timeShort(second.date)} {flagFor(second.country)} {second.event}
          </span>
        ) : null
      }
      accent="blue"
      loading={loading}
      empty={empty}
      tooltip={next?.event}
    />
  );
}

export function MiniMoversChip({ data, loading }: { data?: PreMarketMovers | null; loading?: boolean }) {
  const empty = !loading && (!data || (!data.gainers.length && !data.losers.length));
  const topGain = data?.gainers?.[0];
  const topLose = data?.losers?.[0];

  return (
    <Chip
      icon="🚀"
      title="Pre-Market"
      primary={
        topGain ? (
          <span>
            <span className="text-[#26a69a]">▲</span> {topGain.symbol}{' '}
            <span className={pctColor(topGain.change_pct)}>{pctText(topGain.change_pct)}</span>
          </span>
        ) : null
      }
      secondary={
        topLose ? (
          <span>
            <span className="text-[#ef5350]">▼</span> {topLose.symbol}{' '}
            <span className={pctColor(topLose.change_pct)}>{pctText(topLose.change_pct)}</span>
          </span>
        ) : null
      }
      accent="green"
      loading={loading}
      empty={empty}
    />
  );
}

export function MiniEarningsChip({ data, loading }: { data?: EarningItem[] | null; loading?: boolean }) {
  const empty = !loading && (!data || data.length === 0);
  const count = data?.length || 0;
  const symbols = data?.slice(0, 3).map((e) => e.symbol).join(' · ');

  return (
    <Chip
      icon="📊"
      title="Bugün Bilançolar"
      primary={count > 0 ? `${count} şirket bugün açıklayacak` : null}
      secondary={symbols}
      accent="yellow"
      loading={loading}
      empty={empty}
    />
  );
}

export function MiniSectorChip({ data, loading }: { data?: SectorPerformance[] | null; loading?: boolean }) {
  const empty = !loading && (!data || data.length === 0);
  const top = data?.[0];
  const bottom = data?.[data.length - 1];

  return (
    <Chip
      icon="🔥"
      title="Sektör Lideri"
      primary={
        top ? (
          <span>
            🟢 {top.sector}{' '}
            <span className={pctColor(top.change_pct)}>{pctText(top.change_pct)}</span>
          </span>
        ) : null
      }
      secondary={
        bottom && bottom !== top ? (
          <span>
            🔴 {bottom.sector}{' '}
            <span className={pctColor(bottom.change_pct)}>{pctText(bottom.change_pct)}</span>
          </span>
        ) : null
      }
      accent="green"
      loading={loading}
      empty={empty}
    />
  );
}

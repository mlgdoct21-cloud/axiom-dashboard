'use client';

/**
 * Compact mini-chip components for the dashboard summary.
 * Digest chip'leri (Risk Radar / Portföy Sinyal) + 6 FMP panel chip + makro/onchain.
 * Kantitatif chip kaldırıldı (Day 28 part 5 — sektör verisi zaten ayrı chip'te).
 */

import React from 'react';
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
import { useOnChain } from '@/hooks/useOnChain';
import {
  useCorporateSynthesis,
  type CorporateResponse,
  type FullSynthesis,
} from '@/hooks/useCorporateSynthesis';

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
  /** Optional 3rd line for forward-looking/preview info (e.g. "Sırada: NFP 8 May"). */
  tertiary?: React.ReactNode;
  accent?: 'red' | 'yellow' | 'green' | 'blue' | 'gray';
  loading?: boolean;
  empty?: boolean;
  tooltip?: string;
  onClick?: () => void;
}

const accentMap: Record<NonNullable<ChipProps['accent']>, { border: string; dot: string }> = {
  red:    { border: 'border-l-[#ef5350]', dot: 'bg-[#ef5350]' },
  yellow: { border: 'border-l-[#ffa726]', dot: 'bg-[#ffa726]' },
  green:  { border: 'border-l-[#26a69a]', dot: 'bg-[#26a69a]' },
  blue:   { border: 'border-l-[#4fc3f7]', dot: 'bg-[#4fc3f7]' },
  gray:   { border: 'border-l-[#555570]', dot: 'bg-[#555570]' },
};

export function Chip({ icon, title, primary, secondary, tertiary, accent = 'gray', loading, empty, tooltip, onClick }: ChipProps) {
  const { border, dot } = accentMap[accent];
  const interactive = onClick != null;
  const Component = interactive ? 'button' : 'div';
  return (
    <Component
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      title={tooltip}
      className={`text-left w-full bg-[#1a1a2e] border border-[#2a2a3e] border-l-[3px] ${border} rounded px-2.5 py-1.5 min-h-[52px] flex flex-col justify-center transition-all ${
        interactive
          ? 'hover:bg-[#1f1f3a] hover:border-[#4fc3f7]/40 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#4fc3f7]/50'
          : 'cursor-default'
      }`}
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
          {tertiary && (
            <div className="text-[9px] text-[#4fc3f7]/80 leading-tight truncate mt-0.5">{tertiary}</div>
          )}
        </>
      )}
    </Component>
  );
}

// ─── 3 Digest mini chips ─────────────────────────────────────────────────

function colorAccent(color?: string): ChipProps['accent'] {
  if (color === 'red' || color === 'yellow' || color === 'green' || color === 'blue') {
    return color;
  }
  return 'gray';
}

export function DigestRiskChip({ card, loading, onClick }: { card?: DailyDigestCard; loading?: boolean; onClick?: () => void }) {
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
      onClick={onClick}
    />
  );
}

// DigestQuantChip removed (Day 28 part 5) — sektör verisi zaten MiniSectorChip'te,
// earnings sayısı MiniEarningsChip'te. Kullanıcı geri-bildirimi: çıktı jenerik
// ve aksiyon önermiyordu, sektör baskısı Risk Radar modal'ına entegre edildi.

export function DigestPortfolioChip({ card, loading, onClick }: { card?: DailyDigestCard; loading?: boolean; onClick?: () => void }) {
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
      onClick={onClick}
    />
  );
}

// ─── 6 FMP panel mini chips ──────────────────────────────────────────────

export function MiniOvernightChip({ data, loading, onClick }: { data?: OvernightMarkets | null; loading?: boolean; onClick?: () => void }) {
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
      onClick={onClick}
    />
  );
}

function signedUsd(v?: number): string {
  if (v == null || !isFinite(v)) return '—';
  const abs = formatBigNum(Math.abs(v));
  return v >= 0 ? `+${abs}` : `-${abs}`;
}

function signedCoin(v?: number, coin?: string): string {
  if (v == null || !isFinite(v) || !coin) return '—';
  const abs = Math.abs(v);
  const formatted =
    abs >= 1000 ? abs.toFixed(0) : abs >= 100 ? abs.toFixed(1) : abs.toFixed(2);
  return v >= 0 ? `+${formatted} ${coin}` : `-${formatted} ${coin}`;
}

function flowColor(v?: number): string {
  if (v == null || !isFinite(v) || v === 0) return 'text-[#8888a0]';
  return v > 0 ? 'text-[#26a69a]' : 'text-[#ef5350]';
}

function EtfRow({ label, coin, agg }: { label: string; coin: string; agg?: EtfFlows['btc'] }) {
  if (!agg?.etf_count) return null;
  const flow = agg.net_flow_usd ?? 0;
  const coins = agg.net_flow_coins ?? 0;
  const color = flowColor(flow);
  return (
    <span>
      {label}{' '}
      <span className={`font-semibold ${color}`}>{signedUsd(flow)}</span>{' '}
      <span className="text-[#8888a0]">{signedCoin(coins, coin)}</span>
    </span>
  );
}

export function MiniEtfChip({ data, loading, onClick }: { data?: EtfFlows | null; loading?: boolean; onClick?: () => void }) {
  const empty = !loading && (!data || (!data.btc.etf_count && !data.eth.etf_count));
  const btc = data?.btc;
  const eth = data?.eth;

  // Renk: toplam BTC+ETH net flow yönüne göre
  const totalFlow = (btc?.net_flow_usd ?? 0) + (eth?.net_flow_usd ?? 0);
  const accent: ChipProps['accent'] =
    totalFlow > 0 ? 'green' : totalFlow < 0 ? 'red' : 'yellow';

  return (
    <Chip
      icon="₿"
      title="Spot ETF Net Akış"
      primary={btc?.etf_count ? <EtfRow label="BTC" coin="BTC" agg={btc} /> : null}
      secondary={eth?.etf_count ? <EtfRow label="ETH" coin="ETH" agg={eth} /> : null}
      accent={accent}
      loading={loading}
      empty={empty}
      onClick={onClick}
    />
  );
}

export function MiniCalChip({ data, loading, onClick }: { data?: EconCalendarEvent[] | null; loading?: boolean; onClick?: () => void }) {
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
      onClick={onClick}
    />
  );
}

export function MiniMoversChip({ data, loading, onClick }: { data?: PreMarketMovers | null; loading?: boolean; onClick?: () => void }) {
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
      onClick={onClick}
    />
  );
}

export function MiniEarningsChip({ data, loading, onClick }: { data?: EarningItem[] | null; loading?: boolean; onClick?: () => void }) {
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
      onClick={onClick}
    />
  );
}

export function MiniSectorChip({ data, loading, onClick }: { data?: SectorPerformance[] | null; loading?: boolean; onClick?: () => void }) {
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
      onClick={onClick}
    />
  );
}

// ─── 10. PANEL: VIX VOLATİLİTE ENDEKSİ ──────────────────────────────────

export function MiniVixChip({
  data,
  loading,
  onClick,
}: {
  data?: FearIndices | null;
  loading?: boolean;
  onClick?: () => void;
}) {
  const vix = data?.vix;
  const fng = data?.crypto_fng;
  const empty = !loading && !vix;

  return (
    <Chip
      icon="🌡️"
      title="VIX Volatilite"
      primary={
        vix ? (
          <span>
            <span className="font-mono text-[13px] font-semibold">{vix.current}</span>{' '}
            <span className="text-[#8888a0]">({vix.label})</span>{' '}
            <span className={pctColor(vix.change_pct)}>{pctText(vix.change_pct)}</span>
          </span>
        ) : null
      }
      secondary={
        fng ? (
          <span>
            Kripto F&amp;G: <span className="font-mono">{fng.value}</span> ({fng.label})
          </span>
        ) : null
      }
      accent={(vix?.color as ChipProps['accent']) || 'gray'}
      loading={loading}
      empty={empty}
      onClick={onClick}
    />
  );
}

// ─── 11. PANEL: MACRO PULSE (Fed/CPI/NFP narrative) ─────────────────────

const _MACRO_EMOJI: Record<string, string> = {
  CPI: '📊',
  NFP: '👷',
  PCE: '📈',
  FOMC_STATEMENT: '🏛️',
  FOMC_MINUTES: '📜',
  FOMC_PROJECTIONS: '🔮',
  RATE_DECISION: '⚖️',
};

const _MACRO_LABEL: Record<string, string> = {
  CPI: 'CPI',
  NFP: 'NFP',
  PCE: 'PCE',
  FOMC_STATEMENT: 'FOMC',
  FOMC_MINUTES: 'FOMC Tutanak',
  FOMC_PROJECTIONS: 'FOMC SEP',
  RATE_DECISION: 'Faiz Kararı',
};

function _macroAccent(score: number | null | undefined): ChipProps['accent'] {
  if (score == null) return 'gray';
  if (score >= 0.66) return 'green';
  if (score <= 0.33) return 'red';
  return 'yellow';
}

function _macroAgeText(releasedAt: string | null | undefined): string {
  if (!releasedAt) return '';
  try {
    const t = new Date(releasedAt).getTime();
    const diffMin = Math.floor((Date.now() - t) / 60000);
    if (diffMin < 60) return `${diffMin}dk önce`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 48) return `${diffH}sa önce`;
    return `${Math.floor(diffH / 24)}g önce`;
  } catch {
    return '';
  }
}

const _UPCOMING_LABEL: Record<string, string> = {
  CPI: 'CPI',
  NFP: 'NFP',
  PCE: 'PCE',
  FOMC_DECISION: 'FOMC',
};

const _TR_MONTH_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function _formatUpcomingShort(scheduledAt: string): string {
  const d = new Date(scheduledAt);
  return `${d.getUTCDate()} ${_TR_MONTH_SHORT[d.getUTCMonth()]}`;
}

function _daysUntilShort(scheduledAt: string): string {
  const ms = new Date(scheduledAt).getTime() - Date.now();
  const days = Math.floor(ms / 86400000);
  if (days <= 0) return 'bugün';
  if (days === 1) return 'yarın';
  return `${days}g`;
}

export function MiniMacroChip({
  release,
  loading,
  onClick,
}: {
  release?: MacroRelease | null;
  loading?: boolean;
  onClick?: () => void;
}) {
  // Pull next event from the same merged calendar the modal uses. Hook caches
  // 5min and polls 10min so adding a second consumer here is cheap.
  const { data: upcoming } = useMacroUpcoming(true, { days: 30, limit: 1 });
  const nextEvent = upcoming?.events?.[0] ?? null;
  const empty = !loading && !release;
  const et = (release?.event_type || '').toUpperCase();
  const emoji = _MACRO_EMOJI[et] || '🌐';
  const label = _MACRO_LABEL[et] || et || 'Makro';
  const ageText = _macroAgeText(release?.released_at);
  const narrative = release?.narrative_md?.slice(0, 70) || '';

  // Tertiary = next upcoming event, e.g. "📅 Sırada: NFP — yarın (8 May)".
  const tertiary = nextEvent ? (
    <span>
      📅 Sırada:{' '}
      <span className="font-medium text-[#e0e0e0]">
        {_UPCOMING_LABEL[nextEvent.event_type] || nextEvent.event_type}
      </span>{' '}
      — {_daysUntilShort(nextEvent.scheduled_at)} ({_formatUpcomingShort(nextEvent.scheduled_at)})
    </span>
  ) : null;

  return (
    <Chip
      icon={emoji}
      title="Makro Pulse"
      primary={
        release ? (
          <span>
            <span className="font-semibold">{label}</span>
            {ageText && <span className="text-[#8888a0]"> · {ageText}</span>}
          </span>
        ) : null
      }
      secondary={narrative ? <span title={release?.narrative_md || ''}>{narrative}…</span> : null}
      tertiary={tertiary}
      accent={_macroAccent(release?.sentiment_score)}
      loading={loading}
      empty={empty}
      onClick={onClick}
      tooltip={release?.narrative_md || undefined}
    />
  );
}

// ─── On-Chain Mini Chip (CryptoQuant) ────────────────────────────────────

function _onchainAccent(overall?: string): ChipProps['accent'] {
  if (overall === 'BULLISH') return 'green';
  if (overall === 'BEARISH') return 'red';
  if (overall === 'MIXED')   return 'yellow';
  return 'gray';
}

export function MiniOnChainChip({
  onClick,
  onData,
}: {
  onClick?: () => void;
  onData?: (snapshot: ReturnType<typeof useOnChain>['data']) => void;
}) {
  const { data, loading, error } = useOnChain('BTC');
  const empty = !loading && (!data || !data.signals || Object.keys(data.signals || {}).length === 0);

  React.useEffect(() => {
    if (onData) onData(data);
  }, [data, onData]);

  // Headline = exchange netflow signal (most actionable)
  const netflowSig = data?.signals?.exchange_netflow;
  const whaleSig   = data?.signals?.whale_ratio;

  if (error && error === 'cryptoquant_not_configured') {
    return (
      <Chip
        icon="🔗"
        title="On-Chain"
        primary={<span className="text-[#8888a0]">Yakında</span>}
        secondary="CryptoQuant verisi"
        accent="gray"
        empty={false}
        loading={false}
      />
    );
  }

  return (
    <Chip
      icon="🔗"
      title="On-Chain"
      primary={
        netflowSig ? (
          <span>
            <span className="font-semibold">{netflowSig.value_str}</span>
          </span>
        ) : null
      }
      secondary={
        netflowSig ? (
          <span>{netflowSig.label_tr}</span>
        ) : null
      }
      tertiary={
        whaleSig ? (
          <span>🐋 Balina {whaleSig.value_str} · {whaleSig.label_tr}</span>
        ) : data?.overall_tr ? (
          <span>{data.overall_tr}</span>
        ) : null
      }
      accent={_onchainAccent(data?.overall)}
      loading={loading}
      empty={empty}
      tooltip={data?.overall_tr || 'BTC on-chain sinyaller (CryptoQuant)'}
      onClick={onClick}
    />
  );
}

// ─── AXIOM Kurumsal Sentez Mini Chip ─────────────────────────────────────
// Eskiden inline tam kart idi; dikeyde çok yer kapladığı için diğer 10
// kalemle tutarlı compact chip'e dönüştürüldü. Tıklanınca tam içerik
// (locked teaser + upgrade veya tam synthesis_md) SummaryDetailModal'da açılır.
// Veriyi onData ile parent'a kaldırır → modal aynı objeyi kullanır, tek fetch.

function _firstSynthLine(md: string): string {
  for (const raw of md.split('\n')) {
    const t = raw.trim();
    if (!t || t === '---') continue;
    if (t.startsWith('## ')) continue;
    return t.startsWith('- ') ? t.slice(2) : t;
  }
  return md.trim().slice(0, 90);
}

export function MiniCorporateChip({
  onClick,
  onData,
}: {
  onClick?: () => void;
  onData?: (data: CorporateResponse | null) => void;
}) {
  const { data, loading } = useCorporateSynthesis();

  React.useEffect(() => {
    if (onData) onData(data);
  }, [data, onData]);

  const week = data?.week_start ? `Hafta ${data.week_start}` : undefined;

  // synthesis === null → henüz üretilmedi (boş durum, ama tıklanınca modal
  // açıklamayı gösterir — onClick yine de bağlı kalır).
  if (data && !data.error && data.synthesis === null) {
    return (
      <Chip
        icon="🏛️"
        title="Kurumsal Sentez"
        primary="Henüz üretilmedi"
        secondary="Her Pazartesi 08:30"
        accent="gray"
        loading={loading}
        onClick={onClick}
        tooltip="Haftalık AXIOM kurumsal makro sentez"
      />
    );
  }

  if (data?.locked) {
    return (
      <Chip
        icon="🏛️"
        title="Kurumsal Sentez"
        primary={<span>🔒 Premium&apos;a özel</span>}
        secondary={week || 'Haftalık kurumsal makro sentez'}
        accent="yellow"
        loading={loading}
        onClick={onClick}
        tooltip="Tam haftalık kurumsal sentez Premium/Advance üyelere açıktır"
      />
    );
  }

  const full = data?.synthesis as FullSynthesis | undefined;
  const preview = full?.synthesis_md ? _firstSynthLine(full.synthesis_md) : null;

  return (
    <Chip
      icon="🏛️"
      title="Kurumsal Sentez"
      primary={preview}
      secondary={week}
      accent="blue"
      loading={loading}
      empty={!loading && !preview}
      onClick={onClick}
      tooltip={preview || 'Haftalık AXIOM kurumsal makro sentez'}
    />
  );
}


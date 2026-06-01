'use client';

/**
 * Compact Dashboard Summary — kompakt mini chip grid.
 *   • 2 digest chip (Risk Radar / Portföy Sinyal)   [Kantitatif kaldırıldı]
 *   • 6 FMP panel chip (Overnight, ETF, Calendar, Movers, Earnings, Sectors)
 *   • 1 Korku Barometresi (VIX + Crypto F&G)
 *   • 1 Makro Pulse + 1 BTC On-Chain
 *
 * Kart tıklanınca tam içeriği gösteren modal açılır.
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDailyDigest } from '@/hooks/useDailyDigest';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import { useMacroLatest, useMacroUpcoming } from '@/hooks/useMacroLatest';
import type { OnChainSnapshot } from '@/lib/cryptoquant';
import {
  DigestRiskChip,
  DigestPortfolioChip,
  MiniEtfChip,
  MiniCalChip,
  MiniMoversChip,
  MiniEarningsChip,
  MiniSectorChip,
  MiniVixChip,
  MiniMacroChip,
  MiniOnChainChip,
  MiniCorporateChip,
} from './SummaryPanels';
import { SummaryDetailModal, type ModalContent } from './SummaryDetailModal';
import type { CorporateResponse } from '@/hooks/useCorporateSynthesis';

export function DashboardSummary() {
  const { digest, loading: digestLoading, error: digestError } = useDailyDigest(true);
  const { data, loading, error, refresh } = useDashboardSummary(true);
  const { data: macroData, loading: macroLoading } = useMacroLatest(true);
  // 2026-05-22: Risk Radar chip'ine sıradaki event etiketi için.
  const { data: macroUpcoming } = useMacroUpcoming(true, { days: 7, limit: 5 });
  // 2026-05-22: Makro Pulse chip'ine Global Likidite (Fed M2 + ECB) için.
  const [liquidity, setLiquidity] = useState<{ value_trn: number; ch_30d_pct: number; trend: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/macro/liquidity');
        if (!r.ok) return;
        const body = await r.json();
        if (cancelled || body.error) return;
        setLiquidity({
          value_trn: body.value_trn,
          ch_30d_pct: body.ch_30d_pct,
          trend: body.trend,
        });
      } catch { /* sessiz — Makro Pulse'da likidite görünmez */ }
    })();
    return () => { cancelled = true; };
  }, []);
  const [modal, setModal] = useState<ModalContent | null>(null);
  const [onchainData, setOnchainData] = useState<OnChainSnapshot | null>(null);
  const [corpData, setCorpData] = useState<CorporateResponse | null>(null);
  // 2026-06-01: Mobilde 11 chip yığını haber listesini ekran altına itiyor.
  // Default kapalı; md:block ile desktop'ta her zaman açık.
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const ageText = (() => {
    if (!data?.last_updated) return '';
    try {
      const updated = new Date(data.last_updated);
      const diffMin = Math.floor((Date.now() - updated.getTime()) / 60000);
      if (diffMin < 1) return 'şimdi';
      if (diffMin < 60) return `${diffMin}dk`;
      return `${Math.floor(diffMin / 60)}sa`;
    } catch {
      return '';
    }
  })();

  const hasAnyError = digestError || error;

  // onClick handler'ları: chip → modal aç
  const open = (c: ModalContent) => setModal(c);
  const close = () => setModal(null);

  // Telegram story-push deep-link: /tr?event=fred:CPI:2026-03-01 → fetch the
  // release by event_id and auto-open the macro modal. Runs once on mount;
  // gated by searchParams.get('event') so chip clicks remain the primary path.
  const searchParams = useSearchParams();
  const deepLinkEventId = searchParams.get('event');
  useEffect(() => {
    if (!deepLinkEventId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/macro/release/${encodeURIComponent(deepLinkEventId)}`);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled || !json?.release) return;
        setModal({
          type: 'macro',
          data: json.release,
          core: json.core_release ?? null,
        });
      } catch (e) {
        console.warn('[deep-link] macro release fetch failed:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [deepLinkEventId]);

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMobileExpanded(v => !v)}
          className="flex items-center gap-2 min-w-0 md:cursor-default"
          aria-expanded={mobileExpanded}
        >
          <span className="text-sm font-semibold text-[#e0e0e0] whitespace-nowrap">
            🌙 Sen Uyurken Piyasada
          </span>
          <span className="md:hidden text-[10px] text-[#4fc3f7]">
            {mobileExpanded ? '▲ gizle' : '▼ 11 modül'}
          </span>
          {hasAnyError && (
            <span
              title="Bazı verileri çekemedik (backend offline olabilir)"
              className="text-[9px] px-1.5 py-0.5 rounded bg-[#ef5350]/15 text-[#ef5350] border border-[#ef5350]/30 whitespace-nowrap"
            >
              ⚠ kısmi veri
            </span>
          )}
        </button>
        <button
          onClick={refresh}
          disabled={loading || digestLoading}
          className="text-[10px] text-[#4fc3f7] hover:text-[#ff9800] disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
          title="Yenile"
        >
          {loading || digestLoading ? '⟳' : '↻'} {ageText}
        </button>
      </div>

      {/* 11-chip compact grid (6 col × 2 row at lg) — son chip: Kurumsal Sentez.
          Mobilde default kapalı; tıklayınca açılır. md:grid ile desktop'ta her zaman görünür. */}
      <div className={`${mobileExpanded ? 'grid' : 'hidden'} md:grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5`}>
        <DigestRiskChip
          card={digest?.risk_radar}
          loading={digestLoading && !digest}
          // 2026-05-22: Makro risk göstergesi tertiary satırı.
          macroSnap={(() => {
            const reaction = macroData?.release?.market_reaction;
            const snap = reaction?.snapshot;
            if (!snap) return null;
            return {
              dxy: snap.dxy ?? null,
              us10y: snap.us10y ?? null,
              dxy_dir: (reaction?.dxy_change_pct ?? 0) >= 0 ? 'up' : 'down',
              us10y_dir: (reaction?.us10y_change_bp ?? 0) >= 0 ? 'up' : 'down',
            };
          })()}
          nextEventLabel={(() => {
            const ev = macroUpcoming?.events?.[0];
            if (!ev) return undefined;
            try {
              const when = new Date(ev.scheduled_at).toLocaleString('tr-TR', {
                day: '2-digit',
                month: 'short',
              });
              const name = (ev.label || ev.event_type || '').slice(0, 14);
              return `${name} ${when}`;
            } catch {
              return undefined;
            }
          })()}
          onClick={
            digest?.risk_radar
              ? () =>
                  open({
                    type: 'risk',
                    data: digest.risk_radar,
                    vix: digest.vix ?? null,
                    overnight: data?.overnight_markets ?? null,
                    onchain: onchainData ?? null,
                    sectors: data?.sector_performance ?? null,
                  })
              : undefined
          }
        />
        <DigestPortfolioChip
          card={digest?.portfolio_signal}
          loading={digestLoading && !digest}
          onClick={
            digest?.portfolio_signal
              ? () => open({ type: 'portfolio', data: digest.portfolio_signal })
              : undefined
          }
        />
        {/* MiniOvernightChip 2026-05-12 itibarıyla gizlendi: FMP Starter plan
            Asya/Avrupa endekslerini 402 reddediyor; veri üst ticker tape'e
            taşındı (12 endeks + Yahoo fallback). Modal/types intact, ileride
            FMP Ultimate'a çıkılırsa veya alternatif kaynakla geri açılabilir. */}
        <MiniEtfChip
          data={data?.etf_flows}
          loading={loading && !data}
          onClick={data?.etf_flows ? () => open({ type: 'etf', data: data.etf_flows }) : undefined}
        />
        <MiniCalChip
          data={data?.economic_calendar}
          loading={loading && !data}
          onClick={
            data?.economic_calendar
              ? () => open({ type: 'calendar', data: data.economic_calendar })
              : undefined
          }
        />
        <MiniMoversChip
          data={data?.premarket_movers}
          loading={loading && !data}
          onClick={
            data?.premarket_movers
              ? () => open({ type: 'movers', data: data.premarket_movers })
              : undefined
          }
        />
        <MiniEarningsChip
          data={data?.earnings_today}
          loading={loading && !data}
          onClick={
            data?.earnings_today
              ? () => open({ type: 'earnings', data: data.earnings_today })
              : undefined
          }
        />
        <MiniSectorChip
          data={data?.sector_performance}
          loading={loading && !data}
          onClick={
            data?.sector_performance
              ? () => open({ type: 'sectors', data: data.sector_performance })
              : undefined
          }
        />
        <MiniVixChip
          data={data?.fear_indices}
          loading={loading && !data}
          onClick={
            data?.fear_indices
              ? () => open({ type: 'vix', data: data.fear_indices! })
              : undefined
          }
        />
        <MiniMacroChip
          release={macroData?.release}
          loading={macroLoading && !macroData}
          liquidity={liquidity}
          onClick={
            macroData?.release
              ? () => open({ type: 'macro', data: macroData.release!, core: macroData.core_release ?? null })
              : undefined
          }
        />
        <MiniOnChainChip
          onData={setOnchainData}
          onClick={
            onchainData
              ? () => open({ type: 'onchain', data: onchainData })
              : undefined
          }
        />
        <MiniCorporateChip
          onData={setCorpData}
          onClick={
            corpData && !corpData.error
              ? () => open({ type: 'corporate', data: corpData })
              : undefined
          }
        />
      </div>

      {/* Detail modal */}
      <SummaryDetailModal content={modal} onClose={close} />
    </div>
  );
}

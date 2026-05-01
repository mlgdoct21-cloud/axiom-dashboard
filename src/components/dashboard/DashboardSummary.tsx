'use client';

/**
 * Compact Dashboard Summary — 10 mini chip'lik kompakt grid.
 *   • 3 digest chip (Risk Radar / Kantitatif / Portföy Sinyal)
 *   • 6 FMP panel chip (Overnight, ETF, Calendar, Movers, Earnings, Sectors)
 *   • 1 Korku Barometresi (VIX + Crypto F&G)
 *
 * Kart tıklanınca tam içeriği gösteren modal açılır.
 * Toplam yükseklik ~140px (lg: 2 row × 5 col).
 */

import React, { useState } from 'react';
import { useDailyDigest } from '@/hooks/useDailyDigest';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import {
  DigestRiskChip,
  DigestQuantChip,
  DigestPortfolioChip,
  MiniOvernightChip,
  MiniEtfChip,
  MiniCalChip,
  MiniMoversChip,
  MiniEarningsChip,
  MiniSectorChip,
  MiniVixChip,
} from './SummaryPanels';
import { SummaryDetailModal, type ModalContent } from './SummaryDetailModal';

export function DashboardSummary() {
  const { digest, loading: digestLoading, error: digestError } = useDailyDigest(true);
  const { data, loading, error, refresh } = useDashboardSummary(true);
  const [modal, setModal] = useState<ModalContent | null>(null);

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

  return (
    <div className="space-y-1.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-[#e0e0e0] whitespace-nowrap">
            🌙 Sen Uyurken Piyasada
          </span>
          {hasAnyError && (
            <span
              title="Bazı verileri çekemedik (backend offline olabilir)"
              className="text-[9px] px-1.5 py-0.5 rounded bg-[#ef5350]/15 text-[#ef5350] border border-[#ef5350]/30 whitespace-nowrap"
            >
              ⚠ kısmi veri
            </span>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={loading || digestLoading}
          className="text-[10px] text-[#4fc3f7] hover:text-[#ff9800] disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
          title="Yenile"
        >
          {loading || digestLoading ? '⟳' : '↻'} {ageText}
        </button>
      </div>

      {/* 10-chip compact grid (5 col × 2 row at lg) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
        <DigestRiskChip
          card={digest?.risk_radar}
          loading={digestLoading && !digest}
          onClick={
            digest?.risk_radar ? () => open({ type: 'risk', data: digest.risk_radar }) : undefined
          }
        />
        <DigestQuantChip
          card={digest?.quant_analysis}
          loading={digestLoading && !digest}
          onClick={
            digest?.quant_analysis
              ? () => open({ type: 'quant', data: digest.quant_analysis })
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
        <MiniOvernightChip
          data={data?.overnight_markets}
          loading={loading && !data}
          onClick={
            data?.overnight_markets
              ? () => open({ type: 'overnight', data: data.overnight_markets })
              : undefined
          }
        />
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
      </div>

      {/* Detail modal */}
      <SummaryDetailModal content={modal} onClose={close} />
    </div>
  );
}

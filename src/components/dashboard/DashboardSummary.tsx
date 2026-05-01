'use client';

/**
 * Compact Dashboard Summary — tek bir kompakt grid'de 9 mini chip:
 *   • 3 digest chip (Risk Radar / Kantitatif / Portföy Sinyal)
 *   • 6 FMP panel chip (Overnight, ETF, Calendar, Movers, Earnings, Sectors)
 *
 * Toplam yükseklik ~140px (lg: 2 row × 5 col). Haberler için bolca yer kalır.
 */

import React from 'react';
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
} from './SummaryPanels';

export function DashboardSummary() {
  const { digest, loading: digestLoading, error: digestError } = useDailyDigest(true);
  const { data, loading, error, refresh } = useDashboardSummary(true);

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
  const allEmpty =
    !digestLoading &&
    !loading &&
    !digest &&
    !data;

  return (
    <div className="space-y-1.5">
      {/* Header row — başlık + status + refresh */}
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
          onClick={() => {
            refresh();
          }}
          disabled={loading || digestLoading}
          className="text-[10px] text-[#4fc3f7] hover:text-[#ff9800] disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
          title="Yenile"
        >
          {loading || digestLoading ? '⟳' : '↻'} {ageText}
        </button>
      </div>

      {/* 9-chip compact grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
        <DigestRiskChip card={digest?.risk_radar} loading={digestLoading && !digest} />
        <DigestQuantChip card={digest?.quant_analysis} loading={digestLoading && !digest} />
        <DigestPortfolioChip card={digest?.portfolio_signal} loading={digestLoading && !digest} />
        <MiniOvernightChip data={data?.overnight_markets} loading={loading && !data} />
        <MiniEtfChip data={data?.etf_flows} loading={loading && !data} />
        <MiniCalChip data={data?.economic_calendar} loading={loading && !data} />
        <MiniMoversChip data={data?.premarket_movers} loading={loading && !data} />
        <MiniEarningsChip data={data?.earnings_today} loading={loading && !data} />
        <MiniSectorChip data={data?.sector_performance} loading={loading && !data} />
      </div>
    </div>
  );
}

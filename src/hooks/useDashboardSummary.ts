'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────

export interface IndexQuote {
  symbol: string;
  label: string;
  flag: string;
  price: number;
  change: number;
  change_pct: number;
  trend: 'up' | 'down';
}

export interface OvernightMarkets {
  asia: IndexQuote[];
  europe: IndexQuote[];
  us_futures: IndexQuote[];
}

export interface EtfFlowAggregate {
  total_aum: number;
  daily_volume: number;
  avg_change_pct: number;
  etf_count: number;
  top_etf?: { symbol: string; aum: number } | null;
  /** Daily net inflow in USD, signed (+ = net giriş, - = net çıkış) */
  net_flow_usd?: number;
  /** Coin-equivalent of net_flow_usd (BTC for btc, ETH for eth) */
  net_flow_coins?: number;
  /** Spot price used for the coin conversion */
  coin_price?: number;
  /** Source label (bitbo, coinglass_manual, coinglass_playwright, fmp, …) */
  source?: string;
  /** ISO 8601 UTC timestamp of when the cached row was written */
  scraped_at?: string | null;
  /** Computed age in hours from scraped_at to now */
  age_hours?: number | null;
  /** True if scraped_at <= 25h old */
  is_fresh?: boolean;
  /** True if scraped_at > 25h old (still ≤7d, served as last-known-good) */
  is_stale?: boolean;
}

export interface EtfFlows {
  btc: EtfFlowAggregate;
  eth: EtfFlowAggregate;
}

export interface EconCalendarEvent {
  country: string;
  event: string;
  date: string;
  impact: string;
  actual?: string | number | null;
  previous?: string | number | null;
  estimate?: string | number | null;
  currency?: string;
}

export interface MoverItem {
  symbol: string;
  name?: string;
  price?: number;
  change?: number;
  change_pct?: number;
}

export interface PreMarketMovers {
  gainers: MoverItem[];
  losers: MoverItem[];
  actives: MoverItem[];
}

export interface EarningItem {
  symbol: string;
  date: string;
  time?: string; // bmo / amc / dmh
  eps_estimate?: number;
  eps_actual?: number;
  revenue_estimate?: number;
}

export interface SectorPerformance {
  sector: string;
  change_pct: number;
  trend: 'up' | 'down';
}

export interface VixData {
  current: number;
  label: string;
  color: 'red' | 'yellow' | 'green';
  change_pct: number;
  prev_close: number;
}

export interface CryptoFng {
  value: number;          // 0-100
  label: string;          // TR
  label_en?: string;
  color: 'red' | 'yellow' | 'green';
  prev_value?: number;
  change?: number;
}

export interface FearIndices {
  vix: VixData | null;
  crypto_fng: CryptoFng | null;
}

export interface DashboardSummaryData {
  overnight_markets: OvernightMarkets;
  etf_flows: EtfFlows;
  economic_calendar: EconCalendarEvent[];
  premarket_movers: PreMarketMovers;
  earnings_today: EarningItem[];
  sector_performance: SectorPerformance[];
  fear_indices?: FearIndices;
  last_updated: string;
  cache_status?: 'hit' | 'miss' | 'stale';
  cache_age_sec?: number;
}

// ─── Hook ───────────────────────────────────────────────────────────────

interface UseDashboardSummaryReturn {
  data: DashboardSummaryData | null;
  loading: boolean;
  error: Error | null;
  lastRefresh: Date | null;
  refresh: () => void;
}

/**
 * 6-panel dashboard summary'sini her 5 dakikada bir çeker.
 * Backend cache 5 dk olduğu için interval matched.
 */
export function useDashboardSummary(enabled: boolean = true): UseDashboardSummaryReturn {
  const [data, setData] = useState<DashboardSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/dashboard-summary');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const json = (await res.json()) as DashboardSummaryData;
      setData(json);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      console.error('[useDashboardSummary]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [enabled, fetchData]);

  return { data, loading, error, lastRefresh, refresh: fetchData };
}

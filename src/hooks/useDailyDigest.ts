'use client';

import { useState, useEffect, useCallback } from 'react';

export interface DailyDigestCard {
  title: string;
  analysis?: string;
  trigger?: string;
  recommendation?: string;
  symbols?: string[];
  color?: 'red' | 'yellow' | 'green' | 'blue';
}

export interface DailyDigestData {
  risk_radar: DailyDigestCard;
  quant_analysis: DailyDigestCard;
  portfolio_signal: DailyDigestCard;
  last_updated: string;
  status?: 'ok' | 'degraded';
}

interface UseDailyDigestReturn {
  digest: DailyDigestData | null;
  loading: boolean;
  error: Error | null;
  lastRefresh: Date | null;
}

/**
 * Hook for fetching daily digest data every 5 minutes.
 * Combines breaking news + market insights into 3 cards:
 * 1. Risk Radar - macro risks, volatility
 * 2. Quantitative Analysis - technical signals
 * 3. Portfolio Signal - recommended positions
 */
export function useDailyDigest(enabled: boolean = true): UseDailyDigestReturn {
  const [digest, setDigest] = useState<DailyDigestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchDigest = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/daily-digest', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = (await res.json()) as DailyDigestData;
      setDigest(data);
      setLastRefresh(new Date());

      console.log('[useDailyDigest] Digest fetched successfully', data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error('[useDailyDigest] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;

    // Fetch immediately on mount
    fetchDigest();

    // Then set up 5-minute interval
    const interval = setInterval(fetchDigest, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [enabled, fetchDigest]);

  return {
    digest,
    loading,
    error,
    lastRefresh,
  };
}

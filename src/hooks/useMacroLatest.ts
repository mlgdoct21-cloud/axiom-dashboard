'use client';

import { useState, useEffect, useCallback } from 'react';

export interface MacroRelease {
  event_id: string;
  event_type: string;
  country: string;
  source: string;
  released_at: string | null;
  actual_value: number | null;
  prior_value: number | null;
  mom_pct?: number | null;
  yoy_pct?: number | null;
  prior_mom_pct?: number | null;
  prior_yoy_pct?: number | null;
  expected_mom_pct?: number | null;
  expected_yoy_pct?: number | null;
  surprise_mom_pp?: number | null;
  surprise_yoy_pp?: number | null;
  narrative_md: string | null;
  sentiment_score: number | null;
  source_url: string | null;
  sectors_positive?: string[];
  sectors_negative?: string[];
}

export interface MacroLatestData {
  now: string;
  release: MacroRelease | null;
  core_release?: MacroRelease | null;
}

interface UseMacroLatestReturn {
  data: MacroLatestData | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Fetches the most recent macro release with a generated narrative.
 * Refresh cadence is 5 min: backend cache is 60s and macro releases drop
 * hourly at most, so polling more aggressively buys nothing.
 */
export function useMacroLatest(enabled: boolean = true): UseMacroLatestReturn {
  const [data, setData] = useState<MacroLatestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchLatest = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/macro/latest', { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as MacroLatestData;
      setData(body);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      console.error('[useMacroLatest] fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    fetchLatest();
    const interval = setInterval(fetchLatest, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [enabled, fetchLatest]);

  return { data, loading, error, refresh: fetchLatest };
}

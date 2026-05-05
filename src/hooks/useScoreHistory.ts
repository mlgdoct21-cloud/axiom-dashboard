'use client';

import { useEffect, useState } from 'react';

export interface ScoreHistoryPoint {
  date: string;
  score: number;
  zone: string;
  recorded_at: string;
}

export interface ScoreHistoryResponse {
  symbol: string;
  days: number;
  count: number;
  items: ScoreHistoryPoint[];
}

type Status = 'pending' | 'ok' | 'empty' | 'error';

/**
 * Fetches daily Axiom Score snapshots for the sparkline. Backend upserts one
 * row per (symbol, day) during morning briefing, so the array is short
 * (≤ days) and can be rendered as an SVG polyline directly.
 */
export function useScoreHistory(symbol: string, days = 90) {
  const [status, setStatus] = useState<Status>('pending');
  const [points, setPoints] = useState<ScoreHistoryPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('pending');
    setError(null);

    (async () => {
      try {
        const r = await fetch(
          `/api/crypto/score-history?symbol=${encodeURIComponent(symbol)}&days=${days}`,
          { cache: 'no-store' },
        );
        if (!r.ok) {
          if (!cancelled) {
            setStatus('error');
            setError(`HTTP ${r.status}`);
          }
          return;
        }
        const data = (await r.json()) as ScoreHistoryResponse;
        if (cancelled) return;
        setPoints(data.items ?? []);
        setStatus((data.items?.length ?? 0) >= 2 ? 'ok' : 'empty');
      } catch (e: any) {
        if (!cancelled) {
          setStatus('error');
          setError(e?.message ?? 'fetch_failed');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [symbol, days]);

  return { status, points, error };
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { apiClient } from '@/lib/api';

const CACHE_TTL_MS = 30_000;

export interface QuotaCommandStatus {
  used: number;
  limit: number | null;
  remaining: number | null;
  allowed: boolean;
}

export interface QuotaSummary {
  tier: 'free' | 'premium' | 'advance';
  quotas: Record<string, QuotaCommandStatus>;
  reset_at: string | null;
}

/**
 * Fetches the per-command quota summary for the header badge.
 *
 * Refetches on route change so consuming a quota in another tab
 * (e.g. /dashboard/crypto) updates the global badge once the user
 * navigates away. A 30s in-memory floor prevents thrashing when
 * users click rapidly between sibling routes.
 */
export function useQuotaSummary() {
  const [summary, setSummary] = useState<QuotaSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);
  const pathname = usePathname();

  const fetchSummary = useCallback(async (force = false) => {
    const token = await apiClient.getValidAccessToken();
    if (!token) {
      setSummary(null);
      return;
    }

    const now = Date.now();
    if (!force && now - lastFetchRef.current < CACHE_TTL_MS) return;
    lastFetchRef.current = now;

    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/feature-quota/summary', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!r.ok) {
        setError(`HTTP ${r.status}`);
        return;
      }
      const data = (await r.json()) as QuotaSummary;
      setSummary(data);
    } catch (e: any) {
      setError(e?.message ?? 'fetch_failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary, pathname]);

  return { summary, loading, error, refetch: () => fetchSummary(true) };
}

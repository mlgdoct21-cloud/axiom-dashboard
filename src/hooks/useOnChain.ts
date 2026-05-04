'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchOnChainSnapshot, OnChainSnapshot } from '@/lib/cryptoquant';

interface UseOnChainReturn {
  data: OnChainSnapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useOnChain(symbol: string = 'BTC', enabled: boolean = true): UseOnChainReturn {
  const [data, setData]       = useState<OnChainSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchOnChainSnapshot(symbol);
      if ('error' in res && (!('symbol' in res) || res.error)) {
        setError(res.error || 'fetch_failed');
        setData(null);
      } else {
        setData(res as OnChainSnapshot);
      }
    } catch (e: any) {
      setError(e?.message ?? 'fetch_failed');
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    // Backend cache 4h, edge 30min — re-poll every 15min so the chip
    // picks up scheduler refreshes without spamming the API.
    const interval = setInterval(refresh, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [enabled, refresh]);

  return { data, loading, error, refresh };
}

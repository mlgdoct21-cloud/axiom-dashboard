/**
 * CryptoQuant on-chain snapshot fetcher (frontend).
 * Calls the Next.js proxy at /api/crypto/onchain which forwards to the
 * Railway backend. Backend caches with 4h TTL; we add a 30min edge cache.
 */

export type OnChainSignal = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type OverallSignal = 'BULLISH' | 'BEARISH' | 'MIXED' | 'UNKNOWN';

export interface SignalEntry {
  value_str: string;
  signal: OnChainSignal;
  label_tr: string;
}

export interface OnChainSnapshot {
  symbol: string;
  exchange_netflow?: { netflow_total: number; inflow_total: number; outflow_total: number; date: string };
  whale_ratio?: { whale_ratio: number; date: string };
  miner_outflow?: { outflow_total: number; avg_7d: number; date: string };
  miner_reserve?: { reserve: number; change_7d_pct: number; date: string };
  stablecoin_inflow?: { inflow_total: number; date: string };
  funding_rates?: { latest: number; avg_24h: number; ts: string };
  open_interest?: { open_interest: number; change_pct: number; date: string };
  sopr?: { sopr: number; date: string };
  coinbase_premium?: { coinbase_premium: number; ts: string };
  signals: Record<string, SignalEntry>;
  overall: OverallSignal;
  overall_tr: string;
  fetched_at: string;
  error?: string;
}

export async function fetchOnChainSnapshot(symbol: string = 'BTC'): Promise<OnChainSnapshot | { error: string }> {
  try {
    const res = await fetch(`/api/crypto/onchain?symbol=${encodeURIComponent(symbol)}`, {
      cache: 'no-store',
    });
    if (res.status === 503) {
      return { error: 'cryptoquant_not_configured' };
    }
    if (!res.ok) {
      return { error: `HTTP ${res.status}` };
    }
    return await res.json();
  } catch (e: any) {
    return { error: e?.message ?? 'fetch_failed' };
  }
}

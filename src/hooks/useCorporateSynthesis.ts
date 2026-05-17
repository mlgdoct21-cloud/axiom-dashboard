'use client';

/**
 * useCorporateSynthesis — haftalık AXIOM Kurumsal Sentez fetch hook.
 *
 * /api/corporate/latest proxy backend'de tier-gate eder. axiom_auth
 * localStorage'tan Bearer token forward edilir. Tek fetch; chip compact
 * görünümü + modal tam içerik aynı veriyi paylaşır (mükerrer çağrı yok).
 */

import { useEffect, useState } from 'react';

export interface FullSynthesis {
  event_id: string;
  tier: 'premium' | 'advance';
  synthesis_md: string;
  source_count: number | null;
  generated_at: string | null;
}

export interface LockedSynthesis {
  teaser: string;
  upgrade_cta: string;
}

export interface CorporateResponse {
  now: string;
  tier: 'free' | 'premium' | 'advance';
  locked: boolean;
  week_start: string | null;
  synthesis: FullSynthesis | LockedSynthesis | null;
  error?: string;
}

export function useCorporateSynthesis() {
  const [data, setData] = useState<CorporateResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // loading initial state'i zaten true; effect [] deps ile bir kez koşar →
    // burada setLoading(true) gereksiz (cascading render lint kuralı).
    let cancelled = false;
    const AUTH_KEY = process.env.NEXT_PUBLIC_AUTH_STORAGE_KEY || 'axiom_auth';
    let authToken: string | null = null;
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(AUTH_KEY);
      if (raw) {
        try {
          authToken = JSON.parse(raw)?.access_token ?? null;
        } catch {
          /* corrupt — anon */
        }
      }
    }
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    fetch(`/api/corporate/latest?_=${Date.now()}`, { cache: 'no-store', headers })
      .then(async (r) => {
        const j = await r.json().catch(() => ({ error: 'fetch_failed' }));
        if (!cancelled) setData(j);
      })
      .catch(() => {
        if (!cancelled) setData({ error: 'fetch_failed' } as CorporateResponse);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}

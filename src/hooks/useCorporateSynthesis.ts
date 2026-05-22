'use client';

/**
 * useCorporateSynthesis — haftalık AXIOM Kurumsal Sentez fetch hook.
 *
 * /api/corporate/latest proxy backend'de tier-gate eder. axiom_auth
 * localStorage'tan Bearer token forward edilir. Tek fetch; chip compact
 * görünümü + modal tam içerik aynı veriyi paylaşır (mükerrer çağrı yok).
 */

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';

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

const _MONTHS_TR = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
];

/**
 * "2026-05-11" → "11-17 May 2026" (Pzt–Paz aralığı).
 * week_start her zaman Pazartesi olduğu için +6 gün Pazar.
 * Cron Pzt 08:30 koşumu az önce biten haftayı işler — kart kullanıcıya
 * "Hafta 2026-05-11" diye tek tarih göstermek yerine analiz penceresinin
 * tamamını söylesin diye eklendi.
 */
export function formatCorporateWeek(
  weekStartIso: string | null | undefined,
): string | undefined {
  if (!weekStartIso) return undefined;
  const start = new Date(`${weekStartIso}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return undefined;
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const sMonth = _MONTHS_TR[start.getUTCMonth()];
  const eMonth = _MONTHS_TR[end.getUTCMonth()];
  const year = end.getUTCFullYear();
  if (start.getUTCMonth() === end.getUTCMonth()) {
    return `${start.getUTCDate()}-${end.getUTCDate()} ${sMonth} ${year}`;
  }
  return `${start.getUTCDate()} ${sMonth} – ${end.getUTCDate()} ${eMonth} ${year}`;
}

export function useCorporateSynthesis() {
  const [data, setData] = useState<CorporateResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // loading initial state'i zaten true; effect [] deps ile bir kez koşar →
    // burada setLoading(true) gereksiz (cascading render lint kuralı).
    let cancelled = false;

    (async () => {
      // Proactively refresh an expired access token — this hook bypasses
      // apiClient.request() so it must guarantee a fresh Bearer itself, else
      // the backend tier-gates to free/locked after the 24h token expires.
      const authToken = await apiClient.getValidAccessToken();
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      try {
        const r = await fetch(`/api/corporate/latest?_=${Date.now()}`, {
          cache: 'no-store',
          headers,
        });
        const j = await r.json().catch(() => ({ error: 'fetch_failed' }));
        if (!cancelled) setData(j);
      } catch {
        if (!cancelled) setData({ error: 'fetch_failed' } as CorporateResponse);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}

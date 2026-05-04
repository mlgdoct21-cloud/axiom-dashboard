'use client';

import { useState, useEffect, useCallback } from 'react';

const AUTH_KEY = process.env.NEXT_PUBLIC_AUTH_STORAGE_KEY || 'axiom_auth';

export type QuotaStatus = 'pending' | 'allowed' | 'paywall' | 'error';

export interface QuotaPayload {
  allowed: boolean;
  used: number;
  limit: number | null;
  tier: string;
  command: string;
  remaining: number | null;
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Consumes one quota slot for the given command. On 402, status='paywall'
 * and `quota` carries tier/used/limit so the overlay can render exact copy.
 *
 * Re-runs only when `command` changes. Returning `quota` lets the parent
 * render badges like '1 hak kaldı' even on allowed=true.
 */
export function useFeatureQuota(command: string) {
  const [status, setStatus] = useState<QuotaStatus>('pending');
  const [quota, setQuota]   = useState<QuotaPayload | null>(null);
  const [error, setError]   = useState<string | null>(null);

  const consume = useCallback(async () => {
    setStatus('pending');
    setError(null);

    const token = getAccessToken();
    if (!token) {
      // Not logged in — backend would 401, but the dashboard layout
      // should already have redirected to /auth/login. Surface error
      // so the parent can fall back gracefully.
      setStatus('error');
      setError('not_authenticated');
      return;
    }

    // Same-session re-visit shouldn't burn quota — toggle between tabs
    // would otherwise eat 4 quota in a row. sessionStorage marker means
    // "I've already counted you for this command this browser session".
    const sessionKey = `axiom_quota_visited_${command}`;
    const alreadyVisited = sessionStorage.getItem(sessionKey) === 'true';

    try {
      const url = alreadyVisited
        ? `/api/feature-quota/peek?command=${encodeURIComponent(command)}`
        : '/api/feature-quota/consume';
      const init: RequestInit = alreadyVisited
        ? { method: 'GET', headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ command }),
            cache: 'no-store',
          };

      const r = await fetch(url, init);
      const data = await r.json().catch(() => ({}));

      if (r.status === 402) {
        const detail = data?.detail || data;
        setQuota({
          allowed: false,
          used: detail.used ?? 0,
          limit: detail.limit ?? null,
          tier: detail.tier ?? 'free',
          command: detail.command ?? command,
          remaining: detail.remaining ?? 0,
        });
        setStatus('paywall');
        return;
      }

      if (!r.ok) {
        setStatus('error');
        setError(data?.detail || data?.error || `HTTP ${r.status}`);
        return;
      }

      setQuota(data as QuotaPayload);
      // Mark as visited so subsequent tab toggles in this session won't
      // re-consume; backend peek still gives fresh remaining count.
      if (!alreadyVisited) {
        try { sessionStorage.setItem(sessionKey, 'true'); } catch { /* noop */ }
      }
      // Setting a 'paywall' status here too if peek returns allowed=false
      if (data?.allowed === false) {
        setStatus('paywall');
      } else {
        setStatus('allowed');
      }
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'fetch_failed');
    }
  }, [command]);

  useEffect(() => {
    consume();
  }, [consume]);

  return { status, quota, error, refresh: consume };
}

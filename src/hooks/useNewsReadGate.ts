'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

// Free kullanıcı günde kaç farklı haberi tam (özet+analiz) açabilir.
// Backend feature_quota.py `("free","news_read")` ile EŞLEŞMELİ.
export const NEWS_READ_LIMIT = 5;

const COMMAND = 'news_read';
const KEY_PREFIX = 'axiom_news_unlocked_';

function todayKey(): string {
  // UTC gün — backend 24h sliding window ile aynı eksen.
  return `${KEY_PREFIX}${new Date().toISOString().slice(0, 10)}`;
}

function readSet(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(todayKey());
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function writeSet(s: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(todayKey(), JSON.stringify([...s]));
    // Eski gün anahtarlarını temizle (tek günlük pencere yeter).
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(KEY_PREFIX) && k !== todayKey()) stale.push(k);
    }
    stale.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* noop */
  }
}

/**
 * Metered-paywall: bir haberin tam görünümünü (özet + AXIOM analizi) açmak
 * free/anonim için günde NEWS_READ_LIMIT farklı haberle sınırlı.
 *
 * - premium/advance → sınırsız, hiç gate yok.
 * - Bugün zaten açılmış haber → tekrar açmak ücretsiz (client-side dedup).
 * - Giriş yapmış free → sunucu sayacı (DB, 24h sliding) otorite; 402 → paywall.
 * - Anonim → sunucu çağrısı yapamaz → localStorage sayacı (yumuşak) + giriş CTA.
 *
 * localStorage temizlemek bypass ETMEZ: giriş yapmış free'de sunucu sert tavan,
 * temizlemek sadece daha önce açılmışı tekrar saydırıp hakkı boşa harcatır.
 */
export function useNewsReadGate() {
  const { user } = useAuth();
  const tier = (user?.tier || 'free').toLowerCase();
  const isPaid = tier === 'premium' || tier === 'advance';

  const [unlockedCount, setUnlockedCount] = useState(0);
  const [paywalled, setPaywalled] = useState(false);

  useEffect(() => {
    setUnlockedCount(readSet().size);
  }, []);

  const tryUnlock = useCallback(
    async (id: string): Promise<boolean> => {
      if (isPaid) {
        setPaywalled(false);
        return true;
      }

      const set = readSet();
      if (set.has(id)) {
        setPaywalled(false);
        return true;
      }

      const allow = () => {
        set.add(id);
        writeSet(set);
        setUnlockedCount(set.size);
        setPaywalled(false);
        return true;
      };

      const token = await apiClient.getValidAccessToken();
      if (token) {
        // Giriş yapmış free → sunucu otorite.
        try {
          const r = await fetch('/api/feature-quota/consume', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ command: COMMAND }),
            cache: 'no-store',
          });
          if (r.status === 402) {
            setPaywalled(true);
            return false;
          }
          if (!r.ok) return allow(); // fail-open: sayaç hatası okumayı engellemesin
          return allow();
        } catch {
          return allow(); // network hatası → fail-open
        }
      }

      // Anonim → localStorage yumuşak sayacı.
      if (set.size >= NEWS_READ_LIMIT) {
        setPaywalled(true);
        return false;
      }
      return allow();
    },
    [isPaid]
  );

  const remaining = isPaid ? null : Math.max(0, NEWS_READ_LIMIT - unlockedCount);

  return {
    tryUnlock,
    paywalled,
    setPaywalled,
    remaining,
    limit: isPaid ? null : NEWS_READ_LIMIT,
    isPaid,
    isAnonymous: !user,
  };
}

'use client';

/**
 * Crypto Intel Storyteller card — Pusula / ERC20 / Stablecoin tab'larının
 * üstünde mount edilir. Backend Gemini ile pre-generate edilen
 * 'narrative' + deterministic 'action box' gösterir.
 *
 * Free tier UI'de bu component render edilmiyor (parent tier gate).
 * Premium = kısa commentary; Advance = uzun commentary + action box.
 *
 * Data-yaşı rozeti: source_snapshot.generated_at_utc okunur, "Xdk önce"
 * formatında gösterilir (storyteller temporal hallucination guard — data
 * yaşı 6h+ ise rozet kırmızıya döner).
 */

import { useEffect, useState } from 'react';

const AUTH_KEY = process.env.NEXT_PUBLIC_AUTH_STORAGE_KEY || 'axiom_auth';

export type IntelTab = 'overview' | 'erc20' | 'stable';
export type IntelTier = 'premium' | 'advance';

interface ActionItem {
  sign: '✓' | '✗' | '⚠' | string;
  text: string;
}

interface IntelStoryResponse {
  tab: IntelTab;
  tier: IntelTier;
  story_md: string;
  action_box: ActionItem[];
  generated_at: string | null;
  source_snapshot?: Record<string, unknown>;
}

const TAB_META: Record<IntelTab, { emoji: string; title: string }> = {
  overview: { emoji: '🧭', title: 'Pusula Yorumu' },
  erc20:    { emoji: '🎯', title: 'ERC20 Yorumu' },
  stable:   { emoji: '💵', title: 'Stablecoin Yorumu' },
};

const SIGN_STYLE: Record<string, string> = {
  '✓': 'text-[#26de81]',
  '✗': 'text-[#ff4757]',
  '⚠': 'text-[#fbbf24]',
};

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw)?.access_token ?? null;
  } catch {
    return null;
  }
}

function formatAge(iso: string | null): { text: string; stale: boolean } {
  if (!iso) return { text: '?', stale: true };
  try {
    const t = new Date(iso).getTime();
    const diffMin = Math.floor((Date.now() - t) / 60000);
    if (diffMin < 1) return { text: 'şimdi', stale: false };
    if (diffMin < 60) return { text: `${diffMin}dk önce`, stale: false };
    const hours = Math.floor(diffMin / 60);
    if (hours < 6) return { text: `${hours}sa önce`, stale: false };
    return { text: `${hours}sa önce`, stale: true };
  } catch {
    return { text: '?', stale: true };
  }
}

export default function CryptoIntelStoryCard({
  tab,
  tier,
}: {
  tab: IntelTab;
  tier: IntelTier;
}) {
  const [data, setData] = useState<IntelStoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notReady, setNotReady] = useState(false);
  const meta = TAB_META[tab];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotReady(false);
    setData(null);

    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`/api/market/intel-story?tab=${tab}&tier=${tier}`, { headers, cache: 'no-store' })
      .then(async (r) => {
        if (cancelled) return;
        if (r.status === 204) {
          setNotReady(true);
          return;
        }
        if (!r.ok) {
          setNotReady(true);
          return;
        }
        const json: IntelStoryResponse = await r.json();
        setData(json);
      })
      .catch(() => {
        if (!cancelled) setNotReady(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab, tier]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#0d0d1a] to-[#111125] border border-[#2a2a3e] rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">{meta.emoji}</span>
          <h3 className="text-sm font-bold text-[#e0e0f0]">{meta.title}</h3>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-[#1a1a2e] rounded animate-pulse w-3/4" />
          <div className="h-3 bg-[#1a1a2e] rounded animate-pulse w-full" />
          <div className="h-3 bg-[#1a1a2e] rounded animate-pulse w-5/6" />
        </div>
      </div>
    );
  }

  if (notReady || !data || !data.story_md) {
    return (
      <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-lg">{meta.emoji}</span>
          <h3 className="text-sm font-bold text-[#e0e0f0]">{meta.title}</h3>
        </div>
        <p className="text-xs text-[#888]">Yorum henüz üretilmedi — 6 saatte bir otomatik yenilenir.</p>
      </div>
    );
  }

  const age = formatAge(data.generated_at);
  const tierBadge =
    data.tier === 'advance'
      ? { label: '🚀 Advance', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' }
      : { label: '💎 Premium', cls: 'bg-violet-500/15 text-violet-300 border-violet-500/30' };

  return (
    <div className="bg-gradient-to-br from-[#0d0d1a] to-[#111125] border border-violet-500/30 rounded-xl p-4 mb-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-lg">{meta.emoji}</span>
        <h3 className="text-sm font-bold text-[#e0e0f0]">{meta.title}</h3>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30">
          Gemini
        </span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${tierBadge.cls}`}>
          {tierBadge.label}
        </span>
        <span
          className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full border ${
            age.stale
              ? 'bg-red-500/10 text-red-300 border-red-500/30'
              : 'bg-[#1a1a2e] text-[#888] border-[#2a2a3e]'
          }`}
          title={data.generated_at || ''}
        >
          {age.stale ? '⚠ ' : '🕐 '}
          {age.text}
        </span>
      </div>

      {/* Narrative */}
      <p className="text-[13px] text-[#c0c0d0] leading-relaxed whitespace-pre-wrap">
        {data.story_md}
      </p>

      {/* Action box — deterministic, no LLM */}
      {data.action_box.length > 0 && (
        <div className="pt-3 border-t border-[#2a2a3e]">
          <div className="text-[10px] uppercase tracking-wider text-[#666] mb-1.5">
            🎯 Senin için aksiyon
          </div>
          <ul className="space-y-1">
            {data.action_box.map((a, i) => (
              <li key={i} className="text-[12px] text-[#c0c0d0] leading-relaxed flex gap-2">
                <span className={`${SIGN_STYLE[a.sign] || 'text-[#888]'} font-bold w-3 shrink-0`}>
                  {a.sign}
                </span>
                <span>{a.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

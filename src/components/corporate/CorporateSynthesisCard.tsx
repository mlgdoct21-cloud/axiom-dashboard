'use client';

/**
 * CorporateSynthesisCard — haftalık AXIOM Kurumsal Sentez kartı.
 *
 * MacroStoryCard auth/fetch pattern forku (axiom_auth localStorage →
 * Bearer). /api/corporate/latest proxy tier-gate eder. Durumlar:
 * loading · empty (synthesis null) · locked (free teaser + upgrade) ·
 * full (premium/advance synthesis_md).
 */

import { useEffect, useState } from 'react';
import InlineUpgradeModal from '@/components/ui/InlineUpgradeModal';

interface FullSynthesis {
  event_id: string;
  tier: 'premium' | 'advance';
  synthesis_md: string;
  source_count: number | null;
  generated_at: string | null;
}
interface LockedSynthesis {
  teaser: string;
  upgrade_cta: string;
}
interface CorporateResponse {
  now: string;
  tier: 'free' | 'premium' | 'advance';
  locked: boolean;
  week_start: string | null;
  synthesis: FullSynthesis | LockedSynthesis | null;
  error?: string;
}

const TIER_BADGE: Record<string, { label: string; classes: string }> = {
  free: { label: '🆓 Ücretsiz', classes: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
  premium: { label: '💎 Premium', classes: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
  advance: { label: '🚀 Advance', classes: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
};

function renderMd(md: string) {
  // Hafif markdown: '## Başlık' → alt-başlık; '- ' madde; boş satır → paragraf.
  return md.split('\n').map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} className="h-1.5" />;
    if (t.startsWith('## ')) {
      return (
        <h4 key={i} className="text-[12px] font-semibold text-[#4fc3f7] mt-2 mb-0.5">
          {t.slice(3)}
        </h4>
      );
    }
    if (t === '---') return <hr key={i} className="my-2 border-white/10" />;
    if (t.startsWith('- ')) {
      return (
        <p key={i} className="text-[11px] text-slate-300 leading-relaxed pl-3">
          • {t.slice(2)}
        </p>
      );
    }
    return (
      <p key={i} className="text-[11px] text-slate-300 leading-relaxed">
        {t}
      </p>
    );
  });
}

export default function CorporateSynthesisCard() {
  const [data, setData] = useState<CorporateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
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

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="rounded-lg border border-white/10 bg-[#1a1a2e]/60 p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] font-semibold text-slate-200">
          🏛️ AXIOM Kurumsal Sentez
        </span>
        {data && !data.error && (
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded-full border ${
              TIER_BADGE[data.tier]?.classes ?? TIER_BADGE.free.classes
            }`}
          >
            {TIER_BADGE[data.tier]?.label ?? TIER_BADGE.free.label}
          </span>
        )}
      </div>
      {children}
    </div>
  );

  if (loading) {
    return (
      <Shell>
        <div className="h-3 w-2/3 bg-white/5 rounded animate-pulse mb-1.5" />
        <div className="h-3 w-full bg-white/5 rounded animate-pulse mb-1" />
        <div className="h-3 w-5/6 bg-white/5 rounded animate-pulse" />
      </Shell>
    );
  }

  if (!data || data.error || data.synthesis === null) {
    return (
      <Shell>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Haftalık kurumsal makro sentez henüz üretilmedi. Her Pazartesi
          08:30&apos;da yayınlanır.
        </p>
      </Shell>
    );
  }

  const weekLine = data.week_start ? (
    <p className="text-[10px] text-slate-500 mb-1">Hafta: {data.week_start}</p>
  ) : null;

  if (data.locked) {
    const s = data.synthesis as LockedSynthesis;
    return (
      <Shell>
        {weekLine}
        <div className="relative">
          <p className="text-[11px] text-slate-300 leading-relaxed blur-[1.5px] select-none">
            {s.teaser}
          </p>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">{s.upgrade_cta}</p>
        <button
          type="button"
          onClick={() => setShowUpgrade(true)}
          className="inline-block mt-2 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 transition"
        >
          💎 Premium ile aç
        </button>
        <InlineUpgradeModal
          open={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          targetTier="premium"
          reason="Haftalık karşılaştırmalı kurumsal makro sentez"
        />
      </Shell>
    );
  }

  const s = data.synthesis as FullSynthesis;
  return (
    <Shell>
      {weekLine}
      <div className="space-y-0.5">{renderMd(s.synthesis_md)}</div>
      {s.generated_at && (
        <p className="text-[9px] text-slate-600 mt-2">
          Üretim: {new Date(s.generated_at).toLocaleString('tr-TR')}
          {s.source_count != null ? ` · ${s.source_count} kaynak` : ''}
        </p>
      )}
    </Shell>
  );
}

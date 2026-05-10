'use client';

import { useEffect, useState } from 'react';

interface SourceMeta {
  name: string;
  url: string;
}

interface StoryPayload {
  tier: 'premium' | 'advance';
  story_md: string;
  generated_at: string | null;
  sources_cited: string[];
  sources_registry: Record<string, SourceMeta>;
}

interface UpgradeCta {
  target_tier: 'premium' | 'advance';
  reason: string;
}

interface MacroStoryResponse {
  event_id: string;
  tier_active: 'free' | 'premium' | 'advance';
  event_type: string;
  country: string | null;
  released_at: string | null;
  narrative_md: string | null;
  source_url: string | null;
  story: StoryPayload | null;
  upgrade_cta: UpgradeCta | null;
}

interface ErrorPayload {
  error: string;
}

const TIER_BADGE: Record<string, { label: string; classes: string }> = {
  free: {
    label: '🆓 Ücretsiz',
    classes: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  },
  premium: {
    label: '💎 Premium',
    classes: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  },
  advance: {
    label: '🚀 Advance',
    classes: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
};

function formatGeneratedAt(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return (
      d.toLocaleString('tr-TR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
      }) + ' UTC'
    );
  } catch {
    return '';
  }
}

/**
 * Renders the story_md text and converts inline `[SRC]` citation chips
 * into hover-tooltips backed by sources_registry. Each citation chip
 * shows the source name + clickable URL when hovered.
 */
function StoryBody({ story }: { story: StoryPayload }) {
  // Split paragraphs on double newlines, then within each paragraph wrap
  // [SRC] tokens with a chip. We avoid dangerouslySetInnerHTML so the
  // story_md remains XSS-safe.
  const paragraphs = story.story_md.split(/\n\s*\n/);

  const renderWithCitations = (text: string, key: string) => {
    const parts: React.ReactNode[] = [];
    const regex = /\[([A-Z]+(?::[A-Z0-9_]+)?)\]/g;
    let lastIdx = 0;
    let match: RegExpExecArray | null;
    let i = 0;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push(text.slice(lastIdx, match.index));
      }
      const code = match[1];
      const meta = story.sources_registry?.[code];
      parts.push(
        <a
          key={`${key}-cite-${i++}`}
          href={meta?.url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-[9px] px-1 py-0.5 mx-0.5 rounded bg-[#1a1a2e] border border-[#2a2a3e] text-[#888] hover:text-[#a78bfa] hover:border-[#a78bfa]/50 font-mono align-baseline cursor-help transition"
          title={meta?.name || code}
        >
          {code}
        </a>,
      );
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < text.length) parts.push(text.slice(lastIdx));
    return parts;
  };

  return (
    <div className="space-y-3">
      {paragraphs.map((p, i) => (
        <p key={i} className="text-sm text-[#c0c0d0] leading-relaxed whitespace-pre-wrap">
          {renderWithCitations(p, `p${i}`)}
        </p>
      ))}
    </div>
  );
}

function UpgradeCtaBlock({ cta }: { cta: UpgradeCta }) {
  const targetBadge = TIER_BADGE[cta.target_tier];
  const isAdvance = cta.target_tier === 'advance';
  return (
    <div
      className={`mt-4 p-3 rounded-lg border ${
        isAdvance
          ? 'bg-gradient-to-r from-amber-500/10 to-violet-500/10 border-amber-500/30'
          : 'bg-gradient-to-r from-violet-500/10 to-emerald-500/10 border-violet-500/30'
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${targetBadge.classes}`}>
          {targetBadge.label}
        </span>
        <span className="text-[11px] font-semibold text-[#e0e0f0]">
          {isAdvance ? 'Daha derin analiz için' : 'Tam yorum için'}
        </span>
      </div>
      <p className="text-[11px] text-[#a0a0b8] leading-relaxed">{cta.reason}</p>
      <a
        href="/pricing"
        className={`inline-block mt-2 text-[10px] font-semibold px-2.5 py-1 rounded-full transition ${
          isAdvance
            ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
            : 'bg-violet-500/20 text-violet-300 hover:bg-violet-500/30'
        }`}
      >
        {isAdvance ? '🚀 Advance ile devam' : '💎 Premium ile devam'}
      </a>
    </div>
  );
}

export default function MacroStoryCard({ eventId }: { eventId: string }) {
  const [data, setData] = useState<MacroStoryResponse | ErrorPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(null);

    const authToken =
      typeof window !== 'undefined'
        ? localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
        : null;
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    fetch(`/api/macro/story/${encodeURIComponent(eventId)}?_=${Date.now()}`, {
      cache: 'no-store',
      headers,
    })
      .then(async (r) => {
        const j = await r.json().catch(() => ({ error: 'fetch_failed' }));
        if (!cancelled) setData(j);
      })
      .catch(() => {
        if (!cancelled) setData({ error: 'fetch_failed' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#0d0d1a] to-[#111125] border border-[#2a2a3e] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">📰</span>
          <h3 className="text-sm font-bold text-[#e0e0f0]">Makro Yorumcu</h3>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-[#1a1a2e] rounded animate-pulse w-3/4" />
          <div className="h-3 bg-[#1a1a2e] rounded animate-pulse w-full" />
          <div className="h-3 bg-[#1a1a2e] rounded animate-pulse w-5/6" />
          <div className="h-3 bg-[#1a1a2e] rounded animate-pulse w-2/3" />
        </div>
      </div>
    );
  }

  if (!data || 'error' in data) {
    return (
      <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">📰</span>
          <h3 className="text-sm font-bold text-[#e0e0f0]">Makro Yorumcu</h3>
        </div>
        <p className="text-xs text-[#888]">Yorum şu an üretilemedi.</p>
      </div>
    );
  }

  const tierBadge = TIER_BADGE[data.tier_active] || TIER_BADGE.free;
  const hasFullStory = !!data.story;

  return (
    <div className="bg-gradient-to-br from-[#0d0d1a] to-[#111125] border border-violet-500/30 rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xl">📰</span>
        <h3 className="text-sm font-bold text-[#e0e0f0]">Makro Yorumcu</h3>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30">
          Gemini · {data.event_type}
        </span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${tierBadge.classes}`}>
          {tierBadge.label}
        </span>
        {data.released_at && (
          <span className="text-[10px] text-[#888] ml-auto">
            📅{' '}
            {new Date(data.released_at).toLocaleDateString('tr-TR', {
              day: '2-digit',
              month: 'short',
              timeZone: 'UTC',
            })}
          </span>
        )}
      </div>

      {/* Free hap — her tier'da görünür */}
      {data.narrative_md && (
        <div className="pb-3 border-b border-[#2a2a3e]">
          <div className="text-[10px] uppercase tracking-wider text-[#666] mb-1">
            Özet
          </div>
          <p className="text-sm text-[#c0c0d0] leading-relaxed">{data.narrative_md}</p>
        </div>
      )}

      {/* Premium/Advance story */}
      {hasFullStory && data.story && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[#666] mb-2">
            Tam Analiz · {data.story.tier === 'advance' ? 'Advance' : 'Premium'}
          </div>
          <StoryBody story={data.story} />
          {data.story.sources_cited.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[#2a2a3e]">
              <div className="text-[10px] uppercase tracking-wider text-[#666] mb-1.5">
                Kaynaklar
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.story.sources_cited.map((code) => {
                  const meta = data.story?.sources_registry?.[code];
                  return (
                    <a
                      key={code}
                      href={meta?.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1a2e] border border-[#2a2a3e] text-[#a0a0b8] hover:text-[#a78bfa] hover:border-[#a78bfa]/50 transition font-mono"
                    >
                      {code}
                      {meta?.name && <span className="text-[#555] ml-1">· {meta.name}</span>}
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upgrade CTA */}
      {data.upgrade_cta && <UpgradeCtaBlock cta={data.upgrade_cta} />}

      {/* Footer */}
      <div className="pt-2 border-t border-[#2a2a3e] flex items-center justify-between text-[10px] text-[#555570]">
        <span className="italic">
          {data.tier_active === 'free'
            ? 'Free özet · Premium ile derin analiz'
            : data.story
              ? `Üretildi ${formatGeneratedAt(data.story.generated_at)}`
              : 'Yorum üretilmedi'}
        </span>
        {data.source_url && (
          <a
            href={data.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#888] hover:text-[#a78bfa] transition"
          >
            Ham veri ↗
          </a>
        )}
      </div>
    </div>
  );
}

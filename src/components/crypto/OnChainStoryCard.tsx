'use client';

import { useEffect, useState } from 'react';

interface StoryPayload {
  headline: string;
  paragraphs: string[];
  footer: string;
  symbol: string;
  axiom_score: number | null;
  score_zone: string | null;
  generated_at: string;
}

interface ErrorPayload {
  error: string;
  symbol?: string;
}

type Payload = StoryPayload | ErrorPayload;

const ERROR_LABELS: Record<string, string> = {
  cryptoquant_not_configured: 'On-chain veri kaynağı geçici olarak yapılandırılmamış.',
  symbol_not_supported: 'Bu sembol için hikâye üretimi henüz desteklenmiyor.',
  snapshot_unavailable: 'On-chain anlık görüntü alınamadı, birkaç dakika sonra tekrar deneyin.',
  no_signals: 'Henüz yorumlanacak sinyal oluşmadı.',
  story_generation_failed: 'Hikâye üreticisi geçici bir hata verdi.',
  fetch_failed: 'Bağlantı hatası — lütfen sayfayı yenileyin.',
};

function formatGeneratedAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }) + ' UTC';
  } catch {
    return '';
  }
}

export default function OnChainStoryCard({ symbol }: { symbol: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(null);

    fetch(
      `/api/crypto/onchain-story?symbol=${encodeURIComponent(symbol)}&_=${Date.now()}`,
      { cache: 'no-store' },
    )
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
  }, [symbol]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#0d0d1a] to-[#111125] border border-[#2a2a3e] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">📖</span>
          <h3 className="text-sm font-bold text-[#e0e0f0]">Hikâyeleştirici Ajan</h3>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/30">
            Gemini
          </span>
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
    const msg = (data && 'error' in data && ERROR_LABELS[data.error]) || 'Hikâye şu an üretilemedi.';
    return (
      <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">📖</span>
          <h3 className="text-sm font-bold text-[#e0e0f0]">Hikâyeleştirici Ajan</h3>
        </div>
        <p className="text-xs text-[#888]">{msg}</p>
      </div>
    );
  }

  const story = data;

  return (
    <div className="bg-gradient-to-br from-[#0d0d1a] to-[#111125] border border-[#a78bfa]/30 rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xl">📖</span>
        <h3 className="text-sm font-bold text-[#e0e0f0]">Hikâyeleştirici Ajan</h3>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/30">
          Gemini · {story.symbol}
        </span>
        {story.axiom_score !== null && story.axiom_score !== undefined && (
          <span className="text-[10px] text-[#888] ml-auto">
            Axiom {story.axiom_score} · {story.score_zone || ''}
          </span>
        )}
      </div>

      <h4 className="text-base font-semibold text-[#e0e0f0] leading-snug">
        {story.headline}
      </h4>

      <div className="space-y-2.5">
        {story.paragraphs.map((p, i) => (
          <p key={i} className="text-sm text-[#c0c0d0] leading-relaxed">
            {p}
          </p>
        ))}
      </div>

      <div className="pt-2 border-t border-[#2a2a3e] flex items-center justify-between text-[10px] text-[#555570]">
        <span className="italic">{story.footer}</span>
        {story.generated_at && (
          <span className="font-mono shrink-0 ml-2">{formatGeneratedAt(story.generated_at)}</span>
        )}
      </div>
    </div>
  );
}

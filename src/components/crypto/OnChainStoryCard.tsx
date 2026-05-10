'use client';

import { useEffect, useState } from 'react';

interface DataAgeSummary {
  oldest_date: string;
  newest_date: string;
  stale_count: number;
  stale_metrics: string[];
  today_utc: string;
}

interface StoryPayload {
  headline: string;
  paragraphs: string[];
  footer: string;
  symbol: string;
  axiom_score: number | null;
  score_zone: string | null;
  data_age_summary: DataAgeSummary | null;
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

function formatDateBadge(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00Z');
    return d.toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    });
  } catch {
    return iso;
  }
}

function DataAgeBadge({ summary }: { summary: DataAgeSummary }) {
  const [open, setOpen] = useState(false);
  const sameDay = summary.oldest_date === summary.newest_date;
  const label = sameDay
    ? formatDateBadge(summary.oldest_date)
    : `${formatDateBadge(summary.oldest_date)} – ${formatDateBadge(summary.newest_date)}`;
  const hasStale = summary.stale_count > 0;
  const color = hasStale
    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={`text-[9px] px-1.5 py-0.5 rounded-full border cursor-help hover:brightness-110 transition ${color}`}
        title="Veri yaşı detayları"
      >
        📅 Veri: {label}
        {hasStale && <span className="ml-1 opacity-80">·{summary.stale_count}⚠</span>}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 w-64 p-3 rounded-lg bg-[#0d0d1a] border border-[#2a2a3e] shadow-xl text-[10px] text-[#c0c0d0] leading-relaxed">
          <div className="font-semibold text-[#e0e0f0] mb-1.5">📅 Veri yaşı</div>
          <div>En eski ölçüm: <span className="font-mono">{summary.oldest_date}</span></div>
          <div>En yeni ölçüm: <span className="font-mono">{summary.newest_date}</span></div>
          <div className="mt-1 text-[#888]">Bugün (UTC): <span className="font-mono">{summary.today_utc}</span></div>
          {hasStale ? (
            <div className="mt-2 pt-2 border-t border-[#2a2a3e]">
              <div className="text-amber-300 font-medium mb-0.5">
                ⚠ {summary.stale_count} metrik eski (≥2 gün):
              </div>
              <div className="text-[9px] text-[#888]">{summary.stale_metrics.join(', ')}</div>
              <div className="mt-1.5 text-[9px] text-[#666] italic">
                Bu metrikler yorumda ana karar metriği olarak kullanılmaz; tarih damgalı atıfta bulunulur.
              </div>
            </div>
          ) : (
            <div className="mt-2 pt-2 border-t border-[#2a2a3e] text-emerald-300 italic">
              ✓ Tüm metrikler 1 gün veya daha taze.
            </div>
          )}
        </div>
      )}
    </div>
  );
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
          <h3 className="text-sm font-bold text-[#e0e0f0]">Axiom Analistleri</h3>
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
          <h3 className="text-sm font-bold text-[#e0e0f0]">Axiom Analistleri</h3>
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
        <h3 className="text-sm font-bold text-[#e0e0f0]">Axiom Analistleri</h3>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/30">
          Gemini · {story.symbol}
        </span>
        {story.data_age_summary && <DataAgeBadge summary={story.data_age_summary} />}
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

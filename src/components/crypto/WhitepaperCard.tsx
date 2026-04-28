'use client';

import { useEffect, useState } from 'react';

interface WhitepaperData {
  symbol: string;
  project_name: string;
  whitepaper_url: string | null;
  homepage: string | null;
  analysis: {
    accountability_score: number;
    verdict: 'DELIVERING' | 'PARTIAL' | 'FALLING_BEHIND' | 'ABANDONED';
    promises_kept: string[];
    promises_broken: string[];
    reality_check: string;
    long_term_outlook: string;
  };
  cached: boolean;
}

const VERDICT_STYLES: Record<string, { bg: string; text: string; emoji: string }> = {
  DELIVERING:     { bg: 'bg-emerald-500/20', text: 'text-emerald-400', emoji: '✅' },
  PARTIAL:        { bg: 'bg-yellow-500/20',  text: 'text-yellow-400',  emoji: '🟡' },
  FALLING_BEHIND: { bg: 'bg-orange-500/20',  text: 'text-orange-400',  emoji: '⚠️' },
  ABANDONED:      { bg: 'bg-red-500/20',     text: 'text-red-400',     emoji: '💀' },
};

export default function WhitepaperCard({ symbol }: { symbol: string }) {
  const [data, setData] = useState<WhitepaperData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/crypto/whitepaper?symbol=${symbol}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }, [symbol]);

  const scoreColor = (s: number) =>
    s >= 70 ? '#10b981' : s >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#8888a0] uppercase tracking-wider">
          📄 Whitepaper vs Reality
        </h3>
        {data && (
          <span className="text-xs text-[#555570]">{data.cached ? 'cached' : 'live'}</span>
        )}
      </div>

      {loading && (
        <div className="animate-pulse space-y-3">
          <div className="h-10 bg-[#2a2a3e] rounded-lg w-1/2" />
          <div className="h-16 bg-[#2a2a3e] rounded-lg" />
          <div className="h-4 bg-[#2a2a3e] rounded" />
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {data && (() => {
        const v = VERDICT_STYLES[data.analysis.verdict] ?? VERDICT_STYLES.PARTIAL;
        return (
          <div className="space-y-4">
            {/* Score + verdict */}
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold" style={{ color: scoreColor(data.analysis.accountability_score) }}>
                {data.analysis.accountability_score}
              </div>
              <div className="space-y-1.5">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${v.bg} ${v.text}`}>
                  {v.emoji} {data.analysis.verdict.replace('_', ' ')}
                </span>
                <p className="text-xs text-[#555570]">{data.project_name}</p>
              </div>
            </div>

            {/* Reality check */}
            <p className="text-xs text-[#c0c0d0] leading-relaxed">{data.analysis.reality_check}</p>

            {/* Promises kept */}
            {data.analysis.promises_kept.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-[#555570] font-medium">Kept</p>
                {data.analysis.promises_kept.map((p, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-green-400">
                    <span className="mt-0.5">✓</span><span>{p}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Promises broken */}
            {data.analysis.promises_broken.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-[#555570] font-medium">Undelivered</p>
                {data.analysis.promises_broken.map((p, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-red-400">
                    <span className="mt-0.5">✗</span><span>{p}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Long-term outlook */}
            <div className="border-t border-[#2a2a3e] pt-3">
              <p className="text-xs text-[#555570] mb-1">Long-term outlook</p>
              <p className="text-xs text-[#8888a0]">{data.analysis.long_term_outlook}</p>
            </div>

            {/* Links */}
            {(data.whitepaper_url || data.homepage) && (
              <div className="flex gap-3 text-xs">
                {data.whitepaper_url && (
                  <a href={data.whitepaper_url} target="_blank" rel="noopener noreferrer"
                    className="text-[#4fc3f7] hover:text-[#81d4fa] transition">
                    Whitepaper →
                  </a>
                )}
                {data.homepage && (
                  <a href={data.homepage} target="_blank" rel="noopener noreferrer"
                    className="text-[#4fc3f7] hover:text-[#81d4fa] transition">
                    Website →
                  </a>
                )}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

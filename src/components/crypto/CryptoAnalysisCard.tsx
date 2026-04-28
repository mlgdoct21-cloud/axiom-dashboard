'use client';

import { useEffect, useState } from 'react';

interface AnalysisData {
  symbol: string;
  analysis: {
    overall_score: number;
    recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
    confidence: 'high' | 'medium' | 'low';
    executive_summary: string;
    strengths: string[];
    red_flags: string[];
    dev_analysis: string;
    tokenomics_analysis: string;
    short_term_outlook: string;
  };
  data_sources: { github: string; coingecko: string; ai: string };
  generated_at: string;
  cached: boolean;
}

const REC_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  STRONG_BUY:  { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'STRONG BUY' },
  BUY:         { bg: 'bg-green-500/20',   text: 'text-green-400',   label: 'BUY' },
  HOLD:        { bg: 'bg-yellow-500/20',  text: 'text-yellow-400',  label: 'HOLD' },
  SELL:        { bg: 'bg-orange-500/20',  text: 'text-orange-400',  label: 'SELL' },
  STRONG_SELL: { bg: 'bg-red-500/20',     text: 'text-red-400',     label: 'STRONG SELL' },
};

export default function CryptoAnalysisCard({ symbol }: { symbol: string }) {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/crypto/analyze?symbol=${symbol}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }, [symbol]);

  const scoreColor = (s: number) =>
    s >= 75 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#8888a0] uppercase tracking-wider">
          🤖 AI Analysis
        </h3>
        {data && (
          <span className="text-xs text-[#555570]">
            {data.data_sources.ai} · {data.cached ? 'cached' : 'live'}
          </span>
        )}
      </div>

      {loading && (
        <div className="animate-pulse space-y-3">
          <div className="h-10 bg-[#2a2a3e] rounded-lg w-1/3" />
          <div className="h-16 bg-[#2a2a3e] rounded-lg" />
          <div className="h-4 bg-[#2a2a3e] rounded w-full" />
          <div className="h-4 bg-[#2a2a3e] rounded w-4/5" />
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {data && (() => {
        const rec = REC_STYLES[data.analysis.recommendation] ?? REC_STYLES.HOLD;
        return (
          <div className="space-y-4">
            {/* Score + recommendation */}
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold" style={{ color: scoreColor(data.analysis.overall_score) }}>
                {data.analysis.overall_score}
              </div>
              <div className="space-y-1.5">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${rec.bg} ${rec.text}`}>
                  {rec.label}
                </span>
                <p className="text-xs text-[#555570]">
                  Confidence: <span className="text-[#8888a0] capitalize">{data.analysis.confidence}</span>
                </p>
              </div>
            </div>

            {/* Summary */}
            <p className="text-xs text-[#c0c0d0] leading-relaxed">{data.analysis.executive_summary}</p>

            {/* Strengths */}
            {data.analysis.strengths.length > 0 && (
              <div className="space-y-1">
                {data.analysis.strengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-green-400">
                    <span className="mt-0.5">✓</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Red flags */}
            {data.analysis.red_flags.length > 0 && (
              <div className="space-y-1">
                {data.analysis.red_flags.map((f, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-red-400">
                    <span className="mt-0.5">⚠</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Outlook */}
            <div className="border-t border-[#2a2a3e] pt-3">
              <p className="text-xs text-[#555570] mb-1">Short-term outlook</p>
              <p className="text-xs text-[#8888a0]">{data.analysis.short_term_outlook}</p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

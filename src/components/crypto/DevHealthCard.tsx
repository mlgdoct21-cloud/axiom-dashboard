'use client';

import { useEffect, useState } from 'react';

interface DevHealthData {
  symbol: string;
  dev_health: {
    score: number;
    metrics: {
      commits_30d: number;
      active_developers: number;
      recent_prs: number;
      avg_pr_review_time: number;
    };
    red_flags: string[];
    trend: string;
  };
  cached: boolean;
}

export default function DevHealthCard({ symbol }: { symbol: string }) {
  const [data, setData] = useState<DevHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/crypto/dev-health?symbol=${symbol}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }, [symbol]);

  const scoreColor = (score: number) =>
    score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#8888a0] uppercase tracking-wider">
          🛠 Developer Health
        </h3>
        {data && (
          <span className="text-xs text-[#555570]">{data.cached ? 'cached' : 'live'}</span>
        )}
      </div>

      {loading && (
        <div className="animate-pulse space-y-3">
          <div className="h-12 bg-[#2a2a3e] rounded-lg" />
          <div className="h-4 bg-[#2a2a3e] rounded w-3/4" />
          <div className="h-4 bg-[#2a2a3e] rounded w-1/2" />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {data && (
        <div className="space-y-4">
          {/* Score */}
          <div className="flex items-center gap-4">
            <div
              className="text-4xl font-bold"
              style={{ color: scoreColor(data.dev_health.score) }}
            >
              {data.dev_health.score}
            </div>
            <div>
              <div className="w-32 h-2 bg-[#2a2a3e] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${data.dev_health.score}%`,
                    backgroundColor: scoreColor(data.dev_health.score),
                  }}
                />
              </div>
              <p className="text-xs text-[#555570] mt-1">out of 100</p>
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#0d0d1a] rounded-lg p-2">
              <p className="text-[#555570]">Commits (30d)</p>
              <p className="text-[#e0e0e0] font-semibold mt-0.5">{data.dev_health.metrics.commits_30d}</p>
            </div>
            <div className="bg-[#0d0d1a] rounded-lg p-2">
              <p className="text-[#555570]">Active Devs</p>
              <p className="text-[#e0e0e0] font-semibold mt-0.5">{data.dev_health.metrics.active_developers}</p>
            </div>
            <div className="bg-[#0d0d1a] rounded-lg p-2">
              <p className="text-[#555570]">Recent PRs</p>
              <p className="text-[#e0e0e0] font-semibold mt-0.5">{data.dev_health.metrics.recent_prs}</p>
            </div>
            <div className="bg-[#0d0d1a] rounded-lg p-2">
              <p className="text-[#555570]">Avg Review</p>
              <p className="text-[#e0e0e0] font-semibold mt-0.5">{data.dev_health.metrics.avg_pr_review_time.toFixed(0)}h</p>
            </div>
          </div>

          {/* Red flags */}
          {data.dev_health.red_flags.length > 0 && (
            <div className="space-y-1">
              {data.dev_health.red_flags.map((flag, i) => (
                <div key={i} className="flex items-start gap-1.5 text-xs text-red-400">
                  <span className="mt-0.5">⚠</span>
                  <span>{flag}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

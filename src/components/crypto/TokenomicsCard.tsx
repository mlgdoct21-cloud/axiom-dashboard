'use client';

import { useEffect, useState } from 'react';

interface TokenomicsData {
  symbol: string;
  tokenomics: {
    current_price: number;
    market_cap: number;
    total_volume: number;
    circulating_supply: number;
    total_supply: number | null;
    max_supply: number | null;
    dilution_ratio: string;
    is_capped: boolean;
    commit_count_4_weeks: number;
  };
  cached: boolean;
}

function fmt(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  return n.toLocaleString();
}

export default function TokenomicsCard({ symbol }: { symbol: string }) {
  const [data, setData] = useState<TokenomicsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/crypto/tokenomics?symbol=${symbol}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }, [symbol]);

  const dilution = data ? parseFloat(data.tokenomics.dilution_ratio) : 0;
  const dilutionColor = dilution > 30 ? '#ef4444' : dilution > 15 ? '#f59e0b' : '#10b981';

  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#8888a0] uppercase tracking-wider">
          💰 Tokenomics
        </h3>
        {data && (
          <span className="text-xs text-[#555570]">{data.cached ? 'cached' : 'live'}</span>
        )}
      </div>

      {loading && (
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-[#2a2a3e] rounded-lg w-1/2" />
          <div className="h-4 bg-[#2a2a3e] rounded" />
          <div className="h-4 bg-[#2a2a3e] rounded w-3/4" />
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {data && (
        <div className="space-y-4">
          {/* Price */}
          <div>
            <p className="text-2xl font-bold text-[#e0e0e0]">
              ${data.tokenomics.current_price.toLocaleString()}
            </p>
            <p className="text-xs text-[#555570] mt-0.5">{symbol} / USD</p>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#0d0d1a] rounded-lg p-2">
              <p className="text-[#555570]">Market Cap</p>
              <p className="text-[#e0e0e0] font-semibold mt-0.5">${fmt(data.tokenomics.market_cap)}</p>
            </div>
            <div className="bg-[#0d0d1a] rounded-lg p-2">
              <p className="text-[#555570]">24h Volume</p>
              <p className="text-[#e0e0e0] font-semibold mt-0.5">${fmt(data.tokenomics.total_volume)}</p>
            </div>
            <div className="bg-[#0d0d1a] rounded-lg p-2">
              <p className="text-[#555570]">Circulating</p>
              <p className="text-[#e0e0e0] font-semibold mt-0.5">{fmt(data.tokenomics.circulating_supply)}</p>
            </div>
            <div className="bg-[#0d0d1a] rounded-lg p-2">
              <p className="text-[#555570]">Max Supply</p>
              <p className="text-[#e0e0e0] font-semibold mt-0.5">
                {data.tokenomics.max_supply ? fmt(data.tokenomics.max_supply) : '∞'}
              </p>
            </div>
          </div>

          {/* Dilution */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#555570]">Dilution Risk</span>
            <span className="font-semibold" style={{ color: dilutionColor }}>
              {dilution.toFixed(1)}% {dilution > 30 ? '🔴' : dilution > 15 ? '🟡' : '🟢'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-[#555570]">Supply model</span>
            <span className={data.tokenomics.is_capped ? 'text-green-400' : 'text-yellow-400'}>
              {data.tokenomics.is_capped ? 'Fixed cap' : 'Inflationary'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { fetchOnChainSnapshot, OnChainSnapshot } from '@/lib/cryptoquant';

const C = {
  green:  '#26de81',
  red:    '#ff4757',
  orange: '#ff9800',
  yellow: '#fbbf24',
  blue:   '#4fc3f7',
  gray:   '#888',
};

export default function DerivativesCard({ symbol }: { symbol: string }) {
  const [data, setData]       = useState<OnChainSnapshot | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    fetchOnChainSnapshot(symbol).then(res => {
      if (cancelled) return;
      if ('error' in res && res.error) {
        setError(res.error);
      } else {
        setData(res as OnChainSnapshot);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [symbol]);

  if (loading) {
    return (
      <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-[#1a1a2e] rounded w-1/3 mb-4" />
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-[#1a1a2e] rounded" />)}
        </div>
      </div>
    );
  }

  if (error || !data || !data.signals) return null;
  if (symbol !== 'BTC') return null;  // Derivatives only available for BTC currently

  const fr = data.signals?.funding_rates;
  const oi = data.signals?.open_interest;
  const cb = data.coinbase_premium;

  if (!fr && !oi && !cb) return null;

  // Funding rate gauge: -0.05% to +0.05% range
  const fundingPct = data.funding_rates?.avg_24h ?? 0;
  const gaugePos = Math.max(0, Math.min(100, ((fundingPct * 100 + 0.05) / 0.10) * 100));

  return (
    <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">⚡</span>
        <div className="text-sm font-bold text-[#e0e0f0]">Türev Piyasa</div>
        <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/30">
          Premium
        </span>
      </div>

      {/* Funding Rate Gauge */}
      {fr && data.funding_rates && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-widest text-[#888]">Fonlama Oranı (24s ort.)</div>
            <div className="text-xs font-bold font-mono" style={{
              color: fundingPct > 0.0005 ? C.red : fundingPct < -0.0005 ? C.green : C.yellow,
            }}>
              {(fundingPct * 100).toFixed(4)}%
            </div>
          </div>
          <div className="relative h-2 bg-[#1a1a2e] rounded-full overflow-hidden">
            <div className="absolute inset-y-0 left-1/2 w-px bg-[#444]" />
            <div className="absolute inset-y-0 transition-all"
              style={{
                left: '50%',
                width: `${Math.abs(gaugePos - 50)}%`,
                transform: gaugePos < 50 ? 'translateX(-100%)' : undefined,
                background: fundingPct > 0.0005 ? C.red : fundingPct < -0.0005 ? C.green : C.yellow,
              }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-[#555] mt-1">
            <span>Short ödüyor</span>
            <span>Dengeli</span>
            <span>Long ödüyor</span>
          </div>
          <div className="text-[10px] text-[#888] mt-2">{fr.label_tr}</div>
        </div>
      )}

      {/* Grid: OI + Coinbase Premium */}
      <div className="grid grid-cols-2 gap-3">
        {oi && data.open_interest && (
          <div className="bg-[#111125] border border-[#2a2a3e] rounded-lg p-3">
            <div className="text-[9px] uppercase tracking-widest text-[#555] mb-1">Açık Pozisyon</div>
            <div className="text-sm font-bold text-[#e0e0f0]">
              ${(data.open_interest.open_interest / 1e9).toFixed(2)}B
            </div>
            <div className="text-[10px] mt-0.5"
              style={{ color: data.open_interest.change_pct > 0 ? C.green : C.red }}>
              {data.open_interest.change_pct >= 0 ? '▲' : '▼'} {Math.abs(data.open_interest.change_pct).toFixed(1)}%
            </div>
          </div>
        )}

        {cb && (
          <div className="bg-[#111125] border border-[#2a2a3e] rounded-lg p-3">
            <div className="text-[9px] uppercase tracking-widest text-[#555] mb-1">Coinbase Primi</div>
            <div className="text-sm font-bold" style={{
              color: cb.coinbase_premium > 0 ? C.green : cb.coinbase_premium < 0 ? C.red : C.gray,
            }}>
              {cb.coinbase_premium >= 0 ? '+' : ''}{cb.coinbase_premium.toFixed(2)}
            </div>
            <div className="text-[9px] text-[#555] mt-0.5">
              {cb.coinbase_premium > 0 ? 'ABD kurumsal alıcı' : cb.coinbase_premium < 0 ? 'ABD kurumsal satıcı' : 'Nötr'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

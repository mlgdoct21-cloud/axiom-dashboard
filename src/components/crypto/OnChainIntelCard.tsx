'use client';

import { useEffect, useState } from 'react';
import { fetchOnChainSnapshot, OnChainSnapshot } from '@/lib/cryptoquant';
import AxiomScoreWidget from './AxiomScoreWidget';
import {
  ExchangePulsePanel,
  WhaleRadarPanel,
  LeverageHeatPanel,
  CycleCompassPanel,
  MinerConvictionPanel,
} from './OnChainPanels';

export default function OnChainIntelCard({ symbol }: { symbol: string }) {
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
      if ('error' in res && (!('symbol' in res) || res.error)) {
        if (res.error === 'cryptoquant_not_configured') {
          setError('CryptoQuant entegrasyonu yapılandırılmadı.');
        } else {
          setError(res.error || 'Veri alınamadı');
        }
      } else {
        setData(res as OnChainSnapshot);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [symbol]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded-xl p-5 animate-pulse">
          <div className="h-6 bg-[#1a1a2e] rounded w-1/3 mb-4" />
          <div className="h-16 bg-[#1a1a2e] rounded mb-3" />
          <div className="h-3 bg-[#1a1a2e] rounded w-2/3" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-[#0d0d1a] border border-[#2a2a3e] rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-[#1a1a2e] rounded w-1/2 mb-3" />
              <div className="h-3 bg-[#1a1a2e] rounded mb-2" />
              <div className="h-3 bg-[#1a1a2e] rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    const unsupported = error === 'symbol_not_supported';
    return (
      <div className="bg-[#1a0d0d] border border-[#ff9800]/30 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <span className="text-xl">🔗</span>
          <div className="flex-1">
            <div className="text-sm font-bold text-[#ff9800] mb-1">On-Chain Sinyaller</div>
            <div className="text-xs text-[#c0c0d0]">
              {unsupported
                ? `${symbol} için on-chain veri henüz mevcut değil. Şu an BTC ve ETH desteklenmektedir; diğer büyük coinler yakında eklenecek.`
                : error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-3">
      <AxiomScoreWidget data={data} premium={true} />

      <div className="grid sm:grid-cols-2 gap-3">
        <ExchangePulsePanel data={data} />
        <WhaleRadarPanel data={data} />
        <LeverageHeatPanel data={data} />
        <CycleCompassPanel data={data} />
        <div className="sm:col-span-2">
          <MinerConvictionPanel data={data} />
        </div>
      </div>

      <div className="text-center text-[9px] text-[#444] pt-1">
        Veri kaynağı: CryptoQuant on-chain · {new Date(data.fetched_at).toLocaleString('tr-TR')}
      </div>
    </div>
  );
}

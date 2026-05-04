'use client';

import { useEffect, useState } from 'react';
import { fetchOnChainSnapshot, OnChainSnapshot, OverallSignal } from '@/lib/cryptoquant';

const C = {
  green:  '#26de81',
  red:    '#ff4757',
  orange: '#ff9800',
  yellow: '#fbbf24',
  blue:   '#4fc3f7',
  gray:   '#888',
};

const overallMeta: Record<OverallSignal, { bg: string; border: string; text: string; icon: string; label: string }> = {
  BULLISH:  { bg: C.green  + '18', border: C.green  + '55', text: C.green,  icon: '🟢', label: 'Alıcı Üstünlüğü' },
  BEARISH:  { bg: C.red    + '18', border: C.red    + '55', text: C.red,    icon: '⚠️', label: 'Satıcı Üstünlüğü' },
  MIXED:    { bg: C.yellow + '18', border: C.yellow + '55', text: C.yellow, icon: '🟡', label: 'Karışık Sinyal' },
  UNKNOWN:  { bg: C.gray   + '18', border: C.gray   + '55', text: C.gray,   icon: '❓', label: 'Veri Yok' },
};

const signalColor = {
  BULLISH: C.green,
  BEARISH: C.red,
  NEUTRAL: C.yellow,
};

interface SignalRow {
  key: string;
  metric_tr: string;
  description: string;
}

const ROWS: SignalRow[] = [
  { key: 'exchange_netflow',  metric_tr: 'Borsa Akışı',     description: 'BTC borsa giriş/çıkış net farkı' },
  { key: 'whale_ratio',       metric_tr: 'Balina Oranı',    description: 'Top-10 işlemin toplam girişe oranı' },
  { key: 'miner_reserve',     metric_tr: 'Madenci Baskı',   description: 'Madenci rezerv 7 günlük değişim' },
  { key: 'stablecoin_inflow', metric_tr: 'USDT Girişi',     description: 'Stablecoin alım gücü göstergesi' },
  { key: 'sopr',              metric_tr: 'SOPR',            description: 'Yatırımcılar kar/zarar realize ediyor mu' },
];

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
      <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-[#1a1a2e] rounded w-1/3 mb-4" />
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-[#1a1a2e] rounded" />)}
        </div>
      </div>
    );
  }

  if (error) {
    const isOnlyBtcEth = symbol !== 'BTC';
    return (
      <div className="bg-[#1a0d0d] border border-[#ff9800]/30 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <span className="text-xl">🔗</span>
          <div className="flex-1">
            <div className="text-sm font-bold text-[#ff9800] mb-1">On-Chain Sinyaller</div>
            <div className="text-xs text-[#c0c0d0]">
              {isOnlyBtcEth
                ? 'On-chain veriler şu an yalnızca BTC için kullanılabiliyor. Yakında ETH ve diğer büyük coinler eklenecek.'
                : error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const om = overallMeta[data.overall];

  return (
    <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded-xl overflow-hidden">
      {/* Header — Overall signal */}
      <div className="px-5 py-4 border-b border-[#2a2a3e] flex items-center justify-between gap-3 flex-wrap"
        style={{ background: om.bg, borderColor: om.border }}>
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{om.icon}</span>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[#888]">Genel On-Chain Sinyal</div>
            <div className="text-sm font-black" style={{ color: om.text }}>{om.label}</div>
          </div>
        </div>
        <div className="text-[10px] text-[#666]">
          {data.signals && Object.keys(data.signals).length} sinyal · CryptoQuant
        </div>
      </div>

      {/* Signal rows */}
      <div className="divide-y divide-[#1a1a2e]">
        {ROWS.map(row => {
          const sig = data.signals?.[row.key];
          if (!sig) return null;
          const color = signalColor[sig.signal];
          return (
            <div key={row.key} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-[#e0e0f0]">{row.metric_tr}</div>
                <div className="text-[10px] text-[#555] truncate">{row.description}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-xs font-bold font-mono" style={{ color }}>{sig.value_str}</div>
                </div>
                <div className="text-[10px] px-2 py-1 rounded-full font-semibold whitespace-nowrap"
                  style={{ background: color + '15', color, border: `1px solid ${color}40` }}>
                  {sig.label_tr}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-2 bg-[#0a0a14] border-t border-[#2a2a3e] flex items-center justify-between">
        <div className="text-[9px] text-[#444]">
          Veri: CryptoQuant on-chain · {new Date(data.fetched_at).toLocaleString('tr-TR')}
        </div>
      </div>
    </div>
  );
}

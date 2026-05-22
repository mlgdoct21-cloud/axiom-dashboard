'use client';

/**
 * MtfPanel — Faz E.2 Sembol-bazlı Multi-Timeframe trend göstergesi.
 *
 * CockpitTab'daki MTF chip BTC'ye sabitti (Binance public klines, 4 dilim).
 * Bu panel TechnicalTab'da seçili sembol için 6 zaman dilimi gösterir:
 *   1m, 5m, 15m, 1h, 4h, 1d
 *
 * Trend kararı: Her zaman dilimi için son 2 kapanış mumu yön karşılaştırması.
 * Trend kalitesi (%): aynı yönde hizalı dilim sayısı / 6 × 100.
 *
 * Veri kaynağı: /api/candles?symbol=X&resolution=Y (TechnicalTab ile aynı).
 */

import { useEffect, useState } from 'react';

const TIMEFRAMES: { id: string; label: string; resolution: string }[] = [
  { id: '1m',  label: '1dk',  resolution: '1min' },
  { id: '5m',  label: '5dk',  resolution: '5min' },
  { id: '15m', label: '15dk', resolution: '15min' },
  { id: '1h',  label: '1s',   resolution: '1hour' },
  { id: '4h',  label: '4s',   resolution: '4hour' },
  { id: '1d',  label: '1g',   resolution: '1day' },
];

interface MtfPanelProps {
  symbol: string;
  /** Yatay (default) veya kompakt görünüm. */
  compact?: boolean;
}

type Direction = 'up' | 'down' | 'flat';

interface TfResult {
  id: string;
  label: string;
  direction: Direction;
  pctChange: number;
}

export default function MtfPanel({ symbol, compact = false }: MtfPanelProps) {
  const [results, setResults] = useState<TfResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const out: TfResult[] = [];
      // Paralel fetch — 6 farklı resolution
      const fetches = TIMEFRAMES.map(async (tf) => {
        try {
          const r = await fetch(
            `/api/candles?symbol=${encodeURIComponent(symbol)}&resolution=${tf.resolution}`
          );
          if (!r.ok) return null;
          const body = await r.json();
          const candles = body.candles || [];
          if (candles.length < 2) return null;
          const prev = candles[candles.length - 2];
          const last = candles[candles.length - 1];
          const prevClose = prev.close ?? prev.high;
          const lastClose = last.close ?? last.high;
          if (!Number.isFinite(prevClose) || !Number.isFinite(lastClose)) return null;
          const pctChange = ((lastClose - prevClose) / prevClose) * 100;
          let direction: Direction = 'flat';
          if (pctChange > 0.05) direction = 'up';
          else if (pctChange < -0.05) direction = 'down';
          return { id: tf.id, label: tf.label, direction, pctChange };
        } catch {
          return null;
        }
      });
      const fetched = await Promise.all(fetches);
      if (cancelled) return;
      for (const r of fetched) {
        if (r) out.push(r);
      }
      setResults(out);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [symbol]);

  const ups = results.filter((r) => r.direction === 'up').length;
  const downs = results.filter((r) => r.direction === 'down').length;
  const aligned = Math.max(ups, downs);
  const qualityPct = results.length > 0 ? Math.round((aligned / results.length) * 100) : 0;
  const dominantDir: Direction = ups > downs ? 'up' : downs > ups ? 'down' : 'flat';

  if (loading) {
    return (
      <div className="bg-[#141425] border border-[#2a2a3e] rounded-lg p-3 text-center">
        <div className="text-[11px] text-[#8888a0] animate-pulse">MTF trend hesaplanıyor...</div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="bg-[#141425] border border-[#2a2a3e] rounded-lg p-3 text-center">
        <div className="text-[11px] text-[#ef5350]">MTF verisi alınamadı.</div>
      </div>
    );
  }

  return (
    <div className={`bg-[#141425] border border-[#2a2a3e] rounded-lg ${compact ? 'p-2' : 'p-3'}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-semibold text-[#8888a0] uppercase tracking-wider flex items-center gap-1.5`}>
          <span className="w-1 h-3 bg-[#4fc3f7] rounded" />
          📈 Çoklu Zaman Dilimi Trendi · {symbol}
        </h4>
        <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} font-mono`}>
          Kalite:{' '}
          <span className={qualityPct >= 75 ? 'text-[#26a69a]' : qualityPct >= 50 ? 'text-[#ffa726]' : 'text-[#ef5350]'}>
            %{qualityPct}
          </span>
        </span>
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {results.map((r) => (
          <div
            key={r.id}
            className="bg-[#0d0d1a] border border-[#1a1a2e] rounded p-2 text-center"
            title={`${r.label}: ${r.pctChange >= 0 ? '+' : ''}${r.pctChange.toFixed(2)}%`}
          >
            <div className="text-[9px] text-[#8888a0] uppercase">{r.label}</div>
            <div className="text-[18px] leading-tight">
              {r.direction === 'up' ? '🟢' : r.direction === 'down' ? '🔴' : '⚪'}
            </div>
            <div className={`text-[9px] font-mono ${
              r.direction === 'up' ? 'text-[#26a69a]' :
              r.direction === 'down' ? 'text-[#ef5350]' :
              'text-[#8888a0]'
            }`}>
              {r.pctChange >= 0 ? '+' : ''}{r.pctChange.toFixed(2)}%
            </div>
          </div>
        ))}
      </div>

      <div className={`mt-2 ${compact ? 'text-[9px]' : 'text-[10px]'} text-[#8888a0] italic border-t border-[#1a1a2e] pt-1.5`}>
        {qualityPct >= 75
          ? `✅ Tüm zaman dilimleri ${dominantDir === 'up' ? 'yukarı' : 'aşağı'} hizalı — güçlü trend, pozisyon büyütülebilir.`
          : qualityPct >= 50
          ? '🟡 Çoğunluk hizalı ama karışım var — dikkatli pozisyon.'
          : '⚠️ Karışık sinyal — range modu, breakout bekle.'}
      </div>
    </div>
  );
}

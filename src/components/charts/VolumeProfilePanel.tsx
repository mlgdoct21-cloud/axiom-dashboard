'use client';

/**
 * VolumeProfilePanel — Faz E.1 VPVR (Volume Profile Visible Range).
 *
 * Fiyat-bazlı hacim profili. Klasik time-axis hacim çubukları yerine fiyat
 * seviyelerine göre kümülatif hacim dağılımı gösterir.
 *
 * Hesap mantığı:
 *   1. Görünen aralıktaki tüm candle'lardan price min/max bul
 *   2. Aralığı N bin'e böl (default 30)
 *   3. Her candle'ın hacmini geçtiği fiyat bantlarına eşit dağıt (low→high)
 *   4. POC = en yüksek hacimli bant ("Point of Control")
 *   5. Value Area = toplam hacmin %70'ini kapsayan en dar aralık (POC etrafında)
 *
 * Görsel: Yatay bar chart, POC vurgulu, Value Area gri shading.
 * Lightweight Charts'ın native VPVR'ı yok — saf React + CSS, bağımsız panel.
 */

import { useEffect, useMemo, useState } from 'react';

interface Candle {
  time?: number;
  open?: number;
  high: number;
  low: number;
  close?: number;
  volume: number;
}

interface VolumeProfilePanelProps {
  symbol: string;
  resolution: string;
  /** Bin sayısı — 20-50 önerilir. 30 default. */
  bins?: number;
  /** Görünür yükseklik (px). Default 320. */
  height?: number;
}

interface ProfileBin {
  priceLow: number;
  priceHigh: number;
  priceMid: number;
  volume: number;
  isPOC: boolean;
  inValueArea: boolean;
}

function computeProfile(candles: Candle[], binCount: number): ProfileBin[] {
  if (!candles || candles.length === 0) return [];

  const allLows = candles.map((c) => c.low).filter(Number.isFinite);
  const allHighs = candles.map((c) => c.high).filter(Number.isFinite);
  if (!allLows.length || !allHighs.length) return [];

  const min = Math.min(...allLows);
  const max = Math.max(...allHighs);
  if (max <= min) return [];

  const binSize = (max - min) / binCount;
  const bins: ProfileBin[] = Array.from({ length: binCount }, (_, i) => ({
    priceLow: min + i * binSize,
    priceHigh: min + (i + 1) * binSize,
    priceMid: min + (i + 0.5) * binSize,
    volume: 0,
    isPOC: false,
    inValueArea: false,
  }));

  // Her candle'ın hacmini geçtiği bantlara eşit dağıt
  for (const c of candles) {
    if (!Number.isFinite(c.high) || !Number.isFinite(c.low) || !Number.isFinite(c.volume)) continue;
    const lo = c.low;
    const hi = c.high;
    const vol = c.volume;
    if (vol <= 0 || hi <= lo) continue;
    const lowBin = Math.max(0, Math.floor((lo - min) / binSize));
    const highBin = Math.min(binCount - 1, Math.floor((hi - min) / binSize));
    const span = highBin - lowBin + 1;
    const perBin = vol / span;
    for (let i = lowBin; i <= highBin; i++) {
      bins[i].volume += perBin;
    }
  }

  // POC: en yüksek hacim
  const totalVolume = bins.reduce((acc, b) => acc + b.volume, 0);
  if (totalVolume === 0) return bins;
  let pocIdx = 0;
  let pocVol = bins[0].volume;
  for (let i = 1; i < bins.length; i++) {
    if (bins[i].volume > pocVol) {
      pocVol = bins[i].volume;
      pocIdx = i;
    }
  }
  bins[pocIdx].isPOC = true;

  // Value Area: POC etrafında genişleyerek toplam %70 hacme ulaş
  let vaVolume = bins[pocIdx].volume;
  let lo = pocIdx;
  let hi = pocIdx;
  const target = totalVolume * 0.7;
  while (vaVolume < target && (lo > 0 || hi < bins.length - 1)) {
    const goUp = hi < bins.length - 1 ? bins[hi + 1].volume : -1;
    const goDown = lo > 0 ? bins[lo - 1].volume : -1;
    if (goUp >= goDown) {
      hi += 1;
      vaVolume += bins[hi].volume;
    } else {
      lo -= 1;
      vaVolume += bins[lo].volume;
    }
  }
  for (let i = lo; i <= hi; i++) {
    bins[i].inValueArea = true;
  }

  return bins;
}

export default function VolumeProfilePanel({
  symbol,
  resolution,
  bins = 30,
  height = 320,
}: VolumeProfilePanelProps) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(
          `/api/candles?symbol=${encodeURIComponent(symbol)}&resolution=${encodeURIComponent(resolution)}`
        );
        if (!r.ok) {
          setError(`HTTP ${r.status}`);
          return;
        }
        const body = await r.json();
        const arr: Candle[] = body.candles || [];
        if (!cancelled) setCandles(arr);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'fetch_failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [symbol, resolution]);

  const profile = useMemo(() => computeProfile(candles, bins), [candles, bins]);
  const maxVolume = useMemo(() => Math.max(...profile.map((b) => b.volume), 0), [profile]);
  const lastClose = candles.length ? candles[candles.length - 1].close ?? candles[candles.length - 1].high : null;

  if (loading) {
    return (
      <div className="bg-[#141425] border border-[#2a2a3e] rounded-lg p-4 text-center" style={{ height }}>
        <div className="text-[12px] text-[#8888a0] animate-pulse">Hacim profili hesaplanıyor...</div>
      </div>
    );
  }

  if (error || profile.length === 0) {
    return (
      <div className="bg-[#141425] border border-[#2a2a3e] rounded-lg p-4 text-center" style={{ height }}>
        <div className="text-[12px] text-[#ef5350]">
          {error ? `Hata: ${error}` : 'Profil hesaplanamadı (veri yetersiz).'}
        </div>
      </div>
    );
  }

  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(0));

  return (
    <div className="bg-[#141425] border border-[#2a2a3e] rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[11px] font-semibold text-[#8888a0] uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-1 h-3 bg-[#4fc3f7] rounded" />
          📊 Hacim Profili (VPVR) · {symbol} · {resolution}
        </h4>
        <span className="text-[9px] text-[#555570] italic">
          POC = en çok hacim · Value Area (%70) gri bant
        </span>
      </div>

      <div className="flex flex-col-reverse gap-px" style={{ height }}>
        {profile.map((b, i) => {
          const widthPct = maxVolume > 0 ? (b.volume / maxVolume) * 100 : 0;
          const isAtCurrent = lastClose != null && lastClose >= b.priceLow && lastClose < b.priceHigh;
          return (
            <div
              key={i}
              className={`flex items-center gap-2 px-1 transition-colors ${
                b.inValueArea ? 'bg-[#1a1a2e]/60' : ''
              }`}
              style={{ flex: '1 1 0', minHeight: 8 }}
              title={`$${b.priceLow.toFixed(0)}-${b.priceHigh.toFixed(0)} · vol ${fmt(b.volume)}`}
            >
              <div className="text-[9px] font-mono text-[#8888a0] w-14 shrink-0 text-right">
                ${fmt(b.priceMid)}
              </div>
              <div className="flex-1 h-full flex items-center">
                <div
                  className={`h-full rounded-r transition-all ${
                    b.isPOC
                      ? 'bg-[#ffa726]'
                      : b.inValueArea
                      ? 'bg-[#4fc3f7]/70'
                      : 'bg-[#4fc3f7]/30'
                  }`}
                  style={{ width: `${widthPct}%` }}
                />
                {b.isPOC && (
                  <span className="ml-1 text-[8px] font-bold text-[#ffa726] uppercase">POC</span>
                )}
                {isAtCurrent && !b.isPOC && (
                  <span className="ml-1 text-[8px] font-bold text-[#e0e0e0]">← şimdi</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 text-[10px] text-[#8888a0] italic border-t border-[#1a1a2e] pt-2">
        POC seviyesi piyasanın "adil değer" biçtiği fiyat. Fiyat POC altında → düşüş yönü;
        üstünde → yükseliş. Value Area (gri bant) %70 hacmin yoğunlaştığı aralık —
        fiyat bu aralıktan çıkmadıkça range'de kalır.
      </div>
    </div>
  );
}

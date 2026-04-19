'use client';

import { useEffect, useState } from 'react';

interface TechnicalsTabProps {
  symbol: string;
  locale: 'en' | 'tr';
}

interface Technicals {
  rsi?: number;
  macd?: {
    value?: number;
    signal?: number;
    histogram?: number;
    status?: string;
  };
  bb?: {
    upper?: number;
    middle?: number;
    lower?: number;
    position?: string;
  };
  ma?: {
    sma50?: number;
    sma200?: number;
    status?: string;
  };
  price?: number;
}

function RSIGauge({ value }: { value: number }) {
  const getColor = () => {
    if (value > 70) return '#ff4757'; // Overbought
    if (value < 30) return '#4fc3f7'; // Oversold
    return '#ff9800'; // Neutral
  };

  const getStatus = (locale: 'en' | 'tr') => {
    if (value > 70) return locale === 'tr' ? 'Aşırı Alındı' : 'Overbought';
    if (value < 30) return locale === 'tr' ? 'Aşırı Satıldı' : 'Oversold';
    return locale === 'tr' ? 'Nötr' : 'Neutral';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between">
        <div className="text-3xl font-bold text-[#e0e0e0]">{value.toFixed(1)}</div>
        <span style={{ color: getColor() }} className="text-sm font-semibold">
          {getStatus('en')}
        </span>
      </div>

      {/* RSI Bar */}
      <div className="relative h-6 bg-[#0f0f20] rounded overflow-hidden border border-[#2a2a3e]">
        <div className="absolute left-0 top-0 bottom-0 w-1/3 bg-[#4fc3f7]/10" />
        <div className="absolute left-1/3 top-0 bottom-0 w-1/3 bg-[#ff9800]/10" />
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[#ff4757]/10" />

        {/* Current RSI Marker */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-[#fff]"
          style={{ left: `${(value / 100) * 100}%` }}
        />

        {/* Zone Labels */}
        <div className="absolute left-0 top-0 text-[8px] text-[#4fc3f7] font-semibold px-1">
          OS
        </div>
        <div className="absolute left-1/3 top-0 text-[8px] text-[#ff9800] font-semibold px-1">
          NEUTRAL
        </div>
        <div className="absolute right-0 top-0 text-[8px] text-[#ff4757] font-semibold px-1">
          OB
        </div>
      </div>

      <div className="flex justify-between text-[8px] text-[#666680] mt-1">
        <span>0</span>
        <span>30</span>
        <span>50</span>
        <span>70</span>
        <span>100</span>
      </div>
    </div>
  );
}

export default function TechnicalsTab({ symbol, locale }: TechnicalsTabProps) {
  const [technicals, setTechnicals] = useState<Technicals | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stock/technicals?symbol=${symbol}`);
        if (res.ok) {
          const data = await res.json();
          setTechnicals(data);
        }
      } catch (e) {
        console.error('Failed to load technicals:', e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [symbol]);

  if (loading) {
    return (
      <div className="p-5 space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-3">
            <div className="h-4 bg-[#2a2a3e] rounded w-32 animate-pulse" />
            <div className="h-20 bg-[#2a2a3e] rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!technicals) {
    return (
      <div className="p-5 text-[#8888a0] text-sm text-center">
        {locale === 'tr' ? 'Veri yüklenemedi' : 'Failed to load data'}
      </div>
    );
  }

  return (
    <div className="p-5 space-y-6">
      {/* RSI */}
      <div>
        <h3 className="text-[11px] text-[#ff9800] uppercase font-semibold tracking-wider mb-3">
          {locale === 'tr' ? 'Göreceli Güç Endeksi (RSI)' : 'Relative Strength Index (RSI)'}
        </h3>
        <div className="bg-[#0f0f20] rounded-lg p-4 border border-[#2a2a3e]">
          {technicals.rsi !== undefined ? (
            <RSIGauge value={technicals.rsi} />
          ) : (
            <div className="text-[#8888a0] text-sm">{locale === 'tr' ? 'Veri yok' : 'No data'}</div>
          )}
        </div>
      </div>

      {/* MACD */}
      <div className="pt-4 border-t border-[#2a2a3e]">
        <h3 className="text-[11px] text-[#ff9800] uppercase font-semibold tracking-wider mb-3">
          MACD
        </h3>
        <div className="space-y-3">
          {technicals.macd ? (
            <>
              <div className="flex items-center justify-between bg-[#0f0f20] rounded-lg p-4 border border-[#2a2a3e]">
                <div>
                  <div className="text-[10px] text-[#8888a0] mb-1">
                    {locale === 'tr' ? 'MACD Değeri' : 'MACD Line'}
                  </div>
                  <div className="text-lg font-semibold text-[#e0e0e0]">
                    {technicals.macd.value?.toFixed(4) || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#8888a0] mb-1">
                    {locale === 'tr' ? 'Signal' : 'Signal'}
                  </div>
                  <div className="text-lg font-semibold text-[#e0e0e0]">
                    {technicals.macd.signal?.toFixed(4) || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between bg-[#0f0f20] rounded-lg p-4 border border-[#2a2a3e]">
                <div>
                  <div className="text-[10px] text-[#8888a0] mb-1">
                    {locale === 'tr' ? 'Histogram' : 'Histogram'}
                  </div>
                  <div className="text-lg font-semibold text-[#e0e0e0]">
                    {technicals.macd.histogram?.toFixed(4) || 'N/A'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[#8888a0] mb-1">
                    {locale === 'tr' ? 'Durum' : 'Status'}
                  </div>
                  <div
                    style={{
                      color:
                        technicals.macd.status === 'bullish'
                          ? '#4fc3f7'
                          : '#ff4757',
                    }}
                    className="text-lg font-semibold"
                  >
                    {technicals.macd.status === 'bullish'
                      ? locale === 'tr'
                        ? '↑ Yükselişçi'
                        : '↑ Bullish'
                      : locale === 'tr'
                        ? '↓ Düşüşçü'
                        : '↓ Bearish'}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-[#8888a0] text-sm">{locale === 'tr' ? 'Veri yok' : 'No data'}</div>
          )}
        </div>
      </div>

      {/* Bollinger Bands */}
      <div className="pt-4 border-t border-[#2a2a3e]">
        <h3 className="text-[11px] text-[#ff9800] uppercase font-semibold tracking-wider mb-3">
          {locale === 'tr' ? 'Bollinger Bantları' : 'Bollinger Bands'}
        </h3>
        <div className="space-y-2">
          {technicals.bb ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#0f0f20] rounded-lg p-3 border border-[#2a2a3e]">
                  <div className="text-[10px] text-[#8888a0] mb-1">
                    {locale === 'tr' ? 'Üst Bant' : 'Upper'}
                  </div>
                  <div className="text-sm font-semibold text-[#ff4757]">
                    {technicals.bb.upper?.toFixed(2) || 'N/A'}
                  </div>
                </div>
                <div className="bg-[#0f0f20] rounded-lg p-3 border border-[#2a2a3e]">
                  <div className="text-[10px] text-[#8888a0] mb-1">
                    {locale === 'tr' ? 'Orta' : 'Middle'}
                  </div>
                  <div className="text-sm font-semibold text-[#ff9800]">
                    {technicals.bb.middle?.toFixed(2) || 'N/A'}
                  </div>
                </div>
                <div className="bg-[#0f0f20] rounded-lg p-3 border border-[#2a2a3e]">
                  <div className="text-[10px] text-[#8888a0] mb-1">
                    {locale === 'tr' ? 'Alt Bant' : 'Lower'}
                  </div>
                  <div className="text-sm font-semibold text-[#4fc3f7]">
                    {technicals.bb.lower?.toFixed(2) || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="bg-[#0f0f20] rounded-lg p-3 border border-[#2a2a3e]">
                <div className="text-[10px] text-[#8888a0] mb-2">
                  {locale === 'tr' ? 'Fiyat Pozisyonu' : 'Price Position'}
                </div>
                <div
                  style={{
                    color:
                      technicals.bb.position === 'overbought'
                        ? '#ff4757'
                        : technicals.bb.position === 'oversold'
                          ? '#4fc3f7'
                          : '#ff9800',
                  }}
                  className="text-sm font-semibold"
                >
                  {technicals.bb.position === 'overbought'
                    ? locale === 'tr'
                      ? 'Aşırı Alındı'
                      : 'Overbought'
                    : technicals.bb.position === 'oversold'
                      ? locale === 'tr'
                        ? 'Aşırı Satıldı'
                        : 'Oversold'
                      : locale === 'tr'
                        ? 'Orta Bölgede'
                        : 'In Middle Band'}
                </div>
              </div>
            </>
          ) : (
            <div className="text-[#8888a0] text-sm">{locale === 'tr' ? 'Veri yok' : 'No data'}</div>
          )}
        </div>
      </div>

      {/* Moving Averages */}
      <div className="pt-4 border-t border-[#2a2a3e]">
        <h3 className="text-[11px] text-[#ff9800] uppercase font-semibold tracking-wider mb-3">
          {locale === 'tr' ? 'Hareketli Ortalamalar' : 'Moving Averages'}
        </h3>
        <div className="space-y-2">
          {technicals.ma ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#0f0f20] rounded-lg p-3 border border-[#2a2a3e]">
                  <div className="text-[10px] text-[#8888a0] mb-1">SMA 50</div>
                  <div className="text-sm font-semibold text-[#e0e0e0]">
                    ${technicals.ma.sma50?.toFixed(2) || 'N/A'}
                  </div>
                </div>
                <div className="bg-[#0f0f20] rounded-lg p-3 border border-[#2a2a3e]">
                  <div className="text-[10px] text-[#8888a0] mb-1">SMA 200</div>
                  <div className="text-sm font-semibold text-[#e0e0e0]">
                    ${technicals.ma.sma200?.toFixed(2) || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="bg-[#0f0f20] rounded-lg p-3 border border-[#2a2a3e]">
                <div className="text-[10px] text-[#8888a0] mb-2">
                  {locale === 'tr' ? '50/200 Durumu' : 'Golden Cross Status'}
                </div>
                <div
                  style={{
                    color: technicals.ma.status === 'bullish' ? '#4fc3f7' : '#ff4757',
                  }}
                  className="text-sm font-semibold"
                >
                  {technicals.ma.status === 'bullish'
                    ? locale === 'tr'
                      ? '✓ Yükselişçi (50 > 200)'
                      : '✓ Bullish (50 > 200)'
                    : locale === 'tr'
                      ? '✗ Düşüşçü (50 < 200)'
                      : '✗ Bearish (50 < 200)'}
                </div>
              </div>
            </>
          ) : (
            <div className="text-[#8888a0] text-sm">{locale === 'tr' ? 'Veri yok' : 'No data'}</div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { isBIST } from '@/lib/bist-symbols';

interface StockHeaderProps {
  symbol: string;
  locale: 'en' | 'tr';
}

interface StockInfo {
  name: string;
  sector: string;
  industry: string;
  country: string;
  founded?: number;
  price: number;
  priceChange?: number;
  priceChangePercent?: number;
  marketCap?: number;
  currency?: string;
  market?: 'US' | 'TR';
  delayed?: boolean;
  delayedMinutes?: number;
}

export default function StockHeader({ symbol, locale }: StockHeaderProps) {
  const [info, setInfo] = useState<StockInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stock/fundamentals?symbol=${symbol}`);
        if (res.ok) {
          const data = await res.json();
          setInfo(data);
        }
      } catch (e) {
        console.error('Failed to load stock info:', e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [symbol]);

  if (loading) {
    return (
      <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-5 animate-pulse">
        <div className="h-8 bg-[#2a2a3e] rounded w-40 mb-3" />
        <div className="h-4 bg-[#2a2a3e] rounded w-60" />
      </div>
    );
  }

  if (!info) {
    return (
      <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-5 text-[#8888a0]">
        {locale === 'tr' ? 'Bilgi yüklenemedi' : 'Failed to load info'}
      </div>
    );
  }

  const changePercent = info.priceChangePercent || 0;
  const isPositive = changePercent >= 0;
  const changeColor = isPositive ? '#4fc3f7' : '#ff4757';
  const changeArrow = isPositive ? '↑' : '↓';

  const market: 'US' | 'TR' = info.market || (isBIST(symbol) ? 'TR' : 'US');
  const isTR = market === 'TR';
  const currencySymbol = isTR ? '₺' : '$';
  const currencyCode = info.currency || (isTR ? 'TRY' : 'USD');

  const formatMarketCap = (cap?: number) => {
    if (!cap) return 'N/A';
    const c = currencySymbol;
    if (cap >= 1e12) return `${c}${(cap / 1e12).toFixed(1)}T`;
    if (cap >= 1e9) return `${c}${(cap / 1e9).toFixed(1)}B`;
    if (cap >= 1e6) return `${c}${(cap / 1e6).toFixed(1)}M`;
    return `${c}${cap}`;
  };

  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-5 space-y-3">
      {/* Title + Price */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-[#e0e0e0]">{symbol}</h2>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                isTR
                  ? 'bg-[#e30a17]/20 text-[#ff6b6b] border border-[#e30a17]/40'
                  : 'bg-[#1f4e79]/20 text-[#4fc3f7] border border-[#1f4e79]/40'
              }`}
            >
              {isTR ? '🇹🇷 BIST' : '🇺🇸 US'}
            </span>
            {info.delayed && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded bg-[#3a3a4e] text-[#a0a0b0] border border-[#4a4a5e]"
                title={locale === 'tr' ? 'Veri ~15 dakika gecikmeli' : 'Data delayed by ~15 minutes'}
              >
                {locale === 'tr' ? '15dk' : '15m'} delay
              </span>
            )}
          </div>
          <p className="text-sm text-[#8888a0]">{info.name}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-[#e0e0e0]">
            {currencySymbol}{info.price.toFixed(2)}
          </div>
          <div style={{ color: changeColor }} className="text-lg font-semibold">
            {changeArrow} {Math.abs(changePercent).toFixed(2)}%
          </div>
          {isTR && (
            <div className="text-[10px] text-[#666680] mt-0.5">{currencyCode}</div>
          )}
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-[#2a2a3e]">
        <div>
          <div className="text-[10px] text-[#8888a0] uppercase tracking-wider mb-1">
            {locale === 'tr' ? 'Sektör' : 'Sector'}
          </div>
          <div className="text-sm font-semibold text-[#4fc3f7]">{info.sector}</div>
        </div>

        <div>
          <div className="text-[10px] text-[#8888a0] uppercase tracking-wider mb-1">
            {locale === 'tr' ? 'Endüstri' : 'Industry'}
          </div>
          <div className="text-sm font-semibold text-[#e0e0e0]">{info.industry}</div>
        </div>

        <div>
          <div className="text-[10px] text-[#8888a0] uppercase tracking-wider mb-1">
            {locale === 'tr' ? 'Pazar Değeri' : 'Market Cap'}
          </div>
          <div className="text-sm font-semibold text-[#e0e0e0]">
            {formatMarketCap(info.marketCap)}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-[#8888a0] uppercase tracking-wider mb-1">
            {locale === 'tr' ? 'Ülke' : 'Country'}
          </div>
          <div className="text-sm font-semibold text-[#e0e0e0]">{info.country}</div>
        </div>
      </div>

      {/* Founded */}
      {info.founded && (
        <div className="text-xs text-[#666680] pt-2 border-t border-[#2a2a3e]">
          {locale === 'tr' ? 'Kuruldu' : 'Founded'}: {info.founded}
        </div>
      )}
    </div>
  );
}

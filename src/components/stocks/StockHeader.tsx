'use client';

import { useEffect, useState } from 'react';

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

  const formatMarketCap = (cap?: number) => {
    if (!cap) return 'N/A';
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(1)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(1)}M`;
    return `$${cap}`;
  };

  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-5 space-y-3">
      {/* Title + Price */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#e0e0e0]">{symbol}</h2>
          <p className="text-sm text-[#8888a0]">{info.name}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-[#e0e0e0]">
            ${info.price.toFixed(2)}
          </div>
          <div style={{ color: changeColor }} className="text-lg font-semibold">
            {changeArrow} {Math.abs(changePercent).toFixed(2)}%
          </div>
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

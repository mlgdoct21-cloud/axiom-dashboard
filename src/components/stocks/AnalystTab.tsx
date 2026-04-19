'use client';

import { useEffect, useState } from 'react';

interface AnalystTabProps {
  symbol: string;
  name: string;
  sector: string;
  locale: 'en' | 'tr';
}

interface AIRecommendation {
  recommendation: 'BUY' | 'HOLD' | 'SELL';
  confidence: number;
  confidence_percent: number;
  targetPrice?: number;
  targetPriceChange?: number;
  rationale: string;
  keyStrengths: string[];
  risks: string[];
  investorStance: string;
  riskRating: string;
}

export default function AnalystTab({
  symbol,
  name,
  sector,
  locale,
}: AnalystTabProps) {
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generate = async () => {
      setLoading(true);
      try {
        // Fetch necessary data
        const [fundRes, techRes, earRes] = await Promise.all([
          fetch(`/api/stock/fundamentals?symbol=${symbol}`),
          fetch(`/api/stock/technicals?symbol=${symbol}`),
          fetch(`/api/stock/earnings?symbol=${symbol}`),
        ]);

        const fundamentals = fundRes.ok ? await fundRes.json() : {};
        const technicals = techRes.ok ? await techRes.json() : {};
        const earnings = earRes.ok ? await earRes.json() : {};

        // Call AI analysis endpoint
        const res = await fetch('/api/stock/analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol,
            name,
            price: fundamentals.price || 0,
            sector,
            fundamentals: {
              pe: fundamentals.pe,
              roe: fundamentals.roe,
              debtToEquity: fundamentals.debtToEquity,
              fcf: fundamentals.fcf,
              dividendYield: fundamentals.dividendYield,
              earningsGrowth: fundamentals.earningsGrowth,
            },
            technicals: {
              rsi: technicals.rsi,
              macdStatus: technicals.macd?.status,
              bbPosition: technicals.bb?.position,
              maStatus: technicals.ma?.status,
            },
            earnings: {
              nextDate: earnings.nextEarnings?.date,
              daysUntil: earnings.nextEarnings?.daysUntil,
              historicalSurprises: earnings.historicalSurprises?.map(
                (e: any) => e.surprise
              ),
            },
            news: [], // Could add recent news here
            locale,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setRecommendation(data);
        }
      } catch (e) {
        console.error('Failed to generate analysis:', e);
      } finally {
        setLoading(false);
      }
    };

    generate();
  }, [symbol, name, sector, locale]);

  if (loading) {
    return (
      <div className="p-5 space-y-6">
        <div className="h-32 bg-[#2a2a3e] rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-4 bg-[#2a2a3e] rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!recommendation) {
    return (
      <div className="p-5 text-[#8888a0] text-sm text-center">
        {locale === 'tr' ? 'Analiz oluşturulamadı' : 'Failed to generate analysis'}
      </div>
    );
  }

  const getRecommendationColor = () => {
    switch (recommendation.recommendation) {
      case 'BUY':
        return '#4fc3f7';
      case 'SELL':
        return '#ff4757';
      default:
        return '#ff9800';
    }
  };

  const getRecommendationLabel = () => {
    const labels: Record<string, Record<string, string>> = {
      BUY: { en: 'BUY', tr: 'AL' },
      SELL: { en: 'SELL', tr: 'SAT' },
      HOLD: { en: 'HOLD', tr: 'TUTUN' },
    };
    return labels[recommendation.recommendation]?.[locale] || recommendation.recommendation;
  };

  const getRiskColor = () => {
    switch (recommendation.riskRating) {
      case 'LOW':
        return '#4fc3f7';
      case 'HIGH':
        return '#ff4757';
      default:
        return '#ff9800';
    }
  };

  return (
    <div className="p-5 space-y-6">
      {/* Big Recommendation Badge */}
      <div
        className="rounded-lg p-8 text-center border-2"
        style={{
          backgroundColor: getRecommendationColor() + '15',
          borderColor: getRecommendationColor(),
        }}
      >
        <div className="text-sm text-[#8888a0] mb-2">
          {locale === 'tr' ? 'AXIOM Tavsiyesi' : 'AXIOM Recommendation'}
        </div>
        <div
          style={{ color: getRecommendationColor() }}
          className="text-5xl font-black mb-2"
        >
          {getRecommendationLabel()}
        </div>
        <div className="text-sm text-[#c0c0d0]">
          {locale === 'tr' ? 'Güven:' : 'Confidence:'}{' '}
          <span
            style={{ color: getRecommendationColor() }}
            className="font-bold"
          >
            {recommendation.confidence_percent}%
          </span>
        </div>
      </div>

      {/* Confidence Meter */}
      <div className="bg-[#0f0f20] rounded-lg p-4 border border-[#2a2a3e]">
        <div className="text-[10px] text-[#8888a0] uppercase mb-2">
          {locale === 'tr' ? 'Güven Seviyesi' : 'Confidence Level'}
        </div>
        <div className="h-2 bg-[#1a1a2e] rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${recommendation.confidence_percent}%`,
              backgroundColor: getRecommendationColor(),
            }}
          />
        </div>
      </div>

      {/* Target Price */}
      {recommendation.targetPrice && (
        <div className="bg-[#0f0f20] rounded-lg p-4 border border-[#2a2a3e]">
          <div className="text-[10px] text-[#8888a0] uppercase mb-2">
            {locale === 'tr' ? 'Hedef Fiyat' : 'Target Price'}
          </div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-[#e0e0e0]">
              ${recommendation.targetPrice.toFixed(2)}
            </div>
            {recommendation.targetPriceChange !== undefined && (
              <div
                style={{
                  color:
                    recommendation.targetPriceChange > 0 ? '#4fc3f7' : '#ff4757',
                }}
                className="text-lg font-semibold"
              >
                {recommendation.targetPriceChange > 0 ? '+' : ''}
                {(recommendation.targetPriceChange * 100).toFixed(1)}%
              </div>
            )}
          </div>
        </div>
      )}

      {/* Risk Rating */}
      <div className="bg-[#0f0f20] rounded-lg p-4 border border-[#2a2a3e]">
        <div className="text-[10px] text-[#8888a0] uppercase mb-2">
          {locale === 'tr' ? 'Risk Derecelendirmesi' : 'Risk Rating'}
        </div>
        <div style={{ color: getRiskColor() }} className="text-lg font-bold">
          {recommendation.riskRating}
        </div>
      </div>

      {/* Rationale */}
      <div className="pt-4 border-t border-[#2a2a3e]">
        <h3 className="text-[11px] text-[#ff9800] uppercase font-semibold tracking-wider mb-3">
          {locale === 'tr' ? 'Analiz' : 'Analysis'}
        </h3>
        <p className="text-[#c0c0d0] text-sm leading-relaxed whitespace-pre-line">
          {recommendation.rationale}
        </p>
      </div>

      {/* Key Strengths */}
      {recommendation.keyStrengths && recommendation.keyStrengths.length > 0 && (
        <div>
          <h3 className="text-[11px] text-[#4fc3f7] uppercase font-semibold tracking-wider mb-3">
            ✓ {locale === 'tr' ? 'Temel Güçler' : 'Key Strengths'}
          </h3>
          <ul className="space-y-2">
            {recommendation.keyStrengths.map((strength, i) => (
              <li key={i} className="flex gap-3 text-sm text-[#c0c0d0]">
                <span className="text-[#4fc3f7] font-bold flex-shrink-0">✓</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risks */}
      {recommendation.risks && recommendation.risks.length > 0 && (
        <div className="pt-4 border-t border-[#2a2a3e]">
          <h3 className="text-[11px] text-[#ff4757] uppercase font-semibold tracking-wider mb-3">
            ⚠ {locale === 'tr' ? 'Riskler' : 'Risks'}
          </h3>
          <ul className="space-y-2">
            {recommendation.risks.map((risk, i) => (
              <li key={i} className="flex gap-3 text-sm text-[#c0c0d0]">
                <span className="text-[#ff4757] font-bold flex-shrink-0">⚠</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Investor Stance */}
      <div className="pt-4 border-t border-[#2a2a3e] bg-[#0f0f20] rounded-lg p-4">
        <div className="text-[10px] text-[#8888a0] uppercase mb-2">
          {locale === 'tr' ? 'Yatırımcı Duruşu' : 'Investor Stance'}
        </div>
        <div className="text-lg font-bold text-[#ff9800]">
          {recommendation.investorStance}
        </div>
        <div className="text-xs text-[#8888a0] mt-2">
          {recommendation.investorStance === 'ACCUMULATE' &&
            (locale === 'tr'
              ? 'Konumunuzu artırmaya devam edin'
              : 'Continue to accumulate positions')}
          {recommendation.investorStance === 'HOLD' &&
            (locale === 'tr'
              ? 'Mevcut konumlarınızı tutun'
              : 'Hold current positions')}
          {recommendation.investorStance === 'REDUCE' &&
            (locale === 'tr'
              ? 'Konumunuzu azaltmayı düşünün'
              : 'Consider reducing positions')}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-xs text-[#666680] text-center pt-4 border-t border-[#2a2a3e]">
        {locale === 'tr'
          ? '⚠ Bu analiz eğitim amaçlıdır. Yatırım kararları almadan önce kendi araştırmanızı yapınız.'
          : '⚠ For educational purposes only. Do your own research before making investment decisions.'}
      </div>
    </div>
  );
}

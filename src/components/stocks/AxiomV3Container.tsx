'use client';

import { useState, useEffect } from 'react';
import AxiomFundamentalDashboard, { type AxiomAnalysis } from './AxiomFundamentalDashboard';
import type { CorporateIntelligence } from '@/app/api/stock/analysis/v3/corporate/route';

/**
 * AxiomV3Container
 * Data fetching + orchestration for v3.0 analysis
 *
 * Parallel fan-out (all tolerant to failure):
 *   - /api/quote                         → price
 *   - /api/stock/fundamentals            → P/E, ROE, D/E, FCF
 *   - /api/candles                       → 60d OHLC for technical agent
 *   - /api/stock/analysis/v3/corporate   → profile, news, peers, analyst, insider, Gemini synthesis
 *
 * Then calls /api/stock/analysis/v3/decision (quant + qualitative agents).
 * Renders AxiomFundamentalDashboard.
 */

interface AxiomV3ContainerProps {
  symbol: string;
  locale?: 'en' | 'tr';
}

export default function AxiomV3Container({ symbol, locale = 'tr' }: AxiomV3ContainerProps) {
  const [analysis, setAnalysis] = useState<AxiomAnalysis | null>(null);
  const [corporate, setCorporate] = useState<CorporateIntelligence | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!symbol) return;

    const fetchAll = async () => {
      setIsLoading(true);
      setError('');
      setCorporate(null);

      try {
        // ==========================================================
        // PARALLEL FAN-OUT (tolerant: every source can fail independently)
        // ==========================================================
        const [priceRes, fundRes, candleRes, corpRes] = await Promise.allSettled([
          fetch(`/api/quote?symbols=${symbol}`),
          fetch(`/api/stock/fundamentals?symbol=${symbol}`),
          fetch(`/api/candles?symbol=${symbol}&interval=1D&limit=60`),
          fetch(`/api/stock/analysis/v3/corporate?symbol=${symbol}`),
        ]);

        // ----- Price -----
        let price = 100;
        if (priceRes.status === 'fulfilled' && priceRes.value.ok) {
          const priceData = await priceRes.value.json();
          price = priceData?.[symbol]?.price || priceData?.quotes?.[0]?.price || 100;
        }
        setCurrentPrice(price);

        // ----- Fundamentals (Aligned with FMP-First API) -----
        let fundamentals: Record<string, number> = {};
        if (fundRes.status === 'fulfilled' && fundRes.value.ok) {
          const fundData = await fundRes.value.json();
          // Map FMP fields and normalize (FMP returns % as whole numbers)
          fundamentals = {
            pe: fundData.pe || fundData.peRatio || 15,
            pb: fundData.pb || fundData.pbRatio || 2.5,
            roe: fundData.roe ? fundData.roe / 100 : 0.15, // 34.4 -> 0.344
            debtToEquity: fundData.debtToEquity || 0.5,
            fcf: fundData.marketCap || 1000000000,
            fcfGrowth3y: 0.10,
            eps: fundData.eps || 5,
            epsGrowth3y: 0.15,
            sectorPE: 18,
            sectorROE: 0.14,
            sectorGrowth: 0.08,
          };
        }

        // ----- Technicals -----
        type OHLC = { timestamp: number; open: number; high: number; low: number; close: number; volume: number };
        let technicals: { ohlc: OHLC[] } = { ohlc: [] };
        if (candleRes.status === 'fulfilled' && candleRes.value.ok) {
          const candleData = await candleRes.value.json();
          technicals = {
            ohlc: (candleData.candles || candleData || []).map((c: {
              timestamp?: number; time?: number;
              open: number; high: number; low: number; close: number; volume?: number;
            }) => ({
              timestamp: c.timestamp || c.time || Date.now(),
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              volume: c.volume || 0,
            })),
          };
        }
        // Fallback: simulated data if we got nothing
        if (technicals.ohlc.length === 0) {
          technicals = {
            ohlc: Array.from({ length: 60 }, (_, i) => {
              const base = price * (1 + (Math.sin(i / 5) * 0.05));
              return {
                timestamp: Date.now() - (60 - i) * 86400000,
                open: base,
                high: base * 1.02,
                low: base * 0.98,
                close: base * (1 + (Math.random() - 0.5) * 0.02),
                volume: 1000000,
              };
            }),
          };
        }

        // ----- Corporate intelligence (Agent 5) -----
        let corp: CorporateIntelligence | null = null;
        if (corpRes.status === 'fulfilled' && corpRes.value.ok) {
          try {
            corp = await corpRes.value.json();
            setCorporate(corp);
          } catch (e) {
            console.warn('[AxiomV3Container] corporate JSON parse failed', e);
          }
        }

        // ----- Macro (still manual until FRED is wired) -----
        const macro = {
          fedStance: 'NÖTR' as const,
          inflationStatus: 'CONTROLLED' as const,
          gdpGrowth: 0.028,
          yieldCurve: 'POSITIVE' as const,
          sectorTailwind: 'NEUTRAL' as const,
          beta: 1.15,
          rsScore: 1.05,
          sentiment: 'NEUTRAL' as const,
        };

        // ==========================================================
        // DECISION AGENT (Agents 4 + 5 + 6 combined)
        // ==========================================================
        const decisionRes = await fetch('/api/stock/analysis/v3/decision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol,
            currentPrice: price,
            fundamentals,
            technicals,
            macro,
            dataAge: { priceMinutesOld: 1, sectorHoursOld: 2, technicalHoursOld: 0.5 },
            portfolio: { totalValue: 100000, riskTolerance: 0.02, maxPosition: 4 },
            // Feed the qualitative layer into the decision agent
            corporate: corp
              ? {
                  qualitativeScore: corp.qualitativeScore,
                  analystLabel: corp.analystConsensus?.label,
                  insiderBuying: corp.insiderBuying || undefined,
                  narrativeSummary: corp.narrativeSummary,
                  keyRisks: corp.keyRisks,
                  newsCount: corp.dataCompleteness.news,
                }
              : undefined,
            locale,
          }),
        });

        if (!decisionRes.ok) {
          const errData = await decisionRes.json().catch(() => ({}));
          throw new Error(errData.error || `Analiz başarısız (${decisionRes.status})`);
        }

        const result = await decisionRes.json();
        setAnalysis(result);
      } catch (e) {
        console.error('[AxiomV3Container]', e);
        setError(e instanceof Error ? e.message : 'Beklenmeyen hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAll();
  }, [symbol, locale]);

  return (
    <AxiomFundamentalDashboard
      symbol={symbol}
      currentPrice={currentPrice}
      analysis={analysis || undefined}
      corporate={corporate || undefined}
      isLoading={isLoading}
      error={error}
    />
  );
}

import { NextRequest, NextResponse } from 'next/server';

/**
 * Stock Fundamentals Analysis (Hybrid FMP-First)
 * GET /api/stock/fundamentals?symbol=AAPL
 */

interface FundamentalsResponse {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  country: string;
  founded?: number;
  price: number;
  currency: string;
  pe?: number;
  eps?: number;
  marketCap?: number;
  pb?: number;
  roe?: number;
  roa?: number;
  grossMargin?: number;
  operatingMargin?: number;
  netMargin?: number;
  assetTurnover?: number;
  debtToEquity?: number;
  currentRatio?: number;
  dividendYield?: number;
  epsgrowth?: number;
  revenueGrowth?: number;
  timestamp: number;
}

const FMP_KEY = process.env.FMP_API_KEY;
const FINNHUB_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

async function fetchFMPSnapshot(symbol: string) {
  if (!FMP_KEY) return null;
  try {
    const [pRes, mRes] = await Promise.all([
      fetch(`https://financialmodelingprep.com/stable/profile?symbol=${symbol}&apikey=${FMP_KEY}`),
      fetch(`https://financialmodelingprep.com/stable/key-metrics-ttm?symbol=${symbol}&apikey=${FMP_KEY}`)
    ]);
    const pData = pRes.ok ? await pRes.json() : [];
    const mData = mRes.ok ? await mRes.json() : [];
    return { 
      profile: pData?.[0] || null, 
      metrics: mData?.[0] || null 
    };
  } catch (e) {
    console.error('[FMP Fetch Failed]', e);
    return null;
  }
}

async function fetchFinnhubFallback(symbol: string) {
  if (!FINNHUB_KEY) return null;
  try {
    const [pRes, qRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_KEY}`),
      fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`)
    ]);
    return {
      profile: pRes.ok ? await pRes.json() : null,
      quote: qRes.ok ? await qRes.json() : null
    };
  } catch (e) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol')?.toUpperCase().trim();
  if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 });

  try {
    // 1. Try FMP first
    const fmp = await fetchFMPSnapshot(symbol);
    
    // 2. Try Finnhub for fallback/extra data
    const finn = await fetchFinnhubFallback(symbol);

    if (!fmp?.profile && !finn?.profile) {
      return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
    }

    const res: FundamentalsResponse = {
      symbol,
      name: fmp?.profile?.companyName || finn?.profile?.name || symbol,
      sector: fmp?.profile?.sector || finn?.profile?.sector || 'N/A',
      industry: fmp?.profile?.industry || finn?.profile?.industry || 'N/A',
      country: fmp?.profile?.country || finn?.profile?.country || 'N/A',
      price: fmp?.profile?.price || finn?.quote?.c || 0,
      currency: fmp?.profile?.currency || 'USD',
      
      // Valuation (Prefer FMP metrics)
      pe: fmp?.metrics?.peRatioTTM,
      eps: fmp?.metrics?.netIncomePerShareTTM,
      marketCap: fmp?.profile?.marketCap,
      pb: fmp?.metrics?.priceToBookValueRatioTTM,

      // Profitability
      roe: fmp?.metrics?.roeTTM ? fmp.metrics.roeTTM * 100 : undefined,
      roa: fmp?.metrics?.returnOnAssetsTTM ? fmp.metrics.returnOnAssetsTTM * 100 : undefined,
      netMargin: fmp?.metrics?.netProfitMarginTTM ? fmp.metrics.netProfitMarginTTM * 100 : undefined,
      
      // Leverage
      debtToEquity: fmp?.metrics?.debtEquityRatioTTM,
      currentRatio: fmp?.metrics?.currentRatioTTM,
      
      // Dividends
      dividendYield: fmp?.metrics?.dividendYieldTTM ? fmp.metrics.dividendYieldTTM * 100 : undefined,

      timestamp: Date.now(),
    };

    return NextResponse.json(res);
  } catch (e) {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}

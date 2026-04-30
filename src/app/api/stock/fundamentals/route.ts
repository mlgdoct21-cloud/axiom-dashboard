import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { toYahooSymbol, BIST_COMPANY_NAMES } from '@/lib/bist-symbols';
import { isBISTAsync } from '@/lib/bist-detect-server';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

/**
 * Stock Fundamentals Analysis (Hybrid FMP-First, BIST via yahoo-finance2)
 * GET /api/stock/fundamentals?symbol=AAPL
 * GET /api/stock/fundamentals?symbol=GARAN  (BIST → yahoo-finance2)
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
  // BIST-specific (set when market === 'TR')
  market?: 'US' | 'TR';
  priceChangePercent?: number;
  delayed?: boolean;
  delayedMinutes?: number;
  source?: string;
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

async function fetchBISTFundamentals(symbol: string): Promise<FundamentalsResponse | null> {
  try {
    const yfSymbol = toYahooSymbol(symbol);
    const [quote, summary] = await Promise.all([
      yahooFinance.quote(yfSymbol),
      yahooFinance.quoteSummary(yfSymbol, {
        modules: [
          'summaryProfile',
          'price',
          'defaultKeyStatistics',
          'financialData',
          'summaryDetail',
        ],
      }).catch(() => null),
    ]);

    if (!quote) return null;

    const profile = summary?.summaryProfile;
    const keyStats = summary?.defaultKeyStatistics;
    const financial = summary?.financialData;
    const summaryDetail = summary?.summaryDetail;

    const price = quote.regularMarketPrice ?? 0;
    const prevClose = quote.regularMarketPreviousClose ?? price;
    const changePct = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

    return {
      symbol,
      name: quote.longName || quote.shortName || BIST_COMPANY_NAMES[symbol] || symbol,
      sector: profile?.sector || 'N/A',
      industry: profile?.industry || 'N/A',
      country: profile?.country || 'Turkey',
      price,
      currency: quote.currency || 'TRY',

      // Valuation
      pe: keyStats?.trailingPE?.valueOf() ?? quote.trailingPE,
      eps: keyStats?.trailingEps?.valueOf() ?? quote.epsTrailingTwelveMonths,
      marketCap: quote.marketCap,
      pb: keyStats?.priceToBook?.valueOf(),

      // Profitability (Yahoo returns ratios as decimals: 0.15 = 15%)
      roe: financial?.returnOnEquity ? Number(financial.returnOnEquity) * 100 : undefined,
      roa: financial?.returnOnAssets ? Number(financial.returnOnAssets) * 100 : undefined,
      grossMargin: financial?.grossMargins ? Number(financial.grossMargins) * 100 : undefined,
      operatingMargin: financial?.operatingMargins ? Number(financial.operatingMargins) * 100 : undefined,
      netMargin: financial?.profitMargins ? Number(financial.profitMargins) * 100 : undefined,

      // Leverage
      debtToEquity: financial?.debtToEquity ? Number(financial.debtToEquity) : undefined,
      currentRatio: financial?.currentRatio ? Number(financial.currentRatio) : undefined,

      // Growth
      revenueGrowth: financial?.revenueGrowth ? Number(financial.revenueGrowth) * 100 : undefined,
      epsgrowth: financial?.earningsGrowth ? Number(financial.earningsGrowth) * 100 : undefined,

      // Dividend
      dividendYield: summaryDetail?.dividendYield ? Number(summaryDetail.dividendYield) * 100 : undefined,

      // BIST-specific extras
      market: 'TR',
      priceChangePercent: changePct,
      delayed: true,
      delayedMinutes: 15,
      source: 'yahoo-finance2',

      timestamp: Date.now(),
    };
  } catch (e) {
    console.error('[BIST fundamentals]', symbol, e);
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

  // Route BIST symbols to yahoo-finance2 (Phase 1: ~15min delayed, free)
  if (await isBISTAsync(symbol)) {
    const bistData = await fetchBISTFundamentals(symbol);
    if (!bistData) {
      return NextResponse.json({ error: 'BIST stock not found' }, { status: 404 });
    }
    return NextResponse.json(bistData);
  }

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

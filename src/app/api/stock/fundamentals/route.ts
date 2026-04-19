import { NextRequest, NextResponse } from 'next/server';

/**
 * Stock Fundamentals Analysis
 * GET /api/stock/fundamentals?symbol=AAPL
 *
 * Returns:
 * - Company profile (name, sector, country, founded)
 * - Valuation (P/E, P/B, PEG)
 * - Profitability (ROE, ROA, Margin)
 * - Efficiency (Asset turnover)
 * - Leverage (Debt/Equity, Current Ratio)
 * - Growth (EPS growth, revenue growth)
 * - Dividends
 *
 * Data from: Finnhub /stock/profile2 + /quote
 */

interface FundamentalsResponse {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  country: string;
  founded?: number;

  // Pricing
  price: number;
  currency: string;

  // Valuation
  pe?: number;
  eps?: number;
  marketCap?: number;
  pb?: number;

  // Profitability
  roe?: number;
  roa?: number;
  grossMargin?: number;
  operatingMargin?: number;
  netMargin?: number;

  // Efficiency
  assetTurnover?: number;

  // Leverage
  debt?: number;
  debtToEquity?: number;
  currentRatio?: number;
  fcf?: number;

  // Growth
  epsgrowth?: number;
  revenueGrowth?: number;
  earningsGrowth?: number;

  // Dividends
  dividendYield?: number;

  timestamp: number;
}

interface FinnhubProfile {
  ticker?: string;
  name?: string;
  sector?: string;
  country?: string;
  founded?: number;
  ipo?: number;
  industry?: string;
  weburl?: string;
  logo?: string;
}

interface FinnhubQuote {
  c?: number; // Current price
  h?: number; // High price of the day
  l?: number; // Low price of the day
  o?: number; // Open price of the day
  pc?: number; // Previous close price
  t?: number; // Unix timestamp
}

async function fetchFinnhubProfile(
  symbol: string,
  apiKey: string
): Promise<FinnhubProfile | null> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${apiKey}`,
      { next: { revalidate: 86400 } } // 24h
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('[profile2]', e);
    return null;
  }
}

async function fetchFinnhubQuote(
  symbol: string,
  apiKey: string
): Promise<FinnhubQuote | null> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`,
      { next: { revalidate: 300 } } // 5m
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('[quote]', e);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol')?.toUpperCase().trim();

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key missing' }, { status: 500 });
  }

  try {
    const [profile, quote] = await Promise.all([
      fetchFinnhubProfile(symbol, apiKey),
      fetchFinnhubQuote(symbol, apiKey),
    ]);

    if (!profile || !quote) {
      return NextResponse.json(
        { error: `Stock ${symbol} not found` },
        { status: 404 }
      );
    }

    // Note: Finnhub free tier does NOT include detailed fundamentals
    // (P/E, ROE, Debt/Equity, etc require Premium tier)
    // This endpoint returns what's available from free tier

    const result: FundamentalsResponse = {
      symbol,
      name: profile.name || symbol,
      sector: profile.sector || 'Unknown',
      industry: profile.industry || 'Unknown',
      country: profile.country || 'Unknown',
      founded: profile.founded,

      // Basic pricing from quote
      price: quote.c || 0,
      currency: 'USD',

      // NOTE: The following require Premium Finnhub tier:
      // pe, eps, marketCap, pb, roe, roa, debt, etc
      // For now, these are null
      // Consider upgrade if needed

      timestamp: Date.now(),
    };

    return NextResponse.json(result);
  } catch (e) {
    console.error('[fundamentals]', e);
    return NextResponse.json(
      { error: 'Failed to fetch fundamentals' },
      { status: 500 }
    );
  }
}

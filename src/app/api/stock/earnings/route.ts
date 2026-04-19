import { NextRequest, NextResponse } from 'next/server';

/**
 * Stock Earnings Calendar
 * GET /api/stock/earnings?symbol=AAPL
 *
 * Returns:
 * - Next earnings date
 * - Expected EPS vs last actual
 * - Historical surprise % (beat/miss)
 * - Earnings guidance changes
 *
 * NOTE: Requires Finnhub Premium ($9+/month)
 * Without premium, this will return limited data
 */

interface EarningsData {
  symbol: string;
  nextEarnings: {
    date?: string; // YYYY-MM-DD
    daysUntil?: number;
    expectedEps?: number;
    estimatedRevenue?: number;
    reportTime?: 'before_market' | 'after_market' | 'not_specified';
  };
  lastEarnings: {
    date?: string;
    actualEps?: number;
    expectedEps?: number;
    surprise?: number; // -0.05 to 0.10 (%)
    revenue?: number;
    guidanceChange?: string;
  };
  historicalSurprises?: Array<{
    date: string;
    actual: number;
    expected: number;
    surprise: number;
  }>;
  message?: string;
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
    // Finnhub /calendar/earnings endpoint (Premium only)
    const res = await fetch(
      `https://finnhub.io/api/v1/calendar/earnings?symbol=${symbol}&token=${apiKey}`,
      { next: { revalidate: 3600 } } // 1h cache
    );

    if (!res.ok) {
      // Premium tier required
      return NextResponse.json(
        {
          symbol,
          message:
            'Premium Finnhub tier required for earnings calendar. Upgrade at finnhub.io/pricing',
          nextEarnings: {},
          lastEarnings: {},
        },
        { status: 402 }
      );
    }

    const data = await res.json();
    const earnings = data.earnings || [];

    if (earnings.length === 0) {
      return NextResponse.json({
        symbol,
        message: 'No earnings data found',
        nextEarnings: {},
        lastEarnings: {},
      });
    }

    // Sort by date
    earnings.sort(
      (a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Find next and last
    const now = new Date();
    const next = earnings.find((e: any) => new Date(e.date) > now);
    const last = earnings
      .filter((e: any) => new Date(e.date) <= now)
      .reverse()[0];

    const result: EarningsData = {
      symbol,
      nextEarnings: next
        ? {
            date: next.date,
            daysUntil: Math.ceil(
              (new Date(next.date).getTime() - now.getTime()) / 86400000
            ),
            expectedEps: next.epsEstimate,
            estimatedRevenue: next.revenueEstimate,
            reportTime: next.hour?.toLowerCase() || 'not_specified',
          }
        : {},
      lastEarnings: last
        ? {
            date: last.date,
            actualEps: last.epsActual,
            expectedEps: last.epsEstimate,
            surprise:
              last.epsActual && last.epsEstimate
                ? (last.epsActual - last.epsEstimate) / last.epsEstimate
                : undefined,
            revenue: last.revenueActual,
            guidanceChange: 'unknown', // Not available in Finnhub
          }
        : {},
      historicalSurprises: earnings
        .slice(0, 4) // Last 4 quarters
        .map((e: any) => ({
          date: e.date,
          actual: e.epsActual || 0,
          expected: e.epsEstimate || 0,
          surprise:
            e.epsActual && e.epsEstimate
              ? (e.epsActual - e.epsEstimate) / e.epsEstimate
              : 0,
        })),
    };

    return NextResponse.json(result);
  } catch (e) {
    console.error('[earnings]', e);
    return NextResponse.json(
      { error: 'Failed to fetch earnings data' },
      { status: 500 }
    );
  }
}

/**
 * Daily Digest Proxy — Backend `/api/v1/daily-digest` endpoint'ine proxy.
 *
 * GET /api/daily-digest
 * Returns: { risk_radar, quant_analysis, portfolio_signal, last_updated }
 */

import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_URL = 'https://vivacious-growth-production-4875.up.railway.app/api/v1';

export async function GET(_request: NextRequest) {
  const backendUrl =
    process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || RAILWAY_URL;
  const url = `${backendUrl}/daily-digest`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[daily-digest] Backend error:', response.status, url);
      return NextResponse.json(
        {
          error: `Backend returned ${response.status}`,
          status: 'error',
          last_updated: new Date().toISOString(),
        },
        { status: 502 },
      );
    }

    const data = await response.json();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Day 28 part 5: 5 dk → 30 sn (browser cache eski VIX null'unu tutuyordu)
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('[daily-digest] Proxy error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch daily digest',
        status: 'error',
        last_updated: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

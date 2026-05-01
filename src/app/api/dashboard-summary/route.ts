/**
 * Dashboard Summary Proxy — 6-panel veri (overnight markets, ETF flows,
 * econ calendar, premarket movers, earnings today, sector performance).
 *
 * GET /api/dashboard-summary[?refresh=1]
 */

import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_URL = 'https://vivacious-growth-production-4875.up.railway.app/api/v1';

export async function GET(request: NextRequest) {
  const backendUrl =
    process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || RAILWAY_URL;

  const force = request.nextUrl.searchParams.get('refresh') === '1';
  const url = `${backendUrl}/dashboard-summary${force ? '?force_refresh=true' : ''}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[dashboard-summary] Backend error:', response.status, url);
      return NextResponse.json(
        {
          error: `Backend returned ${response.status}`,
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
        // 5 dk cache (backend zaten cache veriyor, edge'de de tutalım)
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[dashboard-summary] Proxy error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard summary',
        last_updated: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

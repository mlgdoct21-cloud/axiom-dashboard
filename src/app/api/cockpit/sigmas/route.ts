/**
 * Cockpit Sigmas Proxy — Backend `/api/v1/cockpit/sigmas` endpoint'ine proxy.
 *
 * GET /api/cockpit/sigmas
 * Returns: {
 *   symbol: "BTC",
 *   window_days: 90,
 *   netflow:   { sigma, current, mean_90d, stdev_90d, samples, computed_at } | null,
 *   funding:   { sigma, current, mean_90d, stdev_90d, samples, computed_at } | null,
 *   btc_price: { sigma, current_return_pct, mean_90d_pct, stdev_90d_pct, samples, computed_at } | null,
 *   fetched_at: ISO,
 * }
 *
 * Cache: 5 dakika edge SWR. Backend kendisi 1 saatlik postgres cache tutuyor.
 */

import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_URL = 'https://vivacious-growth-production-4875.up.railway.app/api/v1';

export async function GET(_request: NextRequest) {
  const backendUrl =
    process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || RAILWAY_URL;
  const url = `${backendUrl}/cockpit/sigmas`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error('[cockpit/sigmas] Backend error:', response.status, url);
      return NextResponse.json(
        {
          symbol: 'BTC',
          window_days: 90,
          netflow: null,
          funding: null,
          btc_price: null,
          error: `Backend returned ${response.status}`,
        },
        { status: 502 },
      );
    }

    const data = await response.json();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[cockpit/sigmas] Proxy error:', error);
    return NextResponse.json(
      {
        symbol: 'BTC',
        window_days: 90,
        netflow: null,
        funding: null,
        btc_price: null,
        error: 'fetch_failed',
      },
      { status: 500 },
    );
  }
}

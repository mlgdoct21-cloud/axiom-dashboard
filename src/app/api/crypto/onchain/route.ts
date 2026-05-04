/**
 * On-Chain Snapshot Proxy — CryptoQuant exchange flows, whale ratio,
 * miner pressure, derivatives sentiment, cycle indicators.
 *
 * GET /api/crypto/onchain?symbol=BTC
 */
import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_URL = 'https://vivacious-growth-production-4875.up.railway.app/api/v1';

export async function GET(request: NextRequest) {
  const backendUrl =
    process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || RAILWAY_URL;

  const symbol = (request.nextUrl.searchParams.get('symbol') || 'BTC').toUpperCase();
  const url = `${backendUrl}/crypto/onchain?symbol=${encodeURIComponent(symbol)}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (response.status === 503) {
      return NextResponse.json(
        { error: 'cryptoquant_not_configured', symbol },
        { status: 503 },
      );
    }

    if (!response.ok) {
      console.error('[crypto/onchain] Backend error:', response.status, url);
      return NextResponse.json(
        { error: `Backend returned ${response.status}`, symbol },
        { status: 502 },
      );
    }

    const data = await response.json();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Backend cache is 4h; edge cache for 30min so the user-facing UI
        // can refresh meaningfully when scheduler runs.
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error('[crypto/onchain] Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch on-chain snapshot', symbol },
      { status: 500 },
    );
  }
}

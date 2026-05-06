/**
 * Stablecoin Pulse Proxy — USDC + DAI flow + SSR proxy ('kuru barut').
 */
import { NextResponse } from 'next/server';

const RAILWAY_URL = 'https://vivacious-growth-production-4875.up.railway.app/api/v1';

export async function GET() {
  const backendUrl =
    process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || RAILWAY_URL;

  try {
    const response = await fetch(`${backendUrl}/market/stablecoin-pulse`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (response.status === 503) {
      return NextResponse.json({ error: 'cryptoquant_not_configured' }, { status: 503 });
    }
    if (!response.ok) {
      return NextResponse.json({ error: `Backend ${response.status}` }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600',
      },
    });
  } catch (e) {
    console.error('[stablecoin-pulse] proxy error:', e);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}

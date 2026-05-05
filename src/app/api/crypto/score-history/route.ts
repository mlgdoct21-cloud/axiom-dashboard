/**
 * Axiom Score history proxy — daily snapshots fed by morning_briefing.
 *
 * GET /api/crypto/score-history?symbol=BTC&days=90
 */
import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_URL = 'https://vivacious-growth-production-4875.up.railway.app/api/v1';

export async function GET(request: NextRequest) {
  const backendUrl =
    process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || RAILWAY_URL;

  const symbol = (request.nextUrl.searchParams.get('symbol') || 'BTC').toUpperCase();
  const days = request.nextUrl.searchParams.get('days') || '90';
  const url = `${backendUrl}/crypto/score-history?symbol=${encodeURIComponent(symbol)}&days=${encodeURIComponent(days)}`;

  try {
    const response = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!response.ok) {
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
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    console.error('[crypto/score-history] Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch score history', symbol },
      { status: 500 },
    );
  }
}

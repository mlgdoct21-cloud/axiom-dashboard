/**
 * Alert history proxy — last N days of fired CryptoQuant alerts
 * (de-duplicated per (alert_key, day), no user PII).
 *
 * GET /api/crypto/alerts/history?days=7
 */
import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_URL = 'https://vivacious-growth-production-4875.up.railway.app/api/v1';

export async function GET(request: NextRequest) {
  const backendUrl =
    process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || RAILWAY_URL;

  const days = request.nextUrl.searchParams.get('days') || '7';
  const url = `${backendUrl}/crypto/alerts/history?days=${encodeURIComponent(days)}`;

  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) {
      return NextResponse.json({ error: `Backend returned ${r.status}` }, { status: 502 });
    }
    const data = await r.json();
    return NextResponse.json(data, {
      status: 200,
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'fetch_failed' }, { status: 500 });
  }
}

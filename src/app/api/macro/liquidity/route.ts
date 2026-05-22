/**
 * Macro Global Liquidity Proxy — Makro Pulse chip için.
 * Backend: /api/v1/macro/liquidity (Fed M2 + ECB Total Assets, 6h cache).
 */
import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_URL = 'https://vivacious-growth-production-4875.up.railway.app/api/v1';

export async function GET(_request: NextRequest) {
  const backendUrl =
    process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || RAILWAY_URL;
  const url = `${backendUrl}/macro/liquidity`;
  try {
    const r = await fetch(url, { next: { revalidate: 300 } });
    if (!r.ok) return NextResponse.json({ error: `Backend ${r.status}` }, { status: 502 });
    const data = await r.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
    });
  } catch {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}

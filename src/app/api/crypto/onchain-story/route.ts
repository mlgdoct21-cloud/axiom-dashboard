/**
 * On-Chain Storyteller proxy — Gemini-üretimli 5-blok karar çerçevesi.
 * Backend zaten 12h Postgres cache'liyor; biz no-store ile her isteği
 * backend'e geçiriyoruz ki force-refresh anında yansısın.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_URL = 'https://vivacious-growth-production-4875.up.railway.app/api/v1';

export async function GET(req: NextRequest) {
  const symbol = (req.nextUrl.searchParams.get('symbol') || 'BTC').toUpperCase();
  const backendUrl =
    process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || RAILWAY_URL;

  try {
    const response = await fetch(
      `${backendUrl}/crypto/onchain-story?symbol=${encodeURIComponent(symbol)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      },
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(data || { error: `Backend ${response.status}` }, {
        status: response.status,
      });
    }

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (e) {
    console.error('[onchain-story] proxy error:', e);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}

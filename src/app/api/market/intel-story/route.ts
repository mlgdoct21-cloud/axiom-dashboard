/**
 * Crypto Intel Storyteller Proxy — backend cache'inden hazır story okur.
 * Query: ?tab=overview|erc20|stable&tier=premium|advance
 * Scheduler 6 saatte bir pre-generate eder.
 */
import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_URL = 'https://vivacious-growth-production-4875.up.railway.app/api/v1';

export async function GET(request: NextRequest) {
  const backendUrl =
    process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || RAILWAY_URL;
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get('tab');
  const tier = searchParams.get('tier') || 'premium';

  if (!tab || !['overview', 'erc20', 'stable'].includes(tab)) {
    return NextResponse.json({ error: 'invalid_tab' }, { status: 400 });
  }
  if (!['premium', 'advance'].includes(tier)) {
    return NextResponse.json({ error: 'invalid_tier' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${backendUrl}/market/intel-story?tab=${encodeURIComponent(tab)}&tier=${encodeURIComponent(tier)}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' }, cache: 'no-store' },
    );

    if (response.status === 204) {
      // Scheduler henüz doldurmadı — frontend "Yorum henüz üretilmedi" gösterir.
      return new NextResponse(null, { status: 204 });
    }
    if (!response.ok) {
      return NextResponse.json({ error: `Backend ${response.status}` }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=900, stale-while-revalidate=3600',
      },
    });
  } catch (e) {
    console.error('[intel-story] proxy error:', e);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}

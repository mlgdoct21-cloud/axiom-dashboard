/**
 * Kurumsal Sentez Latest Proxy — Backend `/api/v1/corporate/latest` proxy.
 *
 * Authorization Bearer forward → backend tier-gate eder
 * (anon/free → kilitli teaser, premium/advance → tam synthesis_md).
 *
 * Backend response:
 * {
 *   now, tier: 'free'|'premium'|'advance', locked: boolean,
 *   week_start: string|null,
 *   synthesis:
 *     | { event_id, tier, synthesis_md, source_count, generated_at }   // premium/advance
 *     | { teaser, upgrade_cta }                                         // free/locked
 *     | null                                                            // henüz yok
 * }
 */

import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_URL = 'https://vivacious-growth-production-4875.up.railway.app/api/v1';

export async function GET(request: NextRequest) {
  const backendUrl =
    process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || RAILWAY_URL;
  const url = `${backendUrl}/corporate/latest`;

  const authHeader = request.headers.get('authorization');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authHeader) headers['Authorization'] = authHeader;

  try {
    // Tier-gated by Authorization — Next.js Data Cache keys by URL, NOT by
    // request headers, so `next: { revalidate }` would serve a cached free/
    // locked teaser to authed callers. Backend tier-gates per request.
    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[corporate/latest] Backend error:', response.status, url);
      return NextResponse.json(
        { error: `Backend returned ${response.status}`, synthesis: null },
        { status: 502 },
      );
    }

    const data = await response.json();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Tier-bağımlı auth yanıtı — hiçbir katmanda cache'leme.
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[corporate/latest] Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch corporate latest', synthesis: null },
      { status: 500 },
    );
  }
}

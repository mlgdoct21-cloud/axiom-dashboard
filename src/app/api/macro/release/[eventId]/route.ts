/**
 * Macro Release Detail Proxy — Backend `/api/v1/macro/release/{event_id}` proxy.
 *
 * GET /api/macro/release/{eventId}
 * Returns: { release: {...} | null, core_release: {...} | null }
 *
 * Used by `?event=...` query-param deep-link handler in /tr page when a user
 * clicks the "📈 Dashboard'da tam analiz" button in a Telegram story push.
 */

import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_URL = 'https://vivacious-growth-production-4875.up.railway.app/api/v1';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const backendUrl =
    process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || RAILWAY_URL;
  // Event IDs like `fred:CPI:2026-03-01` contain colons; FastAPI's :path
  // converter handles them upstream so we forward unencoded.
  const url = `${backendUrl}/macro/release/${eventId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error('[macro/release] Backend error:', response.status, url);
      return NextResponse.json(
        { error: `Backend returned ${response.status}`, release: null, core_release: null },
        { status: 502 },
      );
    }

    const data = await response.json();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('[macro/release] Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch macro release', release: null, core_release: null },
      { status: 500 },
    );
  }
}

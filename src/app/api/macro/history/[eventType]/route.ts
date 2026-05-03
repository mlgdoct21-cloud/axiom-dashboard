/**
 * Macro History Proxy — backend `/macro/history/{event_type}` for the modal
 * line chart. Same Railway fallback as /api/macro/latest.
 */

import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_URL = 'https://vivacious-growth-production-4875.up.railway.app/api/v1';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventType: string }> },
) {
  const { eventType } = await params;
  const url = new URL(request.url);
  const months = url.searchParams.get('months') ?? '14';
  const source = url.searchParams.get('source') ?? 'fred';
  const backendUrl =
    process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || RAILWAY_URL;
  const target = `${backendUrl}/macro/history/${encodeURIComponent(eventType)}?months=${months}&source=${source}`;

  try {
    const r = await fetch(target, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 60 },
    });
    if (!r.ok) {
      return NextResponse.json(
        { error: `Backend ${r.status}`, points: [] },
        { status: 502 },
      );
    }
    const data = await r.json();
    return NextResponse.json(data, {
      status: 200,
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=120' },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e), points: [] }, { status: 500 });
  }
}

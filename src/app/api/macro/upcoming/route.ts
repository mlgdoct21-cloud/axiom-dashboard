/**
 * Macro Upcoming Proxy — Backend `/api/v1/macro/upcoming` endpoint.
 *
 * GET /api/macro/upcoming?days=30&limit=6
 * Returns: { now, count, events: [{ event_type, label, scheduled_at, ... }] }
 */

import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_URL = 'https://vivacious-growth-production-4875.up.railway.app/api/v1';

export async function GET(request: NextRequest) {
  const backendUrl =
    process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || RAILWAY_URL;
  const days = request.nextUrl.searchParams.get('days') || '30';
  const limit = request.nextUrl.searchParams.get('limit') || '6';
  const url = `${backendUrl}/macro/upcoming?days=${days}&limit=${limit}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error('[macro/upcoming] Backend error:', response.status, url);
      return NextResponse.json(
        { error: `Backend returned ${response.status}`, events: [] },
        { status: 502 },
      );
    }

    const data = await response.json();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[macro/upcoming] Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch macro upcoming', events: [] },
      { status: 500 },
    );
  }
}

/**
 * Cockpit CVD Proxy — Backend `/api/v1/cockpit/cvd` endpoint'ine proxy.
 * On-Chain panel'in "Türev Piyasası" CVD bölümünde kullanılır.
 */

import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_URL = 'https://vivacious-growth-production-4875.up.railway.app/api/v1';

export async function GET(_request: NextRequest) {
  const backendUrl =
    process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || RAILWAY_URL;
  const url = `${backendUrl}/cockpit/cvd`;

  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 300 },
    });
    if (!response.ok) {
      return NextResponse.json({ error: `Backend ${response.status}` }, { status: 502 });
    }
    const data = await response.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
    });
  } catch {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}

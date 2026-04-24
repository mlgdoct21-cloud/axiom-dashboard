import { NextRequest, NextResponse } from 'next/server';

/**
 * Telegram Bot Report Handler
 *
 * GET /api/telegram/report?symbol=AAPL&userId=123456
 *
 * Bot çağrı sırası:
 * 1. /report AAPL → API çağırır
 * 2. Teaser + 2 buton döner:
 *    a) "📖 Full Rapor" → deeplink (dashboard modal veya link)
 *    b) "🔔 Abone Ol" → subscription page
 */

const FMP_KEY = process.env.FMP_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

interface TelegramReportResponse {
  symbol: string;
  teaser: string;
  hasFullReport: boolean;
  dashboardUrl: string;
  subscriptionUrl: string;
  ctaText: string;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const symbol = params.get('symbol')?.toUpperCase().trim();
  const userId = params.get('userId');

  if (!symbol) {
    return NextResponse.json(
      { error: 'symbol required' },
      { status: 400 }
    );
  }

  // Teaser'ı cache'ten veya fresh Gemini call'ından al
  try {
    // Lokal veya prod URL — request.headers.host'tan al
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const insiderUrl = `${protocol}://${host}/api/stock/analysis/insider-report?symbol=${encodeURIComponent(symbol)}&mode=teaser&locale=tr`;

    const res = await fetch(insiderUrl, { next: { revalidate: 600 } });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }

    const data = (await res.json()) as any;

    // Deeplink: modal mode açacak (uygulama-tarafında auth kontrolü)
    const dashboardUrl = `https://axiom.yourapp.com/tr?symbol=${encodeURIComponent(symbol)}&report=telegram&mode=modal`;

    // Fallback: eğer modal açılamazsa direk link (uygulama'da kapanabilir, üye değilse login prompt)
    const fallbackUrl = `https://axiom.yourapp.com/tr?symbol=${encodeURIComponent(symbol)}&report=telegram`;

    return NextResponse.json({
      symbol,
      teaser: data.teaser || '⚠️ Rapor oluşturulamadı',
      hasFullReport: !!data.teaser,
      dashboardUrl,
      fallbackUrl,
      subscriptionUrl: 'https://axiom.yourapp.com/pricing?ref=telegram',
      ctaText: '📖 Tam Raporu Oku',
    } as TelegramReportResponse);
  } catch (e) {
    console.error('[telegram/report]', e);
    return NextResponse.json(
      { error: 'Report generation failed', reason: String(e).slice(0, 200) },
      { status: 502 }
    );
  }
}

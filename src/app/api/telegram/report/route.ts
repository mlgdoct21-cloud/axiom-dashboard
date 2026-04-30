import { NextRequest, NextResponse } from 'next/server';

/**
 * Telegram Bot Report Handler
 *
 * GET /api/telegram/report?symbol=AAPL&userId=123456
 * Header: X-Bot-Secret: <BOT_INTERNAL_SECRET>
 *
 * Bu endpoint sadece Telegram bot tarafından çağrılmalıdır. Public erişimi
 * X-Bot-Secret header doğrulaması ile engelliyoruz (env'de set edilmemişse
 * production'da tamamen kapalı).
 */

// Symbol validasyonu — URL injection'a karşı whitelisting
const SYMBOL_RE = /^[A-Z0-9.\-]{1,10}$/;

// Public dashboard URL — env var'dan, fallback yok (env yoksa hata ver)
const PUBLIC_DASHBOARD_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.DASHBOARD_URL || '';

interface TelegramReportResponse {
  symbol: string;
  teaser: string;
  hasFullReport: boolean;
  dashboardUrl: string;
  fallbackUrl: string;
  subscriptionUrl: string;
  ctaText: string;
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request: NextRequest) {
  // Bot secret doğrulaması
  const expectedSecret = process.env.BOT_INTERNAL_SECRET;
  const providedSecret = request.headers.get('x-bot-secret');
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    if (!expectedSecret) {
      console.error('[telegram/report] BOT_INTERNAL_SECRET not configured in production');
      return NextResponse.json({ error: 'Service misconfigured' }, { status: 503 });
    }
    if (!providedSecret || providedSecret !== expectedSecret) {
      return unauthorized();
    }
  } else if (expectedSecret && providedSecret !== expectedSecret) {
    // Development: secret set edilmişse uy, set edilmemişse bypass
    return unauthorized();
  }

  const params = request.nextUrl.searchParams;
  const symbol = params.get('symbol')?.toUpperCase().trim();

  if (!symbol) {
    return NextResponse.json({ error: 'symbol required' }, { status: 400 });
  }

  if (!SYMBOL_RE.test(symbol)) {
    return NextResponse.json({ error: 'invalid symbol format' }, { status: 400 });
  }

  try {
    // Internal API çağrısı — kendi host'umuzu kullan
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const insiderUrl = `${protocol}://${host}/api/stock/analysis/insider-report?symbol=${encodeURIComponent(symbol)}&mode=teaser&locale=tr`;

    const res = await fetch(insiderUrl, { next: { revalidate: 600 } });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error(`[telegram/report] insider-report failed: ${res.status}`, body?.error);
      return NextResponse.json(
        { error: 'Report generation failed' },
        { status: 502 }
      );
    }

    const data = (await res.json()) as { teaser?: string };

    // Public URL — env'den. Set edilmemişse internal host kullan (development).
    const baseUrl = PUBLIC_DASHBOARD_URL || `${protocol}://${host}`;
    const dashboardUrl = `${baseUrl}/tr/report/${encodeURIComponent(symbol)}?source=telegram&mode=modal`;
    const fallbackUrl = `${baseUrl}/tr/report/${encodeURIComponent(symbol)}?source=telegram`;
    const subscriptionUrl = `${baseUrl}/pricing?ref=telegram`;

    const response: TelegramReportResponse = {
      symbol,
      teaser: data.teaser || '⚠️ Rapor oluşturulamadı',
      hasFullReport: !!data.teaser,
      dashboardUrl,
      fallbackUrl,
      subscriptionUrl,
      ctaText: '📖 Tam Raporu Oku',
    };

    return NextResponse.json(response);
  } catch (e) {
    // Hata detayı sadece sunucu loglarında
    console.error('[telegram/report]', e);
    return NextResponse.json(
      { error: 'Report generation failed' },
      { status: 502 }
    );
  }
}

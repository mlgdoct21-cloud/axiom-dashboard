import { NextRequest, NextResponse } from 'next/server';
import { getProjectDescription } from '@/lib/crypto-whitepaper';
import { getDevHealthMetrics } from '@/lib/crypto-github';
import { getCoinGeckoData } from '@/lib/crypto-coingecko';
import { generateWhitepaperAnalysis } from '@/lib/crypto-gemini';
import { getCachedCryptoReport, setCachedCryptoReport } from '@/lib/crypto-cache';

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'symbol parameter required' }, { status: 400 });
  }

  const cached = await getCachedCryptoReport('whitepaper', symbol);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  try {
    const [whitepaper, devMetrics, tokenomics] = await Promise.all([
      getProjectDescription(symbol),
      getDevHealthMetrics(symbol).catch(() => null),
      getCoinGeckoData(symbol).catch(() => null),
    ]);

    if (!whitepaper) {
      return NextResponse.json(
        { error: `No project description found for ${symbol}` },
        { status: 404 }
      );
    }

    const analysis = await generateWhitepaperAnalysis(symbol, whitepaper, devMetrics, tokenomics);

    if (!analysis) {
      return NextResponse.json({ error: 'Failed to generate whitepaper analysis' }, { status: 500 });
    }

    const result = {
      symbol,
      project_name: whitepaper.project_name,
      whitepaper_url: whitepaper.whitepaper_url,
      homepage: whitepaper.homepage,
      analysis,
      generated_at: new Date().toISOString(),
      cached: false,
    };

    await setCachedCryptoReport('whitepaper', symbol, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[crypto/whitepaper] error:', error);
    return NextResponse.json({ error: 'Whitepaper analysis failed' }, { status: 500 });
  }
}

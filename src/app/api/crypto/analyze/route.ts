import { NextRequest, NextResponse } from 'next/server';
import { getDevHealthMetrics } from '@/lib/crypto-github';
import { getCoinGeckoData } from '@/lib/crypto-coingecko';
import { generateCryptoAnalysis } from '@/lib/crypto-gemini';
import { getCachedCryptoReport, setCachedCryptoReport } from '@/lib/crypto-cache';

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'symbol parameter required' }, { status: 400 });
  }

  const cached = await getCachedCryptoReport('full_analysis', symbol);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  try {
    const [devMetrics, tokenomics] = await Promise.all([
      getDevHealthMetrics(symbol).catch(() => null),
      getCoinGeckoData(symbol).catch(() => null),
    ]);

    const analysis = await generateCryptoAnalysis(symbol, devMetrics, tokenomics);

    if (!analysis) {
      return NextResponse.json({ error: 'Failed to generate analysis' }, { status: 500 });
    }

    const result = {
      symbol,
      analysis,
      data_sources: {
        github: devMetrics ? 'ok' : 'unavailable',
        coingecko: tokenomics ? 'ok' : 'unavailable',
        ai: 'gemini-2.5-flash',
      },
      generated_at: new Date().toISOString(),
      cached: false,
    };

    await setCachedCryptoReport('full_analysis', symbol, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[crypto/analyze] error:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}

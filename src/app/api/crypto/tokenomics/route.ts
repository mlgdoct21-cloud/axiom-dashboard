import { NextRequest, NextResponse } from 'next/server';
import { getCoinGeckoData } from '@/lib/crypto-coingecko';
import { getCachedCryptoReport, setCachedCryptoReport } from '@/lib/crypto-cache';

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json(
      { error: 'symbol parameter required' },
      { status: 400 }
    );
  }

  // Check cache first (6h TTL)
  const cached = await getCachedCryptoReport('tokenomics', symbol);
  if (cached) {
    return NextResponse.json({
      ...cached,
      cached: true,
      cacheSource: 'supabase'
    });
  }

  try {
    // Fetch fresh data from CoinGecko
    const tokenomics = await getCoinGeckoData(symbol);

    if (!tokenomics) {
      return NextResponse.json(
        { error: `No tokenomics data found for ${symbol}` },
        { status: 404 }
      );
    }

    // Calculate dilution ratio
    const dilutionRatio = tokenomics.total_supply && tokenomics.circulating_supply
      ? ((tokenomics.total_supply - tokenomics.circulating_supply) / tokenomics.total_supply * 100).toFixed(2)
      : null;

    const result = {
      symbol,
      tokenomics: {
        ...tokenomics,
        dilution_ratio: dilutionRatio,
        is_capped: !!tokenomics.max_supply
      },
      cached: false,
      cacheSource: 'coingecko'
    };

    // Cache result
    await setCachedCryptoReport('tokenomics', symbol, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Tokenomics endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tokenomics data' },
      { status: 500 }
    );
  }
}

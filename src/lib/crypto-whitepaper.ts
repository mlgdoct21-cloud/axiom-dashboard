export interface WhitepaperData {
  symbol: string;
  project_name: string;
  description: string;
  categories: string[];
  homepage: string | null;
  whitepaper_url: string | null;
}

export async function getProjectDescription(symbol: string): Promise<WhitepaperData | null> {
  const idMap: Record<string, string> = {
    SOL: 'solana',
    ETH: 'ethereum',
    BTC: 'bitcoin',
    ARB: 'arbitrum',
    MATIC: 'matic-network',
    AVAX: 'avalanche-2',
    DOT: 'polkadot',
    LINK: 'chainlink',
    UNI: 'uniswap',
    ADA: 'cardano',
  };

  const id = idMap[symbol.toUpperCase()] || symbol.toLowerCase();

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`,
      { headers: { 'User-Agent': 'AXIOM/1.0' } }
    );

    if (!response.ok) return null;

    const data = await response.json();

    const rawDesc: string = data.description?.en ?? '';
    // Strip HTML tags from CoinGecko description
    const description = rawDesc.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 2000);

    return {
      symbol: symbol.toUpperCase(),
      project_name: data.name ?? symbol,
      description,
      categories: data.categories ?? [],
      homepage: data.links?.homepage?.[0] ?? null,
      whitepaper_url: data.links?.whitepaper ?? null,
    };
  } catch (error) {
    console.error(`[crypto-whitepaper] CoinGecko fetch failed for ${symbol}:`, error);
    return null;
  }
}

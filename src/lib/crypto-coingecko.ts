// CoinGecko tokenomics & metrics
export async function getCoinGeckoData(symbol: string) {
  const coingeckoId = await mapSymbolToCoingeckoId(symbol);

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coingeckoId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=true`,
      {
        headers: { 'User-Agent': 'AXIOM/1.0' }
      }
    );

    const data = await response.json();

    return {
      symbol: data.symbol.toUpperCase(),
      current_price: data.market_data.current_price.usd,
      market_cap: data.market_data.market_cap.usd,
      total_volume: data.market_data.total_volume.usd,

      // Tokenomics
      circulating_supply: data.market_data.circulating_supply,
      total_supply: data.market_data.total_supply,
      max_supply: data.market_data.max_supply,

      // Developer activity
      commit_count_4_weeks: data.developer_data?.commit_count_4_weeks,

      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`CoinGecko fetch failed for ${symbol}:`, error);
    return null;
  }
}

async function mapSymbolToCoingeckoId(symbol: string): Promise<string> {
  const map: Record<string, string> = {
    SOL: 'solana',
    ARB: 'arbitrum',
    ETH: 'ethereum',
    BTC: 'bitcoin',
    MATIC: 'matic-network',
    // Add more...
  };

  return map[symbol.toUpperCase()] || symbol.toLowerCase();
}

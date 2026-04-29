export interface CoinGeckoData {
  symbol: string;
  name: string;
  current_price: number;
  price_change_24h: number;
  price_change_7d: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  description: string;
  categories: string[];
  homepage: string | null;
  whitepaper_url: string | null;
}

const ID_MAP: Record<string, string> = {
  BTC:  'bitcoin',
  ETH:  'ethereum',
  SOL:  'solana',
  ARB:  'arbitrum',
  AVAX: 'avalanche-2',
  ADA:  'cardano',
  DOT:  'polkadot',
  LINK: 'chainlink',
  UNI:  'uniswap',
  MATIC:'matic-network',
  NEAR: 'near',
  APT:  'aptos',
  SUI:  'sui',
  INJ:  'injective-protocol',
};

export function symbolToId(symbol: string): string {
  return ID_MAP[symbol.toUpperCase()] ?? symbol.toLowerCase();
}

export async function getCoinGeckoData(symbol: string): Promise<CoinGeckoData | null> {
  const id = symbolToId(symbol);

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`,
      { headers: { 'User-Agent': 'AXIOM/1.0' }, next: { revalidate: 300 } }
    );
    if (!res.ok) return null;

    const d = await res.json();
    const md = d.market_data;

    const rawDesc: string = d.description?.en ?? '';
    const description = rawDesc.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 2000);

    return {
      symbol:                 symbol.toUpperCase(),
      name:                   d.name ?? symbol,
      current_price:          md.current_price?.usd ?? 0,
      price_change_24h:       md.price_change_percentage_24h ?? 0,
      price_change_7d:        md.price_change_percentage_7d ?? 0,
      market_cap:             md.market_cap?.usd ?? 0,
      market_cap_rank:        d.market_cap_rank ?? 0,
      total_volume:           md.total_volume?.usd ?? 0,
      circulating_supply:     md.circulating_supply ?? 0,
      total_supply:           md.total_supply ?? null,
      max_supply:             md.max_supply ?? null,
      ath:                    md.ath?.usd ?? 0,
      ath_change_percentage:  md.ath_change_percentage?.usd ?? 0,
      description,
      categories:             d.categories ?? [],
      homepage:               d.links?.homepage?.[0] ?? null,
      whitepaper_url:         d.links?.whitepaper ?? null,
    };
  } catch (err) {
    console.error('[crypto-coingecko] fetch failed:', err);
    return null;
  }
}

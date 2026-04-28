// Free API sources for crypto intelligence
export const cryptoSources = {
  github: {
    source: 'GitHub API',
    cost: '$0',
    features: ['commits', 'developers', 'issues'],
    endpoint: 'https://api.github.com',
    token: process.env.GITHUB_API_TOKEN
  },

  coingecko: {
    source: 'CoinGecko API',
    cost: '$0',
    features: ['price', 'market_cap', 'volume', 'tokenomics'],
    endpoint: 'https://api.coingecko.com/api/v3'
  },

  blockchain_com: {
    source: 'blockchain.com API',
    cost: '$0',
    features: ['whale_addresses', 'exchange_flows'],
    endpoint: 'https://blockchain.info/api'
  },

  dune: {
    source: 'Dune Analytics (free tier)',
    cost: '$0',
    features: ['dau', 'tvl', 'transactions'],
    endpoint: 'https://api.dune.com/api/v1',
    token: process.env.DUNE_API_KEY
  },

  fear_greed: {
    source: 'Fear & Greed Index',
    cost: '$0',
    endpoint: 'https://api.alternative.me/fng/'
  }
};

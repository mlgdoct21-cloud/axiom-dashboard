export interface WhalHolder {
  address: string;
  share: number;           // % of supply
  label: string | null;    // known name (e.g. "Binance", "Arbitrum Foundation")
  type: 'BORSA' | 'VC_FONU' | 'KURUM' | 'VAKIF' | 'EKIP' | 'BILINMIYOR';
  note: string | null;
}

// ── Known address labels (Ethereum mainnet) ──────────────────────────────────
// Sources: Etherscan labels, official announcements, on-chain analysis
const KNOWN_LABELS: Record<string, { label: string; type: WhalHolder['type']; note: string }> = {
  // Binance
  '0x28c6c06298d514db089934071355e5743bf21d60': { label: 'Binance 14',        type: 'BORSA',      note: 'Binance soğuk cüzdanı' },
  '0xf977814e90da44bfa03b6295a0616a897441acec': { label: 'Binance 8',         type: 'BORSA',      note: 'Binance sıcak cüzdanı' },
  '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8': { label: 'Binance 7',         type: 'BORSA',      note: 'Binance büyük rezerv cüzdanı' },
  '0x5a52e96bacdabb82fd05763e25335261b270efcb': { label: 'Binance',           type: 'BORSA',      note: 'Binance cüzdanı' },
  '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be': { label: 'Binance',           type: 'BORSA',      note: 'Binance cüzdanı' },
  '0xd551234ae421e3bcba99a0da6d736074f22192ff': { label: 'Binance',           type: 'BORSA',      note: 'Binance cüzdanı' },
  // Coinbase
  '0x71660c4005ba85c37ccec55d0c4493e66fe775d3': { label: 'Coinbase 1',        type: 'BORSA',      note: 'Coinbase soğuk cüzdanı' },
  '0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43': { label: 'Coinbase 2',        type: 'BORSA',      note: 'Coinbase cüzdanı' },
  '0x503828976d22510aad0201ac7ec88293211d23da': { label: 'Coinbase 3',        type: 'BORSA',      note: 'Coinbase cüzdanı' },
  // OKX
  '0x6cc5f688a315f3dc28a7781717a9a798a59fda7b': { label: 'OKX',               type: 'BORSA',      note: 'OKX borsası' },
  '0x98ec059dc3adfbdd63429454aeb0c990fba4a128': { label: 'OKX 2',             type: 'BORSA',      note: 'OKX cüzdanı' },
  // Kraken
  '0x2910543af39aba0cd09dbb2d50200b3e800a63d2': { label: 'Kraken',            type: 'BORSA',      note: 'Kraken borsası' },
  '0xae2d4617c862309a3d75a0ffb358c7a5009c673f': { label: 'Kraken 2',          type: 'BORSA',      note: 'Kraken cüzdanı' },
  // Bybit
  '0xf89d7b9c864f589bbf53a82105107622b35eaa40': { label: 'Bybit',             type: 'BORSA',      note: 'Bybit borsası' },
  // Gate.io
  '0x0d0707963952f2fba59dd06f2b425ace40b492fe': { label: 'Gate.io',           type: 'BORSA',      note: 'Gate.io borsası' },
  // Bitfinex
  '0x1151314c646ce4e0efd76d1af4760ae66a9fe30f': { label: 'Bitfinex',          type: 'BORSA',      note: 'Bitfinex borsası' },
  // Arbitrum ecosystem
  '0x611f7bf868a6212f871e89f7e44684045ddfb09d': { label: 'Arbitrum Foundation', type: 'VAKIF',   note: 'ARB ekosistem geliştirme fonu' },
  '0x0529ea5885702715e83923c59746ae8734c553b7': { label: 'Arbitrum DAO Treasury', type: 'VAKIF', note: 'DAO yönetişim hazinesi' },
  '0x91d40e4818f4d4c57b4578d9eca6afc92ac8debe': { label: 'Offchain Labs',     type: 'EKIP',       note: 'Arbitrum geliştirici ekibi' },
  // Uniswap
  '0x1a9c8182c09f50c8318d769245bea52c32be35bc': { label: 'Uniswap Governance', type: 'VAKIF',    note: 'Uniswap DAO yönetişim kontratı' },
  // Chainlink
  '0x4b21ad6df9bb34d08771a23a635dfbab5b5bf31c': { label: 'Chainlink',         type: 'VAKIF',      note: 'Chainlink ekosistem cüzdanı' },
  // MicroStrategy
  '0x6c8b0dee9e90ea9f790da5daf6f5b20d23b39689': { label: 'MicroStrategy',     type: 'KURUM',      note: 'MicroStrategy kurumsal Bitcoin holderı' },
  // Grayscale
  '0xa9f5def91e2d41fc0e25fee41f12f6dce54fbcb0': { label: 'Grayscale',         type: 'KURUM',      note: 'Grayscale kripto yatırım fonu' },
  // Wormhole / bridges
  '0x3ee18b2214aff97000d974cf647e7c347e8fa585': { label: 'Wormhole Bridge',   type: 'KURUM',      note: 'Cross-chain köprü protokolü' },
};

// EVM token contract addresses
const TOKEN_CONTRACTS: Record<string, string> = {
  ARB:  '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1',
  LINK: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
  UNI:  '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  MATIC:'0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0',
  MKR:  '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
  AAVE: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
};

// WETH for ETH top holders
const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

export async function getOnChainHolders(symbol: string): Promise<WhalHolder[] | null> {
  const contractAddress = TOKEN_CONTRACTS[symbol.toUpperCase()]
    ?? (symbol.toUpperCase() === 'ETH' ? WETH : null);

  if (!contractAddress) return null;  // SOL, BTC, ADA, etc. → Gemini will handle

  try {
    const res = await fetch(
      `https://api.ethplorer.io/getTopTokenHolders/${contractAddress}?apiKey=freekey&limit=15`,
      { headers: { 'User-Agent': 'AXIOM/1.0' }, next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const holders: any[] = data?.holders ?? [];

    return holders.map((h: any) => {
      const addr = h.address?.toLowerCase() ?? '';
      const known = KNOWN_LABELS[addr];
      return {
        address: h.address,
        share: parseFloat((h.share ?? 0).toFixed(2)),
        label: known?.label ?? null,
        type: known?.type ?? 'BILINMIYOR',
        note: known?.note ?? null,
      };
    });
  } catch (err) {
    console.error('[crypto-whales] fetch failed:', err);
    return null;
  }
}

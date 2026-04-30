/**
 * BIST (Borsa Istanbul) symbol registry & market detection.
 *
 * Used to route data fetches:
 *   - BIST symbols → yahoo-finance2 with `.IS` suffix (Phase 1)
 *   - US symbols   → FMP / Finnhub (existing)
 *
 * Phase 2 will switch BIST source to Twelve Data via a server-side proxy,
 * but the public helpers here stay the same.
 *
 * Detection layers (in order of priority):
 *   1. Local `BIST_SYMBOLS` (popular ~50, instant suggestions)
 *   2. `isBISTAsync()` — Yahoo lookup with cache (any BIST stock)
 *
 * The local list intentionally only contains liquid blue chips for fast UX;
 * the Yahoo lookup transparently handles the long tail.
 */

// Auto-derived from BIST_COMPANY_NAMES below — kept stable as a typed tuple
// for legacy code that imports BIST_SYMBOLS directly.
export const BIST_SYMBOLS = [
  // Banks
  'AKBNK', 'GARAN', 'YKBNK', 'HALKB', 'ISCTR', 'VAKBN', 'ALBRK', 'TSKB', 'ICBCT', 'QNBFB',
  'TBANK', 'SKBNK',
  // Holdings & conglomerates
  'KCHOL', 'SAHOL', 'DOHOL', 'ENKAI', 'TKFEN', 'AGHOL', 'ALARK', 'GSDHO', 'IHEVA', 'IHLAS',
  'ECILC', 'POLHO',
  // Industrials & defense
  'ASELS', 'OTKAR', 'KARSN', 'TTRAK', 'ARCLK', 'VESTL', 'ULKER', 'BAGFS', 'EGEEN', 'FROTO',
  'TOASO', 'KATMR',
  // Airlines & logistics
  'THYAO', 'PGSUS', 'TAVHL', 'CLEBI', 'TLMAN', 'RYSAS',
  // Energy & petrochem
  'TUPRS', 'PETKM', 'AKSEN', 'AYGAZ', 'ZOREN', 'ODAS', 'GWIND', 'AKENR', 'ENJSA', 'IPEKE',
  'TRENJ', 'EUREN', 'ALCTL', 'CWENE', 'AYDEM', 'MAGEN',
  // Materials & metals
  'EREGL', 'KRDMD', 'KRDMA', 'KRDMB', 'KOZAL', 'KOZAA', 'CIMSA', 'AKCNS', 'KARDM', 'OYAKC',
  'CEMTS', 'BRSAN', 'IZMDC', 'CMENT', 'GOLTS', 'KONYA', 'BURVA',
  // Retail & consumer
  'BIMAS', 'MGROS', 'SOKM', 'CCOLA', 'AEFES', 'TCELL', 'TTKOM', 'MAVI', 'KOTON', 'BIZIM',
  'PINSU', 'PNSUT', 'PETUN', 'TATGD', 'TUKAS', 'KENT', 'CUSAN', 'TKNSA',
  // Construction & real estate
  'EKGYO', 'SISE', 'TRGYO', 'ISGYO', 'ALGYO', 'HLGYO', 'AKMGY', 'AKSGY', 'MAALT', 'KLMSN', 'EKOS',
  // Tech / chemicals / agro
  'SASA', 'AKSA', 'KORDS', 'GUBRF', 'SUNTK', 'LOGO', 'KAREL', 'SMRTG', 'NETAS', 'INDES',
  'ARENA', 'ESCOM', 'ALCAR', 'EGGUB', 'HEKTS', 'RTALB', 'DEVA', 'SELEC', 'ECZYT',
  // Insurance
  'TURSG', 'AKGRT', 'ANSGR',
  // Healthcare
  'MPARK', 'LKMNH',
  // Food & agro
  'ULUSE', 'ULUUN', 'PENGD',
  // Media
  'HURGZ', 'DGGYO', 'DGZTE',
  // Tourism & leisure
  'MARTI',
] as const;

const BIST_SET = new Set<string>(BIST_SYMBOLS as readonly string[]);

export type Market = 'US' | 'TR';

export const BIST_COMPANY_NAMES: Record<string, string> = {
  // Banks
  AKBNK: 'Akbank',
  GARAN: 'Garanti BBVA',
  YKBNK: 'Yapı Kredi Bankası',
  HALKB: 'Halkbank',
  ISCTR: 'İş Bankası (C)',
  VAKBN: 'Vakıfbank',
  ALBRK: 'Albaraka Türk',
  TSKB: 'TSKB',
  ICBCT: 'ICBC Turkey',
  QNBFB: 'QNB Finansbank',
  // Holdings & conglomerates
  KCHOL: 'Koç Holding',
  SAHOL: 'Sabancı Holding',
  DOHOL: 'Doğan Holding',
  ENKAI: 'Enka İnşaat',
  TKFEN: 'Tekfen Holding',
  AGHOL: 'Anadolu Grubu Holding',
  ALARK: 'Alarko Holding',
  GSDHO: 'GSD Holding',
  IHEVA: 'İhlas Ev Aletleri',
  IHLAS: 'İhlas Holding',
  ECILC: 'EİS Eczacıbaşı İlaç',
  // Industrials & defense
  ASELS: 'Aselsan Elektronik',
  OTKAR: 'Otokar Otomotiv',
  KARSN: 'Karsan Otomotiv',
  TTRAK: 'Türk Traktör',
  ARCLK: 'Arçelik',
  VESTL: 'Vestel Elektronik',
  ULKER: 'Ülker Bisküvi',
  BAGFS: 'Bagfaş',
  EGEEN: 'Ege Endüstri',
  FROTO: 'Ford Otosan',
  TOASO: 'Tofaş Otomotiv',
  KATMR: 'Katmerciler',
  // Airlines & logistics
  THYAO: 'Türk Hava Yolları',
  PGSUS: 'Pegasus Hava Yolları',
  TAVHL: 'TAV Havalimanları',
  CLEBI: 'Çelebi Hava Servisi',
  TLMAN: 'Trabzon Liman İşletmeleri',
  RYSAS: 'Reysaş Lojistik',
  // Energy & petrochem
  TUPRS: 'Tüpraş',
  PETKM: 'Petkim Petrokimya',
  AKSEN: 'Aksa Enerji',
  AYGAZ: 'Aygaz',
  ZOREN: 'Zorlu Enerji',
  ODAS: 'Odaş Elektrik',
  GWIND: 'Galata Wind Enerji',
  AKENR: 'Akenerji Elektrik',
  ENJSA: 'Enerjisa Enerji',
  IPEKE: 'İpek Doğal Enerji',
  TRENJ: 'İpek Enerji',
  EUREN: 'Euro Yatırım Holding',
  ALCTL: 'Alcatel Lucent Teletas',
  CWENE: 'CW Enerji',
  // Materials & metals
  EREGL: 'Ereğli Demir Çelik',
  KRDMD: 'Kardemir (D)',
  KRDMA: 'Kardemir (A)',
  KRDMB: 'Kardemir (B)',
  KOZAL: 'Koza Altın',
  KOZAA: 'Koza Anadolu Metal',
  CIMSA: 'Çimsa Çimento',
  AKCNS: 'Akçansa Çimento',
  KARDM: 'Kardemir',
  OYAKC: 'Oyak Çimento',
  CEMTS: 'Çemtaş',
  BRSAN: 'Borusan Mannesmann',
  IZMDC: 'İzmir Demir Çelik',
  CMENT: 'Çimentaş',
  GOLTS: 'Göltaş Çimento',
  KONYA: 'Konya Çimento',
  BURVA: 'Burçelik Vana',
  // Retail & consumer
  BIMAS: 'BİM Birleşik Mağazalar',
  MGROS: 'Migros Ticaret',
  SOKM: 'Şok Marketler',
  CCOLA: 'Coca-Cola İçecek',
  AEFES: 'Anadolu Efes',
  TCELL: 'Turkcell',
  TTKOM: 'Türk Telekom',
  MAVI: 'Mavi Giyim',
  KOTON: 'Koton Mağazacılık',
  BIZIM: 'Bizim Toptan',
  PINSU: 'Pınar Su',
  PNSUT: 'Pınar Süt',
  PETUN: 'Pınar Et ve Un',
  TATGD: 'Tat Gıda',
  TUKAS: 'Tukaş Gıda',
  KENT: 'Kent Gıda',
  CUSAN: 'Çuhadaroğlu Metal',
  // Construction & real estate
  EKGYO: 'Emlak Konut GYO',
  SISE: 'Şişe Cam',
  TRGYO: 'Torunlar GYO',
  ISGYO: 'İş GYO',
  ALGYO: 'Alarko GYO',
  HLGYO: 'Halk GYO',
  AKMGY: 'Akmerkez GYO',
  AKSGY: 'Akış GYO',
  MAALT: 'Marmaris Altınyunus',
  KLMSN: 'Klimasan',
  EKOS: 'Ekos',
  // Tech / chemicals / others
  SASA: 'SASA Polyester',
  AKSA: 'Aksa Akrilik',
  KORDS: 'Kordsa',
  GUBRF: 'Gübre Fabrikaları',
  SUNTK: 'Suntekstil',
  LOGO: 'Logo Yazılım',
  KAREL: 'Karel Elektronik',
  SMRTG: 'Smart Güneş Teknolojileri',
  NETAS: 'Netaş Telekom',
  INDES: 'İndeks Bilgisayar',
  ARENA: 'Arena Bilgisayar',
  ESCOM: 'Escom Elektronik',
  ALCAR: 'Alarko Carrier',
  EGGUB: 'Ege Gübre',
  HEKTS: 'Hektaş Ticaret',
  RTALB: 'RTA Laboratuvarları',
  DEVA: 'Deva Holding',
  SELEC: 'Selçuk Ecza Deposu',
  ECZYT: 'Eczacıbaşı Yatırım',
  // Insurance & finance
  TURSG: 'Türkiye Sigorta',
  AKGRT: 'Aksigorta',
  ANSGR: 'Anadolu Sigorta',
  AKBNK_W: 'Akbank',
  TBANK: 'Turkland Bank',
  SKBNK: 'Şekerbank',
  YAPIK: 'Yapı Kredi Koray GYO',
  // Media & telecom
  HURGZ: 'Hürriyet Gazetecilik',
  DGGYO: 'Doğuş GE GYO',
  DGZTE: 'Doğan Gazetecilik',
  // Tourism & leisure
  AYDEM: 'Aydem Yenilenebilir',
  MAGEN: 'Margün Enerji',
  MARTI: 'Martı Otel',
  TKNSA: 'Teknosa İç ve Dış',
  // Healthcare
  MPARK: 'MLP Sağlık',
  LKMNH: 'Lokman Hekim Engürüsağ',
  POLHO: 'Polat Holding',
  // Food & agriculture
  ULUSE: 'Ulusoy Elektrik',
  ULUUN: 'Ulusoy Un',
  PENGD: 'Penguen Gıda',
  ULKER_B: 'Ülker Bisküvi',
  // Index & ETF
  XU100: 'BIST 100 Endeksi',
  XU030: 'BIST 30 Endeksi',
  XBANK: 'BIST Banka Endeksi',
};

/** Returns "TR" for BIST symbols, "US" otherwise. Case-insensitive. */
export function detectMarket(symbol: string): Market {
  if (!symbol) return 'US';
  return BIST_SET.has(symbol.toUpperCase()) ? 'TR' : 'US';
}

export function isBIST(symbol: string): boolean {
  return detectMarket(symbol) === 'TR';
}

/** Convert BIST symbol to Yahoo Finance format: "GARAN" -> "GARAN.IS". */
export function toYahooSymbol(symbol: string): string {
  const sym = symbol.toUpperCase().trim();
  if (sym.endsWith('.IS')) return sym;
  return `${sym}.IS`;
}

/** Strip Yahoo suffix back to plain symbol: "GARAN.IS" -> "GARAN". */
export function fromYahooSymbol(yahooSymbol: string): string {
  return yahooSymbol.replace(/\.IS$/, '').toUpperCase();
}

/**
 * Normalize a Turkish string for fuzzy matching:
 *   "Migros Ticaret" → "MIGROS TICARET"
 *   "Şişe Cam"       → "SISE CAM"
 *   "İş Bankası"     → "IS BANKASI"
 */
function normalizeTR(s: string): string {
  return s
    .toUpperCase()
    .replace(/İ/g, 'I')
    .replace(/I/g, 'I') // dotless I stays
    .replace(/Ş/g, 'S')
    .replace(/Ç/g, 'C')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ö/g, 'O')
    .replace(/[^A-Z0-9 ]/g, '');
}

/**
 * Search BIST list for a query (used by /api/stock/search).
 *
 * Matches against:
 *   - Symbol prefix: "GAR" → GARAN, GARFA
 *   - Symbol contains: "GROS" → MGROS
 *   - Company name (Turkish-normalized) contains query
 *     "MIGROS" → MGROS (Migros Ticaret)
 *     "ARCELIK" → ARCLK (Arçelik)
 *     "SISECAM" → SISE (Şişe Cam)
 *     "BANKASI" → ISCTR, AKBNK, ...
 */
export function searchBISTSymbols(query: string, limit = 8) {
  const qNorm = normalizeTR(query.trim());
  if (!qNorm) return [];

  type Match = { symbol: string; score: number };
  const matches: Match[] = [];

  const qNoSpace = qNorm.replace(/ /g, '');

  for (const s of BIST_SYMBOLS as readonly string[]) {
    const symNorm = s; // symbols are already uppercase ASCII
    const nameNorm = normalizeTR(BIST_COMPANY_NAMES[s] || '');
    const nameNoSpace = nameNorm.replace(/ /g, '');

    let score = 0;
    if (symNorm === qNorm) score = 100;
    else if (symNorm.startsWith(qNorm)) score = 80;
    else if (symNorm.includes(qNorm)) score = 60;
    else if (nameNorm.startsWith(qNorm)) score = 50;
    else if (nameNoSpace.startsWith(qNoSpace)) score = 45; // "SISECAM" → "SISE CAM"
    else if (nameNorm.split(' ').some(w => w.startsWith(qNorm))) score = 40;
    else if (nameNorm.includes(qNorm)) score = 30;
    else if (nameNoSpace.includes(qNoSpace)) score = 25;

    if (score > 0) matches.push({ symbol: s, score });
  }

  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(m => ({
      symbol: m.symbol,
      name: BIST_COMPANY_NAMES[m.symbol] || m.symbol,
      displaySymbol: m.symbol,
      type: 'BIST',
      market: 'TR' as Market,
    }));
}

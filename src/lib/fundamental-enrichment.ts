/**
 * Temel Analiz veri zenginleştirme — broker/fon yöneticisi seviyesi.
 *
 * route.ts'in mevcut fetchStockData'sı sadece P/E, ROE gibi türetilmiş
 * oranları çekiyordu. Bu modül bilanço ham kalemlerini, sektör baseline'ını,
 * analist hedef fiyatını, coğrafi gelir kırılımını, AXIOM sembol haberlerini
 * ve TR için KAP döviz pozisyonunu ekler. Tüm fetcher'lar fail-soft —
 * her biri null döndürebilir, üst katman yorumlanacak veri eksikse "veri
 * yok" der.
 *
 * Anti-halüsinasyon zinciri: ajan promptlarında "sektör ortalaması" gibi
 * iddialar SADECE buradan gelen baseline'lara dayanır; veri yoksa ajan
 * iddiada bulunamaz (prompt kuralı).
 */
const FMP_BASE = 'https://financialmodelingprep.com/stable';

// ─── 1. Balance Sheet ham kalemler (A1) ─────────────────────────────────
//
// Broker matrisi gerektiriyor: Net İşletme Sermayesi, Kaldıraç (TotalDebt/
// TotalAssets), Stok Devir (COGS/Inventory), DSO (AR/Revenue). Hepsi ham
// kalemden hesaplanır; tek bir oran çekmek yerine tam tablo alıyoruz ki
// frontend C1 sekmesinde ham bilanço da gösterilebilsin.
export interface BalanceSheetRow {
  date: string;            // YYYY-MM-DD
  cashAndShortTermInvestments: number | null;
  totalCurrentAssets: number | null;
  inventory: number | null;
  netReceivables: number | null;
  totalAssets: number | null;
  totalCurrentLiabilities: number | null;
  shortTermDebt: number | null;
  longTermDebt: number | null;
  totalDebt: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  goodwill: number | null;
  intangibleAssets: number | null;
}

export async function fetchBalanceSheet(
  symbol: string,
  apiKey: string,
  limit = 4,
): Promise<BalanceSheetRow[]> {
  try {
    const url = `${FMP_BASE}/balance-sheet-statement?symbol=${symbol}&limit=${limit}&apikey=${apiKey}`;
    const r = await fetch(url, { next: { revalidate: 3600 } });
    if (!r.ok) return [];
    const arr = await r.json();
    if (!Array.isArray(arr)) return [];
    return arr.map((s: any) => ({
      date: String(s.date || '').slice(0, 10),
      cashAndShortTermInvestments: num(s.cashAndShortTermInvestments ?? s.cashAndCashEquivalents),
      totalCurrentAssets: num(s.totalCurrentAssets),
      inventory: num(s.inventory),
      netReceivables: num(s.netReceivables ?? s.accountsReceivables),
      totalAssets: num(s.totalAssets),
      totalCurrentLiabilities: num(s.totalCurrentLiabilities),
      shortTermDebt: num(s.shortTermDebt),
      longTermDebt: num(s.longTermDebt),
      totalDebt: num(s.totalDebt),
      totalLiabilities: num(s.totalLiabilities),
      totalEquity: num(s.totalStockholdersEquity ?? s.totalEquity),
      goodwill: num(s.goodwill),
      intangibleAssets: num(s.intangibleAssets),
    }));
  } catch (e) {
    console.warn('[FMP balance-sheet] fail', e);
    return [];
  }
}

// ─── 2. Income Statement ek alanlar (A5) ────────────────────────────────
//
// Mevcut route.ts revenue + netIncome + grossProfit + operatingIncome
// çekiyor. Broker matrisi için R&D, SG&A, interestExpense, costOfRevenue
// (Stok Devir formülü), incomeTaxExpense da gerek. Aynı endpoint'i ikinci
// kez çağırmak yerine route.ts mevcut sonucu bu fonksiyona pas etmeli.
export interface IncomeStatementExtended {
  date: string;
  revenue: number | null;
  costOfRevenue: number | null;       // → Stok Devir (COGS)
  grossProfit: number | null;
  researchAndDevelopmentExpenses: number | null;
  sellingGeneralAndAdministrativeExpenses: number | null;
  operatingExpenses: number | null;
  operatingIncome: number | null;     // EBIT
  interestExpense: number | null;     // → Faiz Karşılama
  incomeTaxExpense: number | null;
  netIncome: number | null;
  ebitda: number | null;
  eps: number | null;
  epsDiluted: number | null;
}

export function mapIncomeStatementExtended(arr: any[]): IncomeStatementExtended[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((s: any) => ({
    date: String(s.date || '').slice(0, 10),
    revenue: num(s.revenue),
    costOfRevenue: num(s.costOfRevenue),
    grossProfit: num(s.grossProfit),
    researchAndDevelopmentExpenses: num(s.researchAndDevelopmentExpenses),
    sellingGeneralAndAdministrativeExpenses: num(
      s.sellingGeneralAndAdministrativeExpenses ?? s.sellingGeneralAndAdministrative,
    ),
    operatingExpenses: num(s.operatingExpenses),
    operatingIncome: num(s.operatingIncome),
    interestExpense: num(s.interestExpense),
    incomeTaxExpense: num(s.incomeTaxExpense),
    netIncome: num(s.netIncome),
    ebitda: num(s.ebitda),
    eps: num(s.eps ?? s.epsBasic),
    epsDiluted: num(s.epsdiluted ?? s.epsDiluted),
  }));
}

// ─── 3. Cash Flow ek alanlar (A4) ───────────────────────────────────────
//
// Buyback, temettü, borç ihracı/itfası, çalışma sermayesi değişimi —
// hepsi tek endpoint'te zaten dönüyor ama route.ts sadece operatingCF/
// capex/fcf çekiyordu. Burada hepsini map'le.
export interface CashFlowExtended {
  date: string;
  operatingCashFlow: number | null;
  capitalExpenditure: number | null;
  freeCashFlow: number | null;
  commonStockRepurchased: number | null;   // buyback (genelde negatif)
  dividendsPaid: number | null;            // genelde negatif
  debtRepayment: number | null;
  debtIssuance: number | null;
  changeInWorkingCapital: number | null;
  netCashProvidedByOperatingActivities: number | null;
  netCashUsedForInvestingActivities: number | null;
  netCashUsedForFinancingActivities: number | null;
}

export function mapCashFlowExtended(arr: any[]): CashFlowExtended[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((s: any) => ({
    date: String(s.date || '').slice(0, 10),
    operatingCashFlow: num(s.operatingCashFlow),
    capitalExpenditure: num(s.capitalExpenditure),
    freeCashFlow: num(s.freeCashFlow),
    commonStockRepurchased: num(s.commonStockRepurchased),
    dividendsPaid: num(s.dividendsPaid ?? s.commonDividendsPaid),
    debtRepayment: num(s.debtRepayment),
    debtIssuance: num(s.debtIssuance ?? s.netDebtIssuance),
    changeInWorkingCapital: num(s.changeInWorkingCapital),
    netCashProvidedByOperatingActivities: num(s.netCashProvidedByOperatingActivities),
    netCashUsedForInvestingActivities: num(s.netCashUsedForInvestingActivities),
    netCashUsedForFinancingActivities: num(s.netCashUsedForFinancingActivities),
  }));
}

// ─── 4. Sektör baseline (A2) ────────────────────────────────────────────
//
// Halüsinasyon engelinin temel taşı. Ajan 2 (Stratejist) "FD/FAVÖK sektör
// ortalamasıyla karşılaştır (tech 15-25, sanayi 8-12)" diye eğitim
// verisinden konuşuyordu — artık gerçek baseline'ı prompt'a vereceğiz.
export interface SectorBaseline {
  sectorPE: number | null;
  industryPE: number | null;
  sectorName: string | null;
  industryName: string | null;
  source: string;
}

export async function fetchSectorBaseline(
  sector: string,
  industry: string,
  apiKey: string,
): Promise<SectorBaseline> {
  const out: SectorBaseline = {
    sectorPE: null, industryPE: null,
    sectorName: sector || null, industryName: industry || null,
    source: 'FMP',
  };
  // FMP snapshot tarih+exchange granularitesinde dönüyor. Hafta sonu/tatil
  // veri olmayabilir → son 7 günü iteratif dene. Birden fazla exchange için
  // ortalama al (sektör genelinin yansıması).
  const tryDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    tryDates.push(d.toISOString().slice(0, 10));
  }
  const avg = (arr: number[]) => arr.length
    ? +(arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(2)
    : null;
  try {
    for (const date of tryDates) {
      if (out.sectorPE != null && out.industryPE != null) break;
      const [secRes, indRes] = await Promise.allSettled([
        out.sectorPE == null
          ? fetch(`${FMP_BASE}/sector-pe-snapshot?date=${date}&apikey=${apiKey}`, { next: { revalidate: 86400 } })
          : Promise.resolve(null as any),
        out.industryPE == null
          ? fetch(`${FMP_BASE}/industry-pe-snapshot?date=${date}&apikey=${apiKey}`, { next: { revalidate: 86400 } })
          : Promise.resolve(null as any),
      ]);
      if (secRes.status === 'fulfilled' && secRes.value && (secRes.value as Response).ok) {
        const arr = await (secRes.value as Response).json();
        if (Array.isArray(arr) && arr.length && sector) {
          const pes = arr
            .filter((r: any) => String(r.sector || '').toLowerCase() === sector.toLowerCase())
            .map((r: any) => num(r.pe))
            .filter((n: number | null): n is number => n != null && n > 0 && n < 1000);
          if (pes.length) out.sectorPE = avg(pes);
        }
      }
      if (indRes.status === 'fulfilled' && indRes.value && (indRes.value as Response).ok) {
        const arr = await (indRes.value as Response).json();
        if (Array.isArray(arr) && arr.length && industry) {
          const pes = arr
            .filter((r: any) => String(r.industry || '').toLowerCase() === industry.toLowerCase())
            .map((r: any) => num(r.pe))
            .filter((n: number | null): n is number => n != null && n > 0 && n < 1000);
          if (pes.length) out.industryPE = avg(pes);
        }
      }
    }
  } catch (e) {
    console.warn('[FMP sector-baseline] fail', e);
  }
  return out;
}

// ─── 5. Analist hedef fiyat (A3) ────────────────────────────────────────
export interface AnalystTarget {
  consensusHigh: number | null;
  consensusMedian: number | null;
  consensusLow: number | null;
  numAnalysts: number | null;
  recentBuy: number | null;
  recentHold: number | null;
  recentSell: number | null;
}

export async function fetchAnalystTarget(
  symbol: string,
  apiKey: string,
): Promise<AnalystTarget> {
  const out: AnalystTarget = {
    consensusHigh: null, consensusMedian: null, consensusLow: null,
    numAnalysts: null, recentBuy: null, recentHold: null, recentSell: null,
  };
  try {
    const [consRes, gradesRes] = await Promise.allSettled([
      fetch(`${FMP_BASE}/price-target-consensus?symbol=${symbol}&apikey=${apiKey}`, { next: { revalidate: 14400 } }),
      fetch(`${FMP_BASE}/grades-consensus?symbol=${symbol}&apikey=${apiKey}`, { next: { revalidate: 14400 } }),
    ]);
    if (consRes.status === 'fulfilled' && consRes.value.ok) {
      const arr = await consRes.value.json();
      const row = Array.isArray(arr) ? arr[0] : arr;
      if (row) {
        out.consensusHigh = num(row.targetHigh);
        out.consensusMedian = num(row.targetMedian ?? row.targetConsensus);
        out.consensusLow = num(row.targetLow);
      }
    }
    if (gradesRes.status === 'fulfilled' && gradesRes.value.ok) {
      const arr = await gradesRes.value.json();
      const row = Array.isArray(arr) ? arr[0] : arr;
      if (row) {
        out.recentBuy = num(row.strongBuy != null ? row.strongBuy + (row.buy ?? 0) : row.buy);
        out.recentHold = num(row.hold);
        out.recentSell = num(row.sell != null ? row.sell + (row.strongSell ?? 0) : row.sell);
        const total = (out.recentBuy ?? 0) + (out.recentHold ?? 0) + (out.recentSell ?? 0);
        out.numAnalysts = total || null;
      }
    }
  } catch (e) {
    console.warn('[FMP analyst-target] fail', e);
  }
  return out;
}

// ─── 6. Coğrafi gelir (A11) — ABD hisseleri için kur exposure vekili ────
export interface GeographicRevenue {
  fiscalYear: string | null;
  segments: Array<{ region: string; revenue: number; sharePct: number }>;
}

export async function fetchGeographicRevenue(
  symbol: string,
  apiKey: string,
): Promise<GeographicRevenue> {
  const out: GeographicRevenue = { fiscalYear: null, segments: [] };
  try {
    const url = `${FMP_BASE}/revenue-geographic-segmentation?symbol=${symbol}&structure=flat&apikey=${apiKey}`;
    const r = await fetch(url, { next: { revalidate: 86400 } });
    if (!r.ok) return out;
    const arr = await r.json();
    if (!Array.isArray(arr) || arr.length === 0) return out;
    // FMP format: [{ date, data: { "United States": N, "Europe": N, ... } }]
    const latest = arr[0];
    out.fiscalYear = String(latest.date || '').slice(0, 10) || null;
    const data = latest.data || {};
    const entries: Array<[string, number]> = Object.entries(data)
      .map(([k, v]) => [k, Number(v) || 0]) as Array<[string, number]>;
    const total = entries.reduce((s, [, v]) => s + v, 0);
    if (total > 0) {
      out.segments = entries
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([region, revenue]) => ({
          region, revenue, sharePct: +((revenue / total) * 100).toFixed(1),
        }));
    }
  } catch (e) {
    console.warn('[FMP geographic-revenue] fail', e);
  }
  return out;
}

// ─── 7. AXIOM sembol haberleri (A6) ─────────────────────────────────────
//
// AXIOM backend `news_items` tablosunda hisseye-özel haberler var
// (mentioned_symbols join). Backend henüz "symbol filtered news" endpoint'i
// expose etmiyor; ileride eklenecek. Şimdilik FMP /stable/news-stock'tan
// sembol özel haberi çekiyoruz (axiom_analysis YOK ama başlık + tarih var).
// İleride backend endpoint geldiğinde buradan değiş.
export interface SymbolNewsItem {
  date: string;
  title: string;
  source: string;
  url?: string;
  summary?: string;
}

export async function fetchSymbolNews(
  symbol: string,
  apiKey: string,
  limit = 12,
): Promise<SymbolNewsItem[]> {
  try {
    const url = `${FMP_BASE}/news/stock?symbols=${symbol}&limit=${limit}&apikey=${apiKey}`;
    const r = await fetch(url, { next: { revalidate: 1800 } });
    if (!r.ok) return [];
    const arr = await r.json();
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, limit).map((n: any) => ({
      date: String(n.publishedDate || n.date || '').slice(0, 10),
      title: String(n.title || '').slice(0, 200),
      source: String(n.site || n.publisher || '').slice(0, 40),
      url: n.url,
      summary: n.text ? String(n.text).slice(0, 280) : undefined,
    }));
  } catch (e) {
    console.warn('[FMP symbol-news] fail', e);
    return [];
  }
}

// ─── 8. Türetilmiş Oranlar — KODDA HESAPLA (B2) ─────────────────────────
//
// Broker matrisindeki tüm oranları model uydurmasın diye burada deterministik
// hesaplıyoruz. Prompt'a sıkı sayılarla geçecek; ajan SADECE yorumlasın.
export interface ComputedRatios {
  // Likidite
  netWorkingCapital: number | null;       // CA - CL
  netWorkingCapitalPctRevenue: number | null;
  // Borçluluk
  leverageRatio: number | null;           // TotalDebt / TotalAssets * 100 (%)
  debtToEbitda: number | null;            // mevcut netDebtEbitda zaten var ama burada yedek
  // Verimlilik
  inventoryTurnover: number | null;       // COGS / avg(Inventory)
  daysSalesOutstanding: number | null;    // AR × 365 / Revenue
  daysInventoryOutstanding: number | null;// Inventory × 365 / COGS
  // Kârlılık (formülize)
  ebitdaMargin: number | null;            // EBITDA / Revenue
  rdIntensity: number | null;             // R&D / Revenue
  sgaIntensity: number | null;            // SG&A / Revenue
  effectiveTaxRate: number | null;        // Tax / (NI + Tax)
  // Sermaye dönüşü
  assetTurnover: number | null;           // Revenue / Total Assets (DuPont)
  equityMultiplier: number | null;        // Total Assets / Equity (DuPont)
  // Kâr kalitesi
  cashConversionRatio: number | null;     // OCF / Net Income
  // Buyback / temettü yoğunluğu (kasiyer disiplini)
  shareholderYieldPct: number | null;     // (|buyback| + |dividends|) / MarketCap
}

export function computeRatios(args: {
  latestBS: BalanceSheetRow | null;
  prevBS: BalanceSheetRow | null;
  latestIS: IncomeStatementExtended | null;
  latestCF: CashFlowExtended | null;
  marketCap: number | null;
}): ComputedRatios {
  const { latestBS: bs, prevBS, latestIS: is, latestCF: cf, marketCap } = args;
  const out: ComputedRatios = {
    netWorkingCapital: null, netWorkingCapitalPctRevenue: null,
    leverageRatio: null, debtToEbitda: null,
    inventoryTurnover: null, daysSalesOutstanding: null,
    daysInventoryOutstanding: null,
    ebitdaMargin: null, rdIntensity: null, sgaIntensity: null,
    effectiveTaxRate: null,
    assetTurnover: null, equityMultiplier: null,
    cashConversionRatio: null,
    shareholderYieldPct: null,
  };
  if (bs) {
    if (bs.totalCurrentAssets != null && bs.totalCurrentLiabilities != null) {
      out.netWorkingCapital = bs.totalCurrentAssets - bs.totalCurrentLiabilities;
    }
    if (bs.totalDebt != null && bs.totalAssets && bs.totalAssets > 0) {
      out.leverageRatio = +((bs.totalDebt / bs.totalAssets) * 100).toFixed(1);
    }
    if (bs.totalAssets != null && bs.totalEquity && bs.totalEquity > 0) {
      out.equityMultiplier = +(bs.totalAssets / bs.totalEquity).toFixed(2);
    }
  }
  if (is) {
    if (is.revenue && is.revenue > 0) {
      if (out.netWorkingCapital != null) {
        out.netWorkingCapitalPctRevenue = +((out.netWorkingCapital / is.revenue) * 100).toFixed(1);
      }
      if (is.ebitda != null) {
        out.ebitdaMargin = +((is.ebitda / is.revenue) * 100).toFixed(1);
      }
      if (is.researchAndDevelopmentExpenses != null) {
        out.rdIntensity = +((is.researchAndDevelopmentExpenses / is.revenue) * 100).toFixed(1);
      }
      if (is.sellingGeneralAndAdministrativeExpenses != null) {
        out.sgaIntensity = +((is.sellingGeneralAndAdministrativeExpenses / is.revenue) * 100).toFixed(1);
      }
      if (bs?.totalAssets && bs.totalAssets > 0) {
        out.assetTurnover = +(is.revenue / bs.totalAssets).toFixed(2);
      }
      if (bs?.netReceivables != null) {
        out.daysSalesOutstanding = +((bs.netReceivables * 365) / is.revenue).toFixed(0);
      }
    }
    if (is.incomeTaxExpense != null && is.netIncome != null) {
      const pretax = is.netIncome + is.incomeTaxExpense;
      if (pretax > 0) out.effectiveTaxRate = +((is.incomeTaxExpense / pretax) * 100).toFixed(1);
    }
    // COGS-tabanlı verimlilik
    if (is.costOfRevenue && is.costOfRevenue > 0) {
      const avgInv = bs && prevBS
        ? ((bs.inventory ?? 0) + (prevBS.inventory ?? 0)) / 2
        : (bs?.inventory ?? 0);
      if (avgInv > 0) {
        out.inventoryTurnover = +(is.costOfRevenue / avgInv).toFixed(2);
        out.daysInventoryOutstanding = +((avgInv * 365) / is.costOfRevenue).toFixed(0);
      }
    }
    // Borç/FAVÖK fallback (mevcut netDebtEbitda yoksa)
    if (bs?.totalDebt != null && is.ebitda && is.ebitda > 0) {
      const cash = bs.cashAndShortTermInvestments ?? 0;
      out.debtToEbitda = +(((bs.totalDebt - cash) / is.ebitda)).toFixed(2);
    }
    // Cash conversion
    if (cf?.operatingCashFlow != null && is.netIncome && is.netIncome !== 0) {
      out.cashConversionRatio = +(cf.operatingCashFlow / is.netIncome).toFixed(2);
    }
  }
  if (cf && marketCap && marketCap > 0) {
    const buyback = Math.abs(cf.commonStockRepurchased ?? 0);
    const dividends = Math.abs(cf.dividendsPaid ?? 0);
    if (buyback + dividends > 0) {
      out.shareholderYieldPct = +(((buyback + dividends) / marketCap) * 100).toFixed(2);
    }
  }
  return out;
}

// ─── 9. KAP Döviz Pozisyonu (A10) — TR-only ─────────────────────────────
//
// BIST şirketlerinin finansal raporlarının dipnotlarında "Yabancı Para
// Pozisyonu Tablosu" var: net YP varlık - net YP yükümlülük (TL karşılığı).
// FMP'de yok. Doğrudan KAP API'si açık değil; iki yaklaşım:
//   (a) is.fintables.com / mynet finans gibi 3rd party scrape — yasal gri
//   (b) Şirketin son finansal raporunun PDF dipnotunu parse — emek-yoğun
// PRAGMATİK YAKLAŞIM (MVP): Şu an Yahoo'dan "totalDebt" çekiyoruz; "döviz
// borcu / toplam borç" oranını hesaplamak için ayrı kaynak gerek. İlk
// versiyonda BIST için Ajan 3'e "Döviz pozisyonu verisi eklenecek (MVP'de
// yok), bu şirket için coğrafi gelir varsa onu kullan; yoksa kur
// exposure'unu sektör genelinden yorumla" diyeceğiz. Endpoint zaten
// fail-soft döner; veri olmadığında prompt "veri yok" girer.
export interface CurrencyExposure {
  netForeignCurrencyPosition: number | null;  // TL karşılığı
  foreignCurrencyDebtShare: number | null;    // % (FX debt / total debt)
  source: string;
  asOfDate: string | null;
  available: boolean;
}

export async function fetchCurrencyExposure(
  symbol: string,
  isBIST: boolean,
): Promise<CurrencyExposure> {
  // MVP: BIST harici için no-op; BIST için açık veri kaynağı yok → available:false
  // İlerleyen revizyonda KAP scrape veya is.fintables proxy entegre edilecek.
  return {
    netForeignCurrencyPosition: null,
    foreignCurrencyDebtShare: null,
    source: isBIST ? 'KAP (entegrasyon beklemede)' : 'N/A (yalnızca BIST)',
    asOfDate: null,
    available: false,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────
function num(v: any): number | null {
  if (v == null || v === '' || v === '-') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Re-export for route.ts type sharing
export type FundamentalEnrichment = {
  balanceSheet: BalanceSheetRow[];
  incomeStatementExt: IncomeStatementExtended[];
  cashFlowExt: CashFlowExtended[];
  sectorBaseline: SectorBaseline;
  analystTarget: AnalystTarget;
  geographicRevenue: GeographicRevenue;
  symbolNews: SymbolNewsItem[];
  currencyExposure: CurrencyExposure;
  computedRatios: ComputedRatios;
};

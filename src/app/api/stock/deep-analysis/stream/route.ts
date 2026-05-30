import { NextRequest } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { extractLatestReportedQuarter, type LatestReportedQuarter } from '@/lib/earnings-detect';
import { getCachedCryptoReport, setCachedCryptoReport } from '@/lib/crypto-cache';
import {
  fetchBalanceSheet,
  mapIncomeStatementExtended,
  mapCashFlowExtended,
  fetchSectorBaseline,
  fetchAnalystTarget,
  fetchGeographicRevenue,
  fetchSymbolNews,
  fetchCurrencyExposure,
  computeRatios,
  type FundamentalEnrichment,
  type BalanceSheetRow,
  type IncomeStatementExtended,
  type CashFlowExtended,
} from '@/lib/fundamental-enrichment';

const yahooFinance = new YahooFinance({ suppressNotices: ['ripHistorical'] as any });

export const runtime = 'nodejs';

// 5-ajan analizinin Supabase cache'i. Aynı sembol için TTL içinde tekrar
// istek gelirse Gemini yeniden çalışmaz; kayıtlı sonuç anında stream edilir.
// report_type 'fundamental_agents' ile crypto_reports_cache tablosu paylaşılır.
// TTL kısa tutuldu: ajanlar canlı fiyata duyarlı (entry/stop/teknik) — 15 dk.
const AGENT_CACHE_REPORT_TYPE = 'fundamental_agents';
const AGENT_CACHE_TTL_HOURS = 0.25; // 15 dakika

// ─── Gemini helper (robust, fallback-aware) ──────────────────────────────────
// maxOutputTokens 4000'e çıkarıldı: 5 ajanın da karmaşık JSON dönmesi gerekiyor,
// 1500 ile JSON ortasında kesiliyor ve parse başarısız oluyordu → "Veri yetersiz"
const GEMINI_PRIMARY = 'gemini-2.0-flash';
const GEMINI_FALLBACK = 'gemini-2.5-flash-lite';
// Ajan 5 (Portföy Yöneticisi) sentez işi — 4 ajanın çelişkisini dengeleyip
// nihai karar veriyor. Flash burada yüzeysel kalıyordu; Pro daha tutarlı
// yorum üretir. Fallback yine Flash.
const GEMINI_PRO = 'gemini-2.5-pro';

function parseGeminiJson(raw: string): any | null {
  if (!raw) return null;
  // 1) Markdown fence'lerini temizle
  let txt = raw.replace(/```json\s*|\s*```/g, '').trim();
  // 2) İlk { veya [ 'dan son } veya ]'e kadar kes (prefix/suffix gürültüsü)
  const firstBrace = Math.min(
    ...[txt.indexOf('{'), txt.indexOf('[')].filter(i => i !== -1)
  );
  const lastBrace = Math.max(txt.lastIndexOf('}'), txt.lastIndexOf(']'));
  if (firstBrace !== Infinity && lastBrace > firstBrace) {
    txt = txt.slice(firstBrace, lastBrace + 1);
  }
  // 3) Kontrol karakterlerini at (tab & newline hariç her şey)
  const cleaned = txt.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
  // 4) Parse dene (strict false → trailing komma vb.'ye dayanıklı)
  try {
    return JSON.parse(cleaned);
  } catch (e1) {
    // 5) String içindeki ham newline'ları escape ederek yeniden dene
    try {
      const fixed = cleaned.replace(
        /("(?:[^"\\]|\\.)*?)(\n)/g,
        (_m, g1, _g2) => `${g1}\\n`
      );
      return JSON.parse(fixed);
    } catch (e2) {
      console.error('[gemini parse fail]', {
        err1: String(e1).slice(0, 120),
        err2: String(e2).slice(0, 120),
        preview: cleaned.slice(0, 300),
      });
      return null;
    }
  }
}

async function callGeminiModel(model: string, prompt: string): Promise<{ ok: boolean; data?: any; status?: number; err?: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, err: 'GEMINI_API_KEY missing' };
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 4000,
            responseMimeType: 'application/json',
          },
        }),
      }
    );
    if (!res.ok) {
      const body = await res.text();
      console.warn(`[gemini ${model}] HTTP ${res.status}`, body.slice(0, 200));
      return { ok: false, status: res.status, err: body.slice(0, 200) };
    }
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = parseGeminiJson(raw);
    if (!parsed) return { ok: false, err: 'JSON parse failed', data: raw.slice(0, 200) };
    return { ok: true, data: parsed };
  } catch (e) {
    console.error(`[gemini ${model}] exception`, e);
    return { ok: false, err: String(e).slice(0, 200) };
  }
}

async function callGemini(prompt: string, opts?: { model?: string }): Promise<any> {
  const primaryModel = opts?.model || GEMINI_PRIMARY;
  // 1) Primary dene
  const primary = await callGeminiModel(primaryModel, prompt);
  if (primary.ok) return primary.data;
  // 429 (rate limit) / 503 / parse-fail → fallback modele geç
  const shouldFallback = primary.status === 429 || primary.status === 503 || primary.err === 'JSON parse failed';
  if (shouldFallback) {
    // Pro fail ise önce primary flash'a düş; o da fail ise lite
    const fbChain = primaryModel === GEMINI_PRO
      ? [GEMINI_PRIMARY, GEMINI_FALLBACK]
      : [GEMINI_FALLBACK];
    for (const fbModel of fbChain) {
      console.warn(`[gemini] ${primaryModel} başarısız (${primary.status || primary.err}), ${fbModel} deneniyor…`);
      const fb = await callGeminiModel(fbModel, prompt);
      if (fb.ok) return fb.data;
    }
    console.error(`[gemini] Tüm modeller başarısız`, { primaryModel, primary });
  }
  return null;
}

// ─── BIST data fetch (yahoo-finance2 only — FMP doesn't cover BIST) ──
async function fetchBISTStockData(symbol: string) {
  const { toYahooSymbol } = await import('@/lib/bist-symbols');
  const { isBISTAsync } = await import('@/lib/bist-detect-server');
  if (!(await isBISTAsync(symbol))) return null;

  const yfSym = toYahooSymbol(symbol);
  const period1 = new Date(Date.now() - 365 * 5 * 24 * 60 * 60 * 1000); // 5 years for time series
  let summary: any = null;
  let chart: any = null;
  let financials: any[] = [];
  let cashflowSeries: any[] = [];
  try {
    [summary, chart, financials, cashflowSeries] = await Promise.all([
      yahooFinance.quoteSummary(yfSym, {
        modules: [
          'summaryProfile',
          'price',
          'summaryDetail',
          'defaultKeyStatistics',
          'financialData',
        ],
      }).catch(() => null),
      yahooFinance.chart(yfSym, {
        period1: new Date(Date.now() - 365 * 2 * 24 * 60 * 60 * 1000),
        period2: new Date(),
        interval: '1d',
      }).catch(() => null),
      // Yahoo deprecated quoteSummary statements in Nov 2024; use fundamentalsTimeSeries instead
      yahooFinance.fundamentalsTimeSeries(yfSym, {
        period1, type: 'annual', module: 'financials',
      }).catch(() => []),
      yahooFinance.fundamentalsTimeSeries(yfSym, {
        period1, type: 'annual', module: 'cash-flow',
      }).catch(() => []),
    ]);
  } catch (e) {
    console.warn('[BIST Yahoo Failed]', e);
  }
  if (!summary) return null;

  const yfFin = summary.financialData || {};
  const yfStats = summary.defaultKeyStatistics || {};
  const yfDetail = summary.summaryDetail || {};
  const yfPrice = summary.price || {};
  const yfProfile = summary.summaryProfile || {};

  const num = (v: any) => (v && typeof v === 'object' && 'raw' in v ? Number(v.raw) : Number(v ?? 0));
  const pickRevenue = (s: any) =>
    num(s.totalRevenue) || num(s.operatingRevenue) || num(s.interestIncome) || 0;
  const pickNetIncome = (s: any) =>
    num(s.netIncome) ||
    num(s.netIncomeCommonStockholders) ||
    num(s.netIncomeFromContinuingOperationNetMinorityInterest) ||
    num(s.netIncomeIncludingNoncontrollingInterests) ||
    0;
  const yearOf = (s: any) =>
    (s.date instanceof Date)
      ? s.date.getFullYear().toString()
      : (typeof s.date === 'string' ? s.date.slice(0, 4) : '—');

  const revenueTrend = (financials || []).slice(-4).map((s: any) => {
    const rev = pickRevenue(s);
    const ni = pickNetIncome(s);
    const gp = num(s.grossProfit);
    const opInc = num(s.operatingIncome) || num(s.totalOperatingIncomeAsReported);
    return {
      date: yearOf(s),
      revenue: rev,
      netIncome: ni,
      grossProfit: gp,
      ebit: opInc || num(s.ebit),
      operatingMargin: rev ? +((opInc / rev) * 100).toFixed(1) : 0,
    };
  });

  const cashflowData = (cashflowSeries || []).slice(-4).map((s: any) => {
    const ocf = num(s.operatingCashFlow) || num(s.cashFlowFromContinuingOperatingActivities);
    const cx = num(s.capitalExpenditure);
    const fcf = num(s.freeCashFlow) || (ocf + cx); // capex is negative
    return {
      date: yearOf(s),
      operatingCF: ocf,
      capex: cx,
      fcf,
    };
  });

  const quotes = (chart?.quotes || []) as any[];
  const ohlc = quotes
    .filter(q => typeof q.close === 'number')
    .map((q: any) => ({
      timestamp: Math.floor(new Date(q.date).getTime() / 1000),
      open: q.open, high: q.high, low: q.low, close: q.close, volume: q.volume || 0,
    }));

  const closes = ohlc.map((o: any) => o.close);
  const currentPrice = Number(yfPrice.regularMarketPrice ?? closes[closes.length - 1] ?? 0);

  const calcSMA = (arr: number[], period: number): number | null => {
    if (arr.length < period) return null;
    const slice = arr.slice(-period);
    return +(slice.reduce((a, b) => a + b, 0) / period).toFixed(2);
  };
  const calcRSI = (arr: number[], period = 14): number | null => {
    if (arr.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = arr.length - period; i < arr.length; i++) {
      const d = arr[i] - arr[i - 1];
      if (d > 0) gains += d; else losses -= d;
    }
    const avgG = gains / period, avgL = losses / period;
    if (avgL === 0) return 100;
    return +(100 - 100 / (1 + avgG / avgL)).toFixed(1);
  };

  const sma50 = calcSMA(closes, 50) ?? +(currentPrice * 1.02).toFixed(2);
  const sma200 = calcSMA(closes, 200) ?? +(currentPrice * 0.95).toFixed(2);
  const rsi = calcRSI(closes, 14) ?? 55;

  const highs = ohlc.map((o: any) => o.high);
  const lows = ohlc.map((o: any) => o.low);
  const priceHigh = highs.length ? Math.max(...highs) : currentPrice * 1.05;
  const priceLow = lows.length ? Math.min(...lows) : currentPrice * 0.95;
  const range = priceHigh - priceLow;
  const fibonacci = {
    high: +priceHigh.toFixed(2), low: +priceLow.toFixed(2),
    lvl236: +(priceHigh - range * 0.236).toFixed(2),
    lvl382: +(priceHigh - range * 0.382).toFixed(2),
    lvl500: +(priceHigh - range * 0.500).toFixed(2),
    lvl618: +(priceHigh - range * 0.618).toFixed(2),
    lvl786: +(priceHigh - range * 0.786).toFixed(2),
    ext1618: +(priceLow + range * 1.618).toFixed(2),
    ext2618: +(priceLow + range * 2.618).toFixed(2),
  };

  const lastIncome = (financials && financials.length) ? financials[financials.length - 1] : {};
  const lastCashflow = (cashflowSeries && cashflowSeries.length) ? cashflowSeries[cashflowSeries.length - 1] : {};

  return {
    symbol,
    name: yfPrice.longName || yfPrice.shortName || symbol,
    sector: yfProfile.sector || 'Financial Services',
    industry: yfProfile.industry || 'N/A',
    country: yfProfile.country || 'Turkey',
    currentPrice,
    change24hPct: yfDetail?.regularMarketChangePercent != null
      ? Number(yfDetail.regularMarketChangePercent) * (Math.abs(Number(yfDetail.regularMarketChangePercent)) < 1 ? 100 : 1)
      : 0,
    pe: Number(yfDetail.trailingPE ?? yfStats.trailingPE ?? 0) || null,
    forwardPE: Number(yfDetail.forwardPE ?? yfStats.forwardPE ?? 0) || null,
    pb: Number(yfStats.priceToBook ?? 0) || null,
    peg: Number(yfStats.pegRatio ?? 0) || null,
    evEbitda: Number(yfStats.enterpriseToEbitda ?? 0) || null,
    marketCap: Number(yfPrice.marketCap ?? yfDetail.marketCap ?? 0),
    roe: Number(yfFin.returnOnEquity ?? 0) || null,
    roa: Number(yfFin.returnOnAssets ?? 0) || null,
    grossMargin: Number(yfFin.grossMargins ?? 0) || null,
    operatingMargin: Number(yfFin.operatingMargins ?? 0) || null,
    netMargin: Number(yfFin.profitMargins ?? 0) || null,
    debtToEquity: Number(yfFin.debtToEquity ?? 0) || null,
    currentRatio: Number(yfFin.currentRatio ?? 0) || null,
    quickRatio: Number(yfFin.quickRatio ?? 0) || null,
    fcf: Number(yfFin.freeCashflow ?? 0) || null,
    operatingCF: Number(yfFin.operatingCashflow ?? num((lastCashflow as any).operatingCashFlow) ?? 0),
    ebitda: Number(yfFin.ebitda ?? 0) || null,
    netDebtEbitda: null,
    interestCoverage: null,
    revenueGrowth: Number(yfFin.revenueGrowth ?? 0) || null,
    earningsGrowth: Number(yfFin.earningsGrowth ?? 0) || null,
    beta: Number(yfStats.beta ?? 1.0) || 1.0,
    shortRatio: Number(yfStats.shortRatio ?? 0) || 0,
    dividendYield: Number(yfDetail.dividendYield ?? 0) || 0,
    revenueTrend,
    cashflowData,
    quarterlyTrend: [] as Array<any>,
    latestReportedQuarter: null as LatestReportedQuarter | null,
    ohlc, fibonacci, sma50, sma200, rsi,
    analystRec: null,
    analystBuyPct: 65,
    insiderBuys: 0,
    insiderSells: 0,
    lastNetIncome: pickNetIncome(lastIncome) || Number(yfFin.netIncomeToCommon ?? 0),
    lastOperatingCF: Number(yfFin.operatingCashflow ?? num((lastCashflow as any).operatingCashFlow) ?? 0),
    // ── ENRICHMENT (BIST için Yahoo veriyle minimal doldur) ────────────
    // FMP BIST'i kapsamadığı için bilanço/sektör baseline/analist hedef
    // detayı şu an YOK. Yahoo'dan totalDebt/cash gibi tekil değerler
    // gelebilir ama 4-yıl serisi yok. MVP: empty/null geç → prompt'lar
    // "veri yok" der; ileride is.fintables veya KAP entegrasyonu.
    balanceSheet: [] as BalanceSheetRow[],
    incomeExt: [] as IncomeStatementExtended[],
    cashFlowExt: [] as CashFlowExtended[],
    sectorBaseline: { sectorPE: null, industryPE: null, sectorName: yfProfile.sector || null, industryName: yfProfile.industry || null, source: 'BIST (Yahoo)' },
    analystTarget: { consensusHigh: null, consensusMedian: null, consensusLow: null, numAnalysts: null, recentBuy: null, recentHold: null, recentSell: null },
    geographicRevenue: { fiscalYear: null, segments: [] as Array<{region: string; revenue: number; sharePct: number}> },
    symbolNews: [] as Array<{date: string; title: string; source: string; url?: string; summary?: string}>,
    currencyExposure: { netForeignCurrencyPosition: null, foreignCurrencyDebtShare: null, source: 'KAP (entegrasyon beklemede)', asOfDate: null, available: false },
    computedRatios: {
      netWorkingCapital: null, netWorkingCapitalPctRevenue: null,
      leverageRatio: null, debtToEbitda: null,
      inventoryTurnover: null, daysSalesOutstanding: null,
      daysInventoryOutstanding: null,
      ebitdaMargin: null, rdIntensity: null, sgaIntensity: null,
      effectiveTaxRate: null,
      assetTurnover: null, equityMultiplier: null,
      cashConversionRatio: null,
      shareholderYieldPct: null,
    },
  };
}

// ─── FMP data fetch ─────────────────────────────────────────────────
async function fetchStockData(symbol: string) {
  // Route BIST symbols to yahoo-finance2 (FMP free tier doesn't cover BIST)
  const bistData = await fetchBISTStockData(symbol);
  if (bistData) return bistData;

  const apiKey = process.env.FMP_API_KEY;


  if (!apiKey) {
    console.error('[FMP] API KEY MISSING');
    return null;
  }

  // Two-tier TTL: stable data (profile, ratios, prices) caches 1h; earnings-
  // sensitive data (quarterly income, earnings surprises) caches 5min so a
  // freshly released bilanço surfaces within minutes instead of hours.
  const fetchFMP = async (
    endpoint: string, params: string = '', revalidate: number = 3600,
  ) => {
    try {
      const url = `https://financialmodelingprep.com/stable/${endpoint}?symbol=${symbol}&${params}apikey=${apiKey}`;
      const res = await fetch(url, { next: { revalidate } });
      if (!res.ok) {
        console.warn(`[FMP] ${endpoint} failed: ${res.status}`);
        return null;
      }
      return await res.json();
    } catch (e) {
      console.error(`[FMP] Fetch error for ${endpoint}:`, e);
      return null;
    }
  };

  // Parallel fetch — note quarterly income-statement and earnings use 300s TTL.
  // ENRICHMENT (A1+A2+A3+A4+A5+A6+A11): balance-sheet, sektör baseline, analist
  // hedef fiyat, coğrafi gelir, sembol haberleri ek olarak çekilir. Tümü
  // fail-soft (Promise.allSettled + her fetcher kendi içinde try/catch).
  const sym = symbol;  // closure için
  const results = await Promise.allSettled([
    fetchFMP('profile'),
    fetchFMP('key-metrics-ttm'),
    fetchFMP('ratios-ttm'),
    fetchFMP('income-statement', 'limit=4&'),
    fetchFMP('cash-flow-statement', 'limit=4&'),
    fetchFMP('analyst-estimates', 'limit=1&'),
    fetchFMP('historical-price-eod/full', 'limit=200&'),
    fetchFMP('income-statement', 'period=quarter&limit=4&', 300),
    fetchFMP('earnings', 'limit=12&', 300),
    // ── ENRICHMENT layer ──────────────────────────────────────────────
    fetchBalanceSheet(sym, apiKey, 4),                       // [9]  A1
    fetchAnalystTarget(sym, apiKey),                         // [10] A3
    fetchGeographicRevenue(sym, apiKey),                     // [11] A11
    fetchSymbolNews(sym, apiKey, 12),                        // [12] A6
  ]);

  const profile = (results[0].status === 'fulfilled' ? results[0].value : null)?.[0] || {};
  const metrics = (results[1].status === 'fulfilled' ? results[1].value : null)?.[0] || {};
  const ratios = (results[2].status === 'fulfilled' ? results[2].value : null)?.[0] || {};
  const income = (results[3].status === 'fulfilled' ? results[3].value : null) || [];
  const cashflow = (results[4].status === 'fulfilled' ? results[4].value : null) || [];
  const estimates = (results[5].status === 'fulfilled' ? results[5].value : null)?.[0] || {};
  // stable/historical-price-eod/full returns a flat array (not wrapped in .historical)
  const histRaw = (results[6].status === 'fulfilled' ? results[6].value : null);
  const hist = Array.isArray(histRaw) ? histRaw : (histRaw?.historical || []);
  const incomeQuarterly = (results[7].status === 'fulfilled' ? results[7].value : null) || [];
  const earningsRaw = (results[8].status === 'fulfilled' ? results[8].value : null) || [];

  // ── ENRICHMENT unpack ───────────────────────────────────────────────
  const balanceSheet: BalanceSheetRow[] = results[9].status === 'fulfilled' ? results[9].value : [];
  const analystTarget = results[10].status === 'fulfilled' ? results[10].value : {
    consensusHigh: null, consensusMedian: null, consensusLow: null,
    numAnalysts: null, recentBuy: null, recentHold: null, recentSell: null,
  };
  const geographicRevenue = results[11].status === 'fulfilled' ? results[11].value : {
    fiscalYear: null, segments: [],
  };
  const symbolNews = results[12].status === 'fulfilled' ? results[12].value : [];
  // Sektör baseline profile sonrası çekilebilir (sector/industry bilinmeden çağrılamaz)
  const sectorBaseline = await fetchSectorBaseline(
    profile.sector || '', profile.industry || '', apiKey,
  );
  // KAP döviz pozisyonu — TR-only MVP no-op (ileride entegre)
  const currencyExposure = await fetchCurrencyExposure(sym, /*isBIST=*/ false);

  const incomeExt: IncomeStatementExtended[] = mapIncomeStatementExtended(income);
  const cashFlowExt: CashFlowExtended[] = mapCashFlowExtended(cashflow);

  // ── B2: Türetilmiş oranları KODDA hesapla (ajan uydurmasın) ─────────
  const computedRatios = computeRatios({
    latestBS: balanceSheet[0] ?? null,
    prevBS: balanceSheet[1] ?? null,
    latestIS: incomeExt[0] ?? null,
    latestCF: cashFlowExt[0] ?? null,
    marketCap: profile.marketCap || metrics.marketCap || 0,
  });

  const latestReportedQuarter = extractLatestReportedQuarter(earningsRaw);

  const quarterlyTrend = (Array.isArray(incomeQuarterly) ? incomeQuarterly : [])
    .slice(0, 4)
    .map((s: any) => ({
      date: String(s.date || '').slice(0, 10) || '—',
      revenue: s.revenue ?? 0,
      netIncome: s.netIncome ?? 0,
      operatingIncome: s.operatingIncome ?? 0,
      eps: s.eps ?? s.epsdiluted ?? null,
      operatingMargin: s.revenue ? +((s.operatingIncome / s.revenue) * 100).toFixed(1) : 0,
    }));

  // ─── Hybrid Fallback: Yahoo Finance ──────────────────────────────
  let yfData: any = null;
  const needsFallback = !profile?.price || metrics.peRatioTTM == null || metrics.returnOnEquityTTM == null;
  
  if (needsFallback) {
    try {
      yfData = await yahooFinance.quoteSummary(symbol, {
        modules: ['summaryDetail', 'financialData', 'defaultKeyStatistics']
      }).catch(() => null);
    } catch (e) { console.warn('[Yahoo Fallback Failed]', e); }
  }

  const yfFin = yfData?.financialData;
  const yfStats = yfData?.defaultKeyStatistics;
  const yfDetail = yfData?.summaryDetail;

  // Robust field mapping for STABLE endpoints
  const currentPrice = profile.price || yfDetail?.regularMarketPrice || (hist[0]?.close) || 0;
  
  // Normalizer: ensure decimals for ratios
  const toDec = (val: any) => {
    if (val == null) return null;
    return val > 5 ? val / 100 : val; // handle 34.4 vs 0.344
  };

  const revenueTrend = income.map((s: any) => ({
    date: s.date?.slice(0, 4) || '—',
    revenue: s.revenue ?? 0,
    netIncome: s.netIncome ?? 0,
    grossProfit: s.grossProfit ?? 0,
    ebit: s.ebitda ?? 0,
    operatingMargin: s.revenue ? +((s.operatingIncome / s.revenue) * 100).toFixed(1) : 0,
  }));

  const cashflowData = cashflow.map((s: any) => ({
    date: s.date?.slice(0, 4) || '—',
    operatingCF: s.operatingCashFlow ?? 0,
    capex: s.capitalExpenditure ?? 0,
    fcf: s.freeCashFlow ?? 0,
  }));

  const ohlc = hist.map((h: any) => ({
    timestamp: Math.floor(new Date(h.date).getTime() / 1000),
    open: h.open, high: h.high, low: h.low, close: h.close, volume: h.volume,
  })).reverse();

  const highs = ohlc.map((o: any) => o.high);
  const lows = ohlc.map((o: any) => o.low);
  const priceHigh = highs.length ? Math.max(...highs) : currentPrice * 1.05;
  const priceLow = lows.length ? Math.min(...lows) : currentPrice * 0.95;
  const range = priceHigh - priceLow;
  const fibonacci = {
    high: +priceHigh.toFixed(2), low: +priceLow.toFixed(2),
    lvl236: +(priceHigh - range * 0.236).toFixed(2),
    lvl382: +(priceHigh - range * 0.382).toFixed(2),
    lvl500: +(priceHigh - range * 0.500).toFixed(2),
    lvl618: +(priceHigh - range * 0.618).toFixed(2),
    lvl786: +(priceHigh - range * 0.786).toFixed(2),
    ext1618: +(priceLow + range * 1.618).toFixed(2),
    ext2618: +(priceLow + range * 2.618).toFixed(2),
  };

  // ─── Real Technical Indicators ──────────────────────────────────────────────
  const closes = ohlc.map((o: any) => o.close);

  const calcSMA = (arr: number[], period: number): number | null => {
    if (arr.length < period) return null;
    const slice = arr.slice(-period);
    return +(slice.reduce((a, b) => a + b, 0) / period).toFixed(2);
  };

  const calcRSI = (arr: number[], period = 14): number | null => {
    if (arr.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = arr.length - period; i < arr.length; i++) {
      const diff = arr[i] - arr[i - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    const rs = losses === 0 ? 100 : gains / losses;
    return +Math.min(100, Math.max(0, 100 - 100 / (1 + rs))).toFixed(1);
  };

  const sma50  = calcSMA(closes, 50)  ?? +(currentPrice * 0.98).toFixed(2);
  const sma200 = calcSMA(closes, 200) ?? +(currentPrice * 0.95).toFixed(2);
  const rsi    = calcRSI(closes, 14)  ?? 55;

  return {
    symbol, name: profile.companyName || yfData?.price?.shortName || symbol,
    sector: profile.sector || yfData?.summaryProfile?.sector || 'N/A',
    industry: profile.industry || yfData?.summaryProfile?.industry || 'N/A',
    country: profile.country || 'N/A',
    currentPrice,
    change24hPct: profile.changePercentage ?? (yfDetail?.regularMarketChangePercent != null ? yfDetail.regularMarketChangePercent * 100 : 0),
    pe: ratios.priceToEarningsRatioTTM || metrics.peRatioTTM || yfDetail?.trailingPE || null,
    forwardPE: estimates.estimatedEpsAvg ? +(currentPrice / estimates.estimatedEpsAvg).toFixed(1) : yfDetail?.forwardPE || null,
    pb: ratios.priceToBookRatioTTM || metrics.priceToBookValueRatioTTM || yfStats?.priceToBook || null,
    peg: ratios.priceEarningsToGrowthRatioTTM || metrics.pegRatioTTM || yfStats?.pegRatio || null,
    evEbitda: ratios.enterpriseValueMultipleTTM || metrics.enterpriseValueOverEBITDATTM || yfStats?.enterpriseToEbitda || null,
    marketCap: profile.marketCap || metrics.marketCap || yfDetail?.marketCap || 0,
    roe: toDec(metrics.returnOnEquityTTM || ratios.returnOnEquityTTM || yfFin?.returnOnEquity),
    roa: toDec(metrics.returnOnAssetsTTM || ratios.returnOnAssetsTTM || yfFin?.returnOnAssets),
    grossMargin: toDec(ratios.grossProfitMarginTTM || metrics.grossProfitMarginTTM || yfFin?.grossMargins),
    operatingMargin: toDec(ratios.operatingProfitMarginTTM || yfFin?.operatingMargins),
    netMargin: toDec(ratios.netProfitMarginTTM || yfFin?.profitMargins),
    debtToEquity: ratios.debtToEquityRatioTTM || yfFin?.debtToEquity || null,
    currentRatio: ratios.currentRatioTTM || yfFin?.currentRatio || null,
    quickRatio: ratios.quickRatioTTM || yfFin?.quickRatio || null,
    fcf: metrics.freeCashFlowPerShareTTM || (yfFin?.freeCashflow / (yfStats?.sharesOutstanding || 1)) || null,
    operatingCF: cashflow[0]?.operatingCashFlow || yfFin?.operatingCashflow || 0,
    ebitda: metrics.ebitdaPerShareTTM || (yfFin?.ebitda / (yfStats?.sharesOutstanding || 1)) || 0,
    netDebtEbitda: metrics.netDebtToEBITDATTM || null,
    interestCoverage: ratios.interestCoverageTTM || null,
    revenueGrowth: toDec(metrics.revenueGrowthTTM || yfFin?.revenueGrowth),
    earningsGrowth: toDec(metrics.epsGrowthTTM || yfFin?.earningsGrowth),
    beta: profile.beta || yfStats?.beta || 1.0,
    shortRatio: yfStats?.shortRatio || 0,
    dividendYield: toDec(ratios.dividendYieldTTM || yfDetail?.dividendYield || 0.0),
    revenueTrend,
    cashflowData,
    quarterlyTrend,
    latestReportedQuarter,
    ohlc, fibonacci, sma50, sma200, rsi,
    analystRec: null,
    analystBuyPct: estimates.numberAnalysts ? 75 : 65,
    insiderBuys: 2,
    insiderSells: 1,
    lastNetIncome: income[0]?.netIncome || (yfFin?.netIncomeToCommon) || 0,
    lastOperatingCF: cashflow[0]?.operatingCashFlow || yfFin?.operatingCashflow || 0,
    // ── ENRICHMENT (A1+A2+A3+A4+A5+A6+A11) ─────────────────────────────
    balanceSheet,           // A1 — ham 4Y bilanço
    incomeExt,              // A5 — R&D, SG&A, faiz, vergi, COGS
    cashFlowExt,            // A4 — buyback, temettü, borç hareketleri
    sectorBaseline,         // A2 — sektör P/E baseline (anti-halüsinasyon)
    analystTarget,          // A3 — analist hedef fiyat konsensüsü
    geographicRevenue,      // A11 — coğrafi gelir (kur exposure vekili)
    symbolNews,             // A6 — sembol-özel son haberler
    currencyExposure,       // A10 — TR döviz pozisyonu (MVP no-op)
    computedRatios,         // B2 — kodda hesaplanan oranlar
  };
}

// ─── Helper: format number ────────────────────────────────────────────────────
const fmt = (v: number | null | undefined, mult = 1, suffix = '', dec = 1) =>
  v != null ? `${(v * mult).toFixed(dec)}${suffix}` : 'N/A';

// Renders a "fresh earnings" alert block when a company reported earnings
// within the last 7 days. Returns empty string otherwise. Injected into the
// Forensic and Portfolio prompts so agents must reference the new bilanço.
function freshEarningsBlock(
  q: LatestReportedQuarter | null,
  quarterlyTrend: Array<any>,
): string {
  if (!q || !q.isFresh) return '';
  const epsLine = `EPS $${q.epsActual?.toFixed(2)}` +
    (q.epsEstimated != null
      ? ` (beklenti $${q.epsEstimated.toFixed(2)}, sürpriz ${q.surprisePct! >= 0 ? '+' : ''}${q.surprisePct?.toFixed(1)}%)`
      : '');
  const revLine = q.revenue != null
    ? `Gelir $${(q.revenue / 1e9).toFixed(2)}B` +
      (q.revenueEstimated != null
        ? ` (beklenti $${(q.revenueEstimated / 1e9).toFixed(2)}B, sürpriz ${q.revenueSurprisePct! >= 0 ? '+' : ''}${q.revenueSurprisePct?.toFixed(1)}%)`
        : '')
    : '';
  const qRows = quarterlyTrend.length
    ? '\nÇEYREKLİK GELİR TRENDİ (Son 4 Çeyrek):\n' +
      quarterlyTrend.map((r: any) =>
        `  ${r.date}: Gelir ${fmt(r.revenue, 1e-9, 'B$', 2)}, Net Kâr ${fmt(r.netIncome, 1e-9, 'B$', 2)}, EPS ${r.eps != null ? '$' + Number(r.eps).toFixed(2) : 'N/A'}, Op.Marj %${r.operatingMargin}`
      ).join('\n')
    : '';
  return `

🆕 TAZE BİLANÇO (${q.daysAgo} gün önce, ${q.date}):
- ${epsLine}${revLine ? '\n- ' + revLine : ''}${qRows}

ZORUNLU: Bu yeni çeyreği analizinde AÇIKÇA referans al. "${q.date} bilançosu"nu veya sürpriz yüzdesini cümlelerinde geçirmek zorundasın — eski 4-yıllık trendi tek başına yorumlamak YETMEZ.
`;
}

// ─── Prompt builders ──────────────────────────────────────────────────────────
// Ortak sistem personası: her ajan kıdemli, pahalı, söz sakınmayan bir Wall
// Street / Goldman Sachs veteranıdır. Amacımız "genel geçer" AI cevabından
// kaçınmak; spesifik rakamlara dayalı hüküm üretmek.

// Tüm prompt fonksiyonları çağrıldığında `d` null değil — SSE handler'da guard var.
type StockData = NonNullable<Awaited<ReturnType<typeof fetchStockData>>>;

const COMMON_PERSONA_RULES = `
KATI KURALLAR (HALÜSİNASYON ÖNLEME):
1. SADECE yukarıda verilen sayıları kullan — yeni rakam UYDURMA. "Tahminen",
   "yaklaşık", "yakın geçmişte" gibi sayı uydurma şabloncuları YASAK.
2. "Sektör ortalaması" iddiası SADECE "SEKTÖR/ENDÜSTRİ BASELINE" bloğundan
   gelen rakamlara dayanır. Baseline yoksa "sektör baseline verisi yok" yaz,
   ezberden rakam ATMA (Tech 15-25, Sanayi 8-12 gibi cümleler YASAK).
3. "Analist hedef fiyatı" iddiası SADECE "ANALİST HEDEF" bloğundan gelir.
   Yoksa "analist konsensüs verisi yok" yaz.
4. "Genel olarak", "birçok açıdan", "dikkatlice değerlendirmek gerekir",
   "yakından takip edilmeli" gibi içi boş ifadeler YASAK. Her cümlen
   spesifik bir RAKAMA veya ORANA dayansın.
5. "Veri yetersiz" deme — verilen alanların HEPSİNİ kullan. Bir veri eksikse
   o satırı atla, başka alandan örnekleyerek devam et.
6. Türkçe finansal dil: F/K, ROE, FAVÖK, Net İşletme Sermayesi, DSO,
   Stok Devir Hızı, FD/FAVÖK, PEG. Yabancı şirket adlarını DOĞRU yaz.
7. Gerekçelerinde rakamları parantez içinde ver
   (örn: "ROE %45 — sektör baseline P/E 28 vs hisse 42, %50 prim").
8. JSON'u KESİNLİKLE tamamla, kesmeden bitir. Kod bloğu (\`\`\`) kullanma.
`;

// ─── Ortak veri blokları (her ajan promptuna gömülür) ────────────────────
function bsBlock(d: StockData): string {
  const bs = (d as any).balanceSheet as BalanceSheetRow[];
  if (!bs || !bs.length) return 'BİLANÇO (4Y): veri yok\n';
  const fmtB = (n: number | null) => n != null ? (n / 1e9).toFixed(2) + 'B' : 'N/A';
  const rows = bs.slice(0, 4).map(r =>
    `  ${r.date}: Nakit ${fmtB(r.cashAndShortTermInvestments)}, Stok ${fmtB(r.inventory)}, Alacak ${fmtB(r.netReceivables)}, Toplam Varlık ${fmtB(r.totalAssets)}, KV Yük. ${fmtB(r.totalCurrentLiabilities)}, KV Borç ${fmtB(r.shortTermDebt)}, UV Borç ${fmtB(r.longTermDebt)}, Top.Borç ${fmtB(r.totalDebt)}, Özkaynak ${fmtB(r.totalEquity)}`
  ).join('\n');
  return `BİLANÇO HAM (4Y, $):\n${rows}\n`;
}

function isExtBlock(d: StockData): string {
  const ie = (d as any).incomeExt as IncomeStatementExtended[];
  if (!ie || !ie.length) return 'GELİR TABLOSU EK ALANLAR: veri yok\n';
  const fmtB = (n: number | null) => n != null ? (n / 1e9).toFixed(2) + 'B' : 'N/A';
  const rows = ie.slice(0, 4).map(r =>
    `  ${r.date}: Hasılat ${fmtB(r.revenue)}, COGS ${fmtB(r.costOfRevenue)}, R&D ${fmtB(r.researchAndDevelopmentExpenses)}, SG&A ${fmtB(r.sellingGeneralAndAdministrativeExpenses)}, EBIT ${fmtB(r.operatingIncome)}, Faiz Gid. ${fmtB(r.interestExpense)}, Vergi ${fmtB(r.incomeTaxExpense)}, Net Kâr ${fmtB(r.netIncome)}, FAVÖK ${fmtB(r.ebitda)}`
  ).join('\n');
  return `GELİR TABLOSU EK ALANLAR (4Y, $):\n${rows}\n`;
}

function cfExtBlock(d: StockData): string {
  const cf = (d as any).cashFlowExt as CashFlowExtended[];
  if (!cf || !cf.length) return 'NAKİT AKIŞ EK ALANLAR: veri yok\n';
  const fmtB = (n: number | null) => n != null ? (n / 1e9).toFixed(2) + 'B' : 'N/A';
  const rows = cf.slice(0, 4).map(r =>
    `  ${r.date}: Op.CF ${fmtB(r.operatingCashFlow)}, CapEx ${fmtB(r.capitalExpenditure)}, FCF ${fmtB(r.freeCashFlow)}, Buyback ${fmtB(r.commonStockRepurchased)}, Temettü ${fmtB(r.dividendsPaid)}, Borç İhraç ${fmtB(r.debtIssuance)}, Borç Geri Ödeme ${fmtB(r.debtRepayment)}, ΔÇSermaye ${fmtB(r.changeInWorkingCapital)}`
  ).join('\n');
  return `NAKİT AKIŞ EK ALANLAR (4Y, $):\n${rows}\n`;
}

function ratiosBlock(d: StockData): string {
  const r = (d as any).computedRatios;
  if (!r) return '';
  const fmt = (v: number | null, suffix = '') => v != null ? v + suffix : 'N/A';
  const nwcDisp = r.netWorkingCapital != null ? (r.netWorkingCapital / 1e9).toFixed(2) + 'B$' : 'N/A';
  return `KODDA HESAPLANAN ORANLAR (broker matrisi, uydurma — sadece yorumla):
- Net İşletme Sermayesi: ${nwcDisp} (Hasılatın %${fmt(r.netWorkingCapitalPctRevenue)})
- Kaldıraç (TopBorç/TopVarlık): %${fmt(r.leverageRatio)} (>70 yüksek risk)
- Stok Devir Hızı: ${fmt(r.inventoryTurnover, 'x')} | Stokta Kalış (DIO): ${fmt(r.daysInventoryOutstanding, ' gün')}
- Alacak Tahsil Süresi (DSO): ${fmt(r.daysSalesOutstanding, ' gün')}
- FAVÖK Marjı: %${fmt(r.ebitdaMargin)}
- R&D Yoğunluğu: %${fmt(r.rdIntensity)} | SG&A Yoğunluğu: %${fmt(r.sgaIntensity)}
- Etkin Vergi Oranı: %${fmt(r.effectiveTaxRate)}
- Varlık Devri (DuPont): ${fmt(r.assetTurnover, 'x')} | Sermaye Çarpanı: ${fmt(r.equityMultiplier, 'x')}
- Nakit Dönüşüm: ${fmt(r.cashConversionRatio, 'x')} (>1 sağlıklı)
- Hissedar Getirisi (Buyback+Temettü/PD): %${fmt(r.shareholderYieldPct)}
`;
}

function sectorBaselineBlock(d: StockData): string {
  const sb = (d as any).sectorBaseline;
  if (!sb || (sb.sectorPE == null && sb.industryPE == null)) {
    return 'SEKTÖR/ENDÜSTRİ BASELINE: veri yok — "sektör ortalaması" iddiasında bulunma.\n';
  }
  return `SEKTÖR/ENDÜSTRİ BASELINE (FMP, GERÇEK):
- Sektör: ${sb.sectorName || 'N/A'} → P/E baseline: ${sb.sectorPE ?? 'N/A'}
- Endüstri: ${sb.industryName || 'N/A'} → P/E baseline: ${sb.industryPE ?? 'N/A'}
(Hisse P/E ile karşılaştırırken SADECE bu sayıları kullan)
`;
}

function analystTargetBlock(d: StockData): string {
  const at = (d as any).analystTarget;
  if (!at || (at.consensusMedian == null && at.consensusHigh == null)) {
    return 'ANALİST HEDEF: veri yok — hedef fiyat tartışmasında dışarıdan rakam atma.\n';
  }
  return `ANALİST HEDEF FİYAT KONSENSÜSÜ:
- Yüksek: $${at.consensusHigh ?? 'N/A'} | Median: $${at.consensusMedian ?? 'N/A'} | Düşük: $${at.consensusLow ?? 'N/A'}
- Tavsiye dağılımı: AL ${at.recentBuy ?? 0} / TUT ${at.recentHold ?? 0} / SAT ${at.recentSell ?? 0} (toplam ${at.numAnalysts ?? 'N/A'} analist)
`;
}

function geoRevBlock(d: StockData): string {
  const g = (d as any).geographicRevenue;
  if (!g?.segments?.length) return 'COĞRAFİ GELİR KIRILIMI: veri yok\n';
  const rows = g.segments.slice(0, 6).map((s: any) => `  ${s.region}: %${s.sharePct}`).join('\n');
  return `COĞRAFİ GELİR KIRILIMI (${g.fiscalYear || 'son FY'}):\n${rows}\n(Kur exposure'unu YORUMLARKEN bu paylar kullanılır)\n`;
}

function symbolNewsBlock(d: StockData): string {
  const news = (d as any).symbolNews as Array<{date: string; title: string; source: string; summary?: string}>;
  if (!news?.length) return '';
  const rows = news.slice(0, 8).map(n =>
    `  ${n.date} [${n.source}]: ${n.title}${n.summary ? ` — ${n.summary.slice(0, 120)}` : ''}`
  ).join('\n');
  return `\nHİSSEYE ÖZEL SON HABERLER (8 başlık):\n${rows}\n`;
}

function currencyExpBlock(d: StockData): string {
  const ce = (d as any).currencyExposure;
  if (!ce?.available) return '';
  return `DÖVİZ POZİSYONU (${ce.asOfDate || ''}):
- Net YP Pozisyon: ${ce.netForeignCurrencyPosition ?? 'N/A'}
- Döviz Borç / Toplam Borç: %${ce.foreignCurrencyDebtShare ?? 'N/A'}
`;
}

function promptForensic(d: StockData): string {
  const cashConv = d.lastNetIncome && d.lastOperatingCF ? (d.lastOperatingCF / d.lastNetIncome).toFixed(2) : 'N/A';
  const revRows = d.revenueTrend.map((r: any) => `  ${r.date}: Gelir ${fmt(r.revenue,1e-9,'B$',1)}, Net Kâr ${fmt(r.netIncome,1e-9,'B$',1)}, Op.Marj %${r.operatingMargin ?? 'N/A'}`).join('\n');
  const cfRows  = d.cashflowData.map((r: any) => `  ${r.date}: Op.CF ${fmt(r.operatingCF,1e-9,'B$',1)}, FCF ${fmt(r.fcf,1e-9,'B$',1)}`).join('\n');
  const freshBlock = freshEarningsBlock(d.latestReportedQuarter, d.quarterlyTrend);
  return `Sen kıdemli bir Adli Muhasebecisin (CFA + CPA). Sayı yalan söylemez, sen de
sayının dilini anlarsın. Şirketin defterlerinde saklı hikayeyi bul — karı
şişirmek, gideri geciktirmek, nakit akışıyla kâr arasındaki çelişki, alacak
kalitesi, stok birikimi.

HİSSE: ${d.symbol} (${d.name}) | Sektör: ${d.sector} | Ülke: ${d.country}
${freshBlock}
GELİR TABLOSU (Son 4 Yıl, özet):
${revRows || '  Veri yok'}

NAKİT AKIŞI (Son 4 Yıl, özet):
${cfRows || '  Veri yok'}

${bsBlock(d)}
${isExtBlock(d)}
${cfExtBlock(d)}
${ratiosBlock(d)}
TEMEL METRİKLER (TTM, türetilmiş):
- Net Kâr / İşletme CF Oranı (Nakit Dönüşüm — Kalite Kontrol #1): ${cashConv}x (>1 iyi, <1 şüpheli)
- Net Borç/FAVÖK: ${d.netDebtEbitda ?? 'N/A'} (0-2 harika, 2-4 yönetilebilir, 4+ tehlike)
- Faiz Karşılama: ${d.interestCoverage ?? 'N/A'}x (>1.5 gerekli, <1.5 temerrüt riski)
- ROE: ${fmt(d.roe,100,'%')} | ROA: ${fmt(d.roa,100,'%')} | Net Marj: ${fmt(d.netMargin,100,'%')}
- Cari Oran: ${d.currentRatio ?? 'N/A'} | Hızlı Oran (Asit-Test): ${d.quickRatio ?? 'N/A'}
- Borç/Özkaynak: ${d.debtToEquity ?? 'N/A'}

${COMMON_PERSONA_RULES}

ANALİZ ÇERÇEVESİ (fon yöneticisi akışı):
1) KALİTE KONTROL: Nakit Dönüşüm <1 ise alacaklar şişti mi (DSO yükseliyor mu),
   stok birikti mi (DIO arttı mı) — bilanço ham rakamından kontrol et.
2) DuPont: ROE = Net Marj × Varlık Devri × Sermaye Çarpanı. Hesaplanmış 3
   bileşeni "KODDA HESAPLANAN ORANLAR" bloğundan oku, ROE'nin kaynağını
   ayrıştır. Kaldıraçtan gelen ROE sürdürülebilir DEĞİL.
3) Likidite: Cari Oran 1.5-2 ideal; <1 kriz. Asit-Test >1 olmalı. Net
   İşletme Sermayesi pozitif ve büyüyor mu?
4) Borçluluk: Kaldıraç (%TopBorç/TopVarlık) >70 alarm. Net Borç/FAVÖK >3
   borçluluk alarmı.
5) Stok/Alacak verimliliği: DSO uzuyorsa müşteri ödemiyor, DIO uzuyorsa
   ürün rafta kalıyor — ikisi de nakit döngüsünü vurur.

Çıktı formatı (JSON, kod bloğu olmadan):
{
  "earningsQuality": {
    "rating": "GÜÇLÜ|NORMAL|ZAYIF|ŞÜPHELİ",
    "cashConversionRatio": <number|null>,
    "finding": "<net kâr vs nakit akışı yorumu, 1 cümle>",
    "verdict": "<bu ne anlama geliyor?, 1 cümle>"
  },
  "debtSolvency": {
    "netDebtEbitda": <number|null>,
    "interestCoverage": <number|null>,
    "rating": "HARİKA|YÖNETİLEBİLİR|TEHLİKELİ",
    "verdict": "<borç yükü değerlendirmesi, 1-2 cümle>"
  },
  "dupont": {
    "roeDriver": "KÂR MARJI|VERİMLİLİK|KALDIRAÇ|KARMA",
    "redFlag": <boolean>,
    "verdict": "<ROE'nin gerçek kaynağı ve sürdürülebilirlik, 1-2 cümle>"
  },
  "liquidity": {
    "workingCapitalAdvantage": <boolean>,
    "verdict": "<likidite ve işletme sermayesi değerlendirmesi, 1 cümle>"
  },
  "operatingMarginTrend": "<ARTIYOR|AZALIYOR|STABIL> — <1 cümle yorum>",
  "overallRating": "GÜÇLÜ|NORMAL|ZAYIF|ŞÜPHELİ",
  "summary": "<2-3 cümle özet — kritik bulgular ve hüküm>"
}`;
}

function promptStrategist(d: StockData): string {
  return `Sen kıdemli bir sektör stratejistisin — Buffett-Lynch hattında hendek
("moat") avcısısın, ama PEG/FD/FAVÖK gibi değerleme matematiğini titizce
uygularsın. Büyüme hikayesi sana "anlatılmaz" — sen rakamlardan kendin
çıkarırsın.

HİSSE: ${d.symbol} (${d.name}) | Sektör: ${d.sector} | Endüstri: ${d.industry}

BÜYÜME & VERİMLİLİK:
- Gelir Büyümesi (TTM): ${fmt(d.revenueGrowth,100,'%')} | Kazanç Büyümesi: ${fmt(d.earningsGrowth,100,'%')}
- Brüt Marj: ${fmt(d.grossMargin,100,'%')} | Op.Marj: ${fmt(d.operatingMargin,100,'%')} | Net Marj: ${fmt(d.netMargin,100,'%')}
- FAVÖK: ${d.ebitda ? (d.ebitda/1e9).toFixed(1)+'B$' : 'N/A'}
- FCF: ${d.fcf ? (d.fcf/1e9).toFixed(1)+'B$' : 'N/A'} | Op.CF: ${d.operatingCF ? (d.operatingCF/1e9).toFixed(1)+'B$' : 'N/A'}

REKABET AVANTAJI:
- ROE: ${fmt(d.roe,100,'%')} | ROA: ${fmt(d.roa,100,'%')}
- Borç/Özkaynak: ${d.debtToEquity ?? 'N/A'}

PAZAR DEĞERLEMESİ:
- F/K (P/E): ${d.pe?.toFixed(1) ?? 'N/A'} | İleriye Dönük F/K: ${d.forwardPE?.toFixed(1) ?? 'N/A'}
- PEG Oranı: ${d.peg?.toFixed(2) ?? 'N/A'} (PEG<1 = büyümesine göre ucuz)
- FD/FAVÖK: ${d.evEbitda?.toFixed(1) ?? 'N/A'} | PD/DD: ${d.pb?.toFixed(2) ?? 'N/A'}
- Piyasa Değeri: ${d.marketCap ? (d.marketCap/1e9).toFixed(0)+'B$' : 'N/A'}

${sectorBaselineBlock(d)}
${ratiosBlock(d)}
${geoRevBlock(d)}
${symbolNewsBlock(d)}

${COMMON_PERSONA_RULES}

Üç boyutta analiz yap:
(1) BÜYÜME — gelir büyümesi enflasyonu (yıllık %5) yeniyor mu? FAVÖK Marjı
    (hesaplanmış) genişliyor mu daralıyor mı? R&D Yoğunluğu yatırım
    döngüsünü gösterir (>%10 yüksek inovasyon).
(2) MOAT — Brüt marj %40+ ise fiyatlandırma gücü var, %20 altı ise
    komoditeleşmiş. ROE %15+ ve Varlık Devri >0.6 ise rekabet avantajı.
    Coğrafi gelir konsantrasyonu (tek bölge >%50) ise tek-pazar riski.
(3) DEĞERLEME — Hisse P/E'sini SEKTÖR BASELINE ile karşılaştır (yukarıda
    rakam varsa kullan; yoksa kıyaslama YAPMA). PEG<1 ucuz, PEG>2 balon.
    FD/FAVÖK sektör baseline ile karşılaştır.

"brokerNote"u bir yatırımcı dostunun kulağına fısıldar gibi yaz — 2 cümle
ama hatırlanır, ezbere "izlenmeli" yok, somut tetik var.

Çıktı formatı (JSON, kod bloğu olmadan):
{
  "growthEngine": {
    "revenueGrowthYoy": <number|null>,
    "ebitdaMarginTrend": "GENİŞLİYOR|DARALIYÖR|STABIL",
    "realGrowth": <boolean — enflasyon üzeri büyüme mü?>,
    "analysis": "<1-2 cümle büyüme yorumu>"
  },
  "moatAnalysis": {
    "grossMarginLevel": "YÜKSEK|ORTA|DÜŞÜK",
    "moatPresent": <boolean>,
    "moatType": "MARKA|PATENT|MALİYET|AĞ_ETKİSİ|YOK",
    "verdict": "<1-2 cümle rekabet avantajı yorumu>"
  },
  "valuation": {
    "pegSignal": "UCUZ|PAHALI|NORMAL|HESAPLANAMADI",
    "evEbitdaSignal": "UCUZ|PAHALI|NORMAL|N/A",
    "overallVerdict": "UCUZ|PAHALI|NORMAL|MAKUL",
    "analysis": "<1-2 cümle değerleme yorumu>"
  },
  "brokerNote": "<Yatırımcı bu hisseyi alırsa neyi satın alıyor? 2-3 cümle, ilgi çekici dil>",
  "targetPotentialPct": <tahmini hedef getiri %, number — eğer data yeterliyse, değilse null>,
  "overallSignal": "AL|SAT|BEKLE"
}`;
}

function promptDevil(d: StockData): string {
  return `Sen kıdemli bir Şeytanın Avukatı — "neden düşmez" sorusunu değil,
"hangi tetikleyici bu hisseyi %30 düşürür" sorusunu sorarsın. Pembe tabloyu
parçalamak senin işin.

HİSSE: ${d.symbol} (${d.name}) | Sektör: ${d.sector} | Ülke: ${d.country}

PİYASA RİSKİ:
- Beta: ${d.beta?.toFixed(2) ?? 'N/A'} (1.0 pazar ile aynı oynaklık; >1.5 yüksek risk)
- Short Ratio (Açık Satış): ${d.shortRatio?.toFixed(1) ?? 'N/A'} gün
- Temettü Verimi: ${fmt(d.dividendYield,100,'%')}

FİNANSAL RİSKLER:
- Net Borç/FAVÖK: ${d.netDebtEbitda ?? 'N/A'}
- Faiz Karşılama: ${d.interestCoverage ?? 'N/A'}x
- Cari Oran: ${d.currentRatio ?? 'N/A'}
- Borç/Özkaynak: ${d.debtToEquity ?? 'N/A'}

${bsBlock(d)}
${ratiosBlock(d)}
${geoRevBlock(d)}
${currencyExpBlock(d)}
${symbolNewsBlock(d)}

INSIDER AKTİVİTE: alım ${d.insiderBuys} | satış ${d.insiderSells}
ANALİST: Alış oranı %${d.analystBuyPct ?? 'N/A'}

${COMMON_PERSONA_RULES}

3 boyutta ŞİRKETE ÖZEL risk ara (jenerik "resesyon, faiz" YASAK — bu
şirketin VERİSİNE dayanan tetikleyiciler):

(1) PİYASA — Beta>1.3 ise S&P %10 düşerse bu hisse %13+ düşer. Short
    Ratio>5 gün ise piyasa şüpheli.
(2) FİNANSAL — Kaldıraç (hesaplanmış %) >70, Net Borç/FAVÖK>4, Faiz
    Karşılama<1.5, Asit-Test<1 → her biri ayrı bayraktır. Bilanço ham
    rakamlarından (KV borç, nakit) ödeme penceresini hesapla.
(3) İŞ MODELİ — Coğrafi gelir konsantrasyonu >%50 tek bölgede ise o
    bölgenin riski (örn: Çin %35 → ticaret savaşı). R&D yoğunluğu >%15
    ise teknolojide kalmama riski. DSO uzuyorsa tahsilat zorluğu.

En az 3 farklı bear case çıkar — her birinde TETİKLEYİCİ + bilançodan
veya haberden GERÇEK rakam + olasılık (0-1) + fiyat etkisi % olsun.

Çıktı formatı (JSON, kod bloğu olmadan):
{
  "marketRisk": {
    "beta": <number|null>,
    "betaInterpretation": "<piyasa düşünce bu hisse ne kadar düşer? 1 cümle>",
    "shortInterestSignal": "YÜKSEK|NORMAL|DÜŞÜK|N/A",
    "liquidityRisk": "DÜŞÜK|ORTA|YÜKSEK"
  },
  "financialRedFlags": [
    { "flag": "<spesifik kırmızı bayrak>", "severity": "DÜŞÜK|ORTA|YÜKSEK|KRİTİK", "analysis": "<1 cümle açıklama>" }
  ],
  "insiderSignal": "POZİTİF|NÖTR|NEGATİF",
  "macroRisks": [
    { "risk": "<makro risk başlığı>", "impact": "<nasıl etkiler>", "severity": "DÜŞÜK|ORTA|YÜKSEK" }
  ],
  "bearCases": [
    { "scenario": "<senaryo adı>", "trigger": "<tetikleyici>", "priceImpact": "<tahmini etki %>", "probability": <0-1 arası number> }
  ],
  "overallRiskLevel": "DÜŞÜK|ORTA|YÜKSEK|KRİTİK",
  "defenseStrategy": "<Stop-loss ve koruma önerisi, 1-2 cümle>"
}`;
}

function promptTechnical(d: StockData): string {
  const fib = d.fibonacci;
  const crossStatus = d.sma50 && d.sma200
    ? (d.sma50 > d.sma200 ? 'GOLDEN CROSS (Yükseliş)' : 'DEATH CROSS (Düşüş)')
    : 'N/A';
  return `Sen kıdemli bir teknik strategistsin. Charts don't lie; trend is
your friend. Fibonacci, SMA ve RSI senin matematiğin. Giriş-çıkış-stop
üçlüsü olmadan pozisyon alma; risk/ödül 1:2'nin altında trade yok.

HİSSE: ${d.symbol} | Güncel Fiyat: $${d.currentPrice.toFixed(2)}

FİBONACCI SEVİYELERİ (2 Yıllık Yüksek-Düşük):
- 2Y Yüksek: $${fib.high} | 2Y Düşük: $${fib.low}
- Fib %23.6: $${fib.lvl236} | Fib %38.2: $${fib.lvl382}
- Fib %50.0: $${fib.lvl500} | Fib %61.8: $${fib.lvl618} (Altın Oran)
- Fib %78.6: $${fib.lvl786}
- Extension %161.8: $${fib.ext1618} | Extension %261.8: $${fib.ext2618}

HAREKETLİ ORTALAMALAR:
- SMA 50: ${d.sma50 ? '$'+d.sma50 : 'N/A'} | SMA 200: ${d.sma200 ? '$'+d.sma200 : 'N/A'}
- Durum: ${crossStatus}
- Fiyat vs SMA200: ${d.sma200 ? (d.currentPrice > d.sma200 ? 'ÜSTÜNDE (Boğa)' : 'ALTINDA (Ayı)') : 'N/A'}

MOMENTUM:
- RSI(14): ${d.rsi ?? 'N/A'} ${d.rsi ? (d.rsi > 70 ? '— AŞIRI ALIM' : d.rsi < 30 ? '— AŞIRI SATIM' : '— NÖTR') : ''}

${COMMON_PERSONA_RULES}

Önce YAPI: fiyat hangi Fib seviyesi üstünde? %61.8 altın oranın altında
ise trend zayıfladı. SMA200 altında ise ayı piyasası (kurumsal para dışarıda).
Golden Cross + SMA200 üstü + RSI 40-60 = ideal alım penceresi.

Giriş Stratejisi ZORUNLU:
- idealEntryLow/High: şu anki fiyattan MAKUL uzaklıkta bir alım bölgesi
  (genelde -3% ile -8% arası, Fib %50 veya %61.8 yakını)
- takeProfit1: en yakın Fib direnç (genelde ext1618 veya 2Y Yüksek)
- takeProfit2: daha uzak hedef (ext2618 varsa, yoksa TP1 × 1.15)
- stopLoss: entryLow'un %5 altı VEYA en yakın destek kırılması
- riskRewardRatio: (TP1 - entryMid) / (entryMid - stopLoss), en az 1.5 olmalı

Çıktı formatı (JSON, kod bloğu olmadan):
{
  "fibonacci": {
    "currentPriceVsFib": "<fiyat şu an hangi Fib seviyesine yakın? 1 cümle>",
    "keySupport": <en yakın güçlü destek Fib seviyesi, number>,
    "keyResistance": <en yakın güçlü direnç seviyesi, number>,
    "goldenRatioSupport": <Fib %61.8 seviyesi, number>,
    "nextTarget": <Fib extension hedefi, number>,
    "analysis": "<Fibonacci analizi yorumu, 2 cümle>"
  },
  "movingAverages": {
    "crossStatus": "GOLDEN_CROSS|DEATH_CROSS|NÖTR|N/A",
    "priceVsSma200": "ÜSTÜNDE|ALTINDA|N/A",
    "analysis": "<hareketli ortalamalar yorumu, 1-2 cümle>"
  },
  "momentum": {
    "rsiLevel": <number|null>,
    "rsiSignal": "AŞIRI_ALIM|NÖTR|AŞIRI_SATIM|N/A",
    "analysis": "<RSI yorumu ve ne anlama geldiği, 1 cümle>"
  },
  "entryStrategy": {
    "idealEntryLow": <number — ideal alım bölgesi alt sınırı>,
    "idealEntryHigh": <number — ideal alım bölgesi üst sınırı>,
    "takeProfit1": <number — 1. kâr hedefi (Fib extension)>,
    "takeProfit2": <number — 2. kâr hedefi>,
    "stopLoss": <number — stop-loss seviyesi>,
    "riskRewardRatio": <number — R/R oranı>,
    "rationale": "<giriş stratejisi özeti, 2 cümle>"
  },
  "overallSignal": "AL|SAT|BEKLE"
}`;
}

// ─── Ajan 5: deterministik score + targetPrice (kod hesabı) ──────────────
//
// Önceki versiyonda Ajan 5 score'u "ağırlıklı ortalama" diye yazıyordu ama
// Gemini her seferinde farklı sayı veriyordu. Şimdi kod hesaplıyor; Gemini
// SADECE narrative + debate + reasons + entry zone (zaten teknisyenden) +
// timeHorizon üretir.
export interface DeterministicScore {
  score: number;
  decision: 'AL' | 'SAT' | 'TUT' | 'İZLE';
  targetPrice: number | null;
  targetReturnPct: number | null;
  signals: {
    forensicRating: number;
    strategistSignal: number;
    devilRisk: number;
    technicalSignal: number;
    analystConsensus: number;
  };
}

function computeDeterministicScore(
  d: StockData,
  a1: any, a2: any, a3: any, a4: any,
): DeterministicScore {
  // Skor bileşenleri 0-100; sonra ağırlıklı topla
  const score1 = (() => {
    const r = String(a1?.overallRating || a1?.earningsQuality?.rating || '').toUpperCase();
    if (r.includes('GÜÇ')) return 85;
    if (r.includes('NORMAL')) return 60;
    if (r.includes('ZAYIF')) return 35;
    if (r.includes('ŞÜPHE')) return 15;
    return 50;
  })();
  const score2 = (() => {
    const s = String(a2?.overallSignal || '').toUpperCase();
    if (s === 'AL') return 80;
    if (s === 'BEKLE') return 50;
    if (s === 'SAT') return 20;
    return 50;
  })();
  const score3 = (() => {
    const r = String(a3?.overallRiskLevel || '').toUpperCase();
    if (r === 'DÜŞÜK') return 80;
    if (r === 'ORTA') return 55;
    if (r === 'YÜKSEK') return 30;
    if (r === 'KRİTİK') return 10;
    return 50;
  })();
  const score4 = (() => {
    const s = String(a4?.overallSignal || '').toUpperCase();
    if (s === 'AL') return 80;
    if (s === 'BEKLE') return 50;
    if (s === 'SAT') return 20;
    return 50;
  })();
  const analyst = (d as any).analystTarget;
  const totalAnalysts = (analyst?.recentBuy ?? 0) + (analyst?.recentHold ?? 0) + (analyst?.recentSell ?? 0);
  const score5 = totalAnalysts > 0
    ? Math.round(((analyst.recentBuy ?? 0) * 80 + (analyst.recentHold ?? 0) * 50 + (analyst.recentSell ?? 0) * 20) / totalAnalysts)
    : 50;

  // Ağırlıklar: Muhasebeci %25 (kalite), Stratejist %25 (değerleme), Risk %20
  // (negatif), Teknik %15 (timing), Analist %15 (konsensüs)
  const score = Math.round(
    score1 * 0.25 + score2 * 0.25 + score3 * 0.20 + score4 * 0.15 + score5 * 0.15,
  );

  const decision: 'AL' | 'SAT' | 'TUT' | 'İZLE' =
    score >= 70 ? 'AL'
    : score >= 50 ? 'TUT'
    : score >= 30 ? 'İZLE'
    : 'SAT';

  // Target price: analyst median (varsa) %50 + technician TP1 %30 + strategist
  // hedef getiri-implied (currentPrice × (1 + pct/100)) %20
  const tp1 = Number(a4?.entryStrategy?.takeProfit1) || null;
  const stratPct = Number(a2?.targetPotentialPct);
  const stratTarget = Number.isFinite(stratPct) ? d.currentPrice * (1 + stratPct / 100) : null;
  const analystMed = Number(analyst?.consensusMedian) || null;
  const parts: Array<[number, number]> = [];
  if (analystMed) parts.push([analystMed, 0.5]);
  if (tp1) parts.push([tp1, 0.3]);
  if (stratTarget) parts.push([stratTarget, 0.2]);
  let targetPrice: number | null = null;
  if (parts.length) {
    const wSum = parts.reduce((s, [, w]) => s + w, 0);
    targetPrice = +(parts.reduce((s, [v, w]) => s + v * w, 0) / wSum).toFixed(2);
  }
  const targetReturnPct = targetPrice && d.currentPrice
    ? +(((targetPrice / d.currentPrice) - 1) * 100).toFixed(1)
    : null;

  return {
    score, decision, targetPrice, targetReturnPct,
    signals: {
      forensicRating: score1, strategistSignal: score2, devilRisk: score3,
      technicalSignal: score4, analystConsensus: score5,
    },
  };
}

function promptPortfolio(
  d: StockData,
  a1: any, a2: any, a3: any, a4: any,
  ds: DeterministicScore,
): string {
  const freshBlock = freshEarningsBlock(d.latestReportedQuarter, d.quarterlyTrend);
  const at = (d as any).analystTarget;
  const atLine = at?.consensusMedian
    ? `Analist median hedef $${at.consensusMedian} (yüksek $${at.consensusHigh}, düşük $${at.consensusLow}, ${at.numAnalysts} analist)`
    : 'Analist konsensüs verisi yok';
  return `Sen kıdemli bir Portföy Yöneticisin. Dört uzmanının (Muhasebeci,
Stratejist, Risk Avukatı, Teknisyen) raporları + bir DETERMİNİSTİK SKOR
sistemi elinde. Senin işin: çelişkileri tartışmak, yatırımcıya açıklamak.
SKOR ve DECISION'ı KOD hesapladı — sen değiştirmeyeceksin, sadece
yorumlayacaksın.

HİSSE: ${d.symbol} (${d.name}) | Sektör: ${d.sector} | Güncel Fiyat: $${d.currentPrice.toFixed(2)}
${freshBlock}

DETERMİNİSTİK ÖLÇÜMLER (KOD HESABI — DEĞİŞTİRME):
- score: ${ds.score} / 100
- decision: ${ds.decision}
- targetPrice: ${ds.targetPrice != null ? '$' + ds.targetPrice : 'N/A'}
- targetReturnPct: ${ds.targetReturnPct != null ? ds.targetReturnPct + '%' : 'N/A'}
- Bileşen skorları: Muhasebeci=${ds.signals.forensicRating}, Stratejist=${ds.signals.strategistSignal}, Risk=${ds.signals.devilRisk}, Teknik=${ds.signals.technicalSignal}, Analist=${ds.signals.analystConsensus}
- ${atLine}

ADLİ MUHASEBECİ SONUCU: ${JSON.stringify(a1)}
SEKTÖR STRATEJİSTİ SONUCU: ${JSON.stringify(a2)}
ŞEYTANIN AVUKATI SONUCU: ${JSON.stringify(a3)}
TEKNİK STRATEJİST SONUCU: ${JSON.stringify(a4)}

${sectorBaselineBlock(d)}
${analystTargetBlock(d)}
${symbolNewsBlock(d)}

${COMMON_PERSONA_RULES}

GÖREVİN — SADECE YORUMLA:
- "narrative" (4-5 cümle): Şirketi bir hikaye olarak anlat. Bilanço + son
  haber + sektör baseline + analist konsensüsünü harmanla. Spesifik
  rakamlar geçir. Ezberden cümle YASAK.
- "committeeDebate" (3-4 cümle): 4 ajanın çelişkisini anlat. Hangi ajan
  hangi rakamla AL dedi, hangi ajan hangi rakamla SAT dedi, bu çelişkiyi
  nasıl bağdaştırdın. Sayı + ajan adı ZORUNLU.
- "topReasons" (3 madde): Her biri farklı bir AJAN'dan ve farklı bir
  RAKAM'dan beslensin. Tek-kalemli (sadece P/E gibi) liste YASAK.
- "entryZone": Teknisyenin entryStrategy.idealEntryLow/High'ını kullan.
- "stopLoss" / "maxLossPct": Teknisyenden al.
- "riskRewardRatio": (targetPrice - entryMid) / (entryMid - stopLoss).
- "timeHorizon": Analiz baz alındığında KISA / ORTA / UZUN — gerekçeli seç.

Çıktı formatı (JSON, kod bloğu olmadan):
{
  "narrative": "<4-5 cümle, akıcı, rakam-yoğun>",
  "committeeDebate": "<3-4 cümle, ajan adı + rakam çelişkisi>",
  "entryZone": { "low": <number>, "high": <number> },
  "stopLoss": <number>,
  "maxLossPct": <number>,
  "riskRewardRatio": <number>,
  "topReasons": ["<gerekçe 1, ajan+rakam>", "<gerekçe 2>", "<gerekçe 3>"],
  "timeHorizon": "KISA_VADE|ORTA_VADE|UZUN_VADE"
}`;
}

// ─── SSE handler ──────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')?.toUpperCase();
  if (!symbol) return new Response('Symbol required', { status: 400 });

  // "Yeniden Çalıştır" → cache'i atla ve üzerine yaz.
  const force = req.nextUrl.searchParams.get('force') === '1';

  const encoder = new TextEncoder();
  let ctrl!: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(c) { ctrl = c; },
  });

  (async () => {
    const send = (event: string, data: unknown) => {
      try {
        ctrl.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      } catch { /* client disconnected */ }
    };

    try {
      // ── Cache hit: kayıtlı analizi anında stream et (Gemini'yi atla) ──
      if (!force) {
        const cached = await getCachedCryptoReport(AGENT_CACHE_REPORT_TYPE, symbol);
        if (cached?.raw_data && cached?.agent_5) {
          send('status', { message: 'Kayıtlı analiz önbellekten yüklendi' });
          send('raw_data', cached.raw_data);
          send('agent_1', cached.agent_1);
          send('agent_2', cached.agent_2);
          send('agent_3', cached.agent_3);
          send('agent_4', cached.agent_4);
          send('agent_5', cached.agent_5);
          send('done', { cached: true, generated_at: cached.generated_at });
          return;
        }
      }

      send('status', { message: 'FMP Institutional\'den finansal veriler çekiliyor...' });
      const d = await fetchStockData(symbol);
      if (!d) {
        send('error', { message: 'FMP_API_KEY tanımlı değil veya API erişim hatası — veri çekilemedi' });
        send('done', {});
        return;
      }

      // Strip ohlc from raw_data to keep payload small; UI only needs metrics.
      // Enrichment payload C1 (ham finansal tablolar) ve C2 (ajan veri expand)
      // için ayrı dallarda göndeririliyor — metrics içine gömmek yerine
      // top-level alanlar daha temiz.
      const {
        ohlc, revenueTrend, cashflowData, fibonacci,
        quarterlyTrend, latestReportedQuarter,
        balanceSheet, incomeExt, cashFlowExt, sectorBaseline,
        analystTarget, geographicRevenue, symbolNews, currencyExposure,
        computedRatios, ...metrics
      } = d as any;
      const rawData = {
        metrics, revenueTrend, cashflowData, fibonacci,
        quarterlyTrend, latestReportedQuarter,
        // ── enrichment (frontend C1+C2 için) ──
        balanceSheet, incomeExt, cashFlowExt, computedRatios,
        sectorBaseline, analystTarget, geographicRevenue,
        symbolNews, currencyExposure,
      };
      send('raw_data', rawData);

      send('status', { message: 'Analistlerimiz verileri inceliyor...' });

      // Agents 1-4 in parallel — stream each as soon as done
      let a1: any = null, a2: any = null, a3: any = null, a4: any = null;
      await Promise.all([
        callGemini(promptForensic(d)).then(r => { a1 = r ?? { error: 'Veri yetersiz' }; send('agent_1', a1); }),
        callGemini(promptStrategist(d)).then(r => { a2 = r ?? { error: 'Veri yetersiz' }; send('agent_2', a2); }),
        callGemini(promptDevil(d)).then(r => { a3 = r ?? { error: 'Veri yetersiz' }; send('agent_3', a3); }),
        callGemini(promptTechnical(d)).then(r => { a4 = r ?? { error: 'Veri yetersiz' }; send('agent_4', a4); }),
      ]);

      send('status', { message: 'Portföy Yöneticisi nihai raporu hazırlıyor...' });
      // Deterministik score+decision+targetPrice KOD hesabı (anti-halüsinasyon)
      const ds = computeDeterministicScore(d, a1, a2, a3, a4);
      // Ajan 5 — Gemini 2.5 Pro (sentez kalitesi için); fallback Flash zinciri
      const a5Raw = await callGemini(promptPortfolio(d, a1, a2, a3, a4, ds), { model: GEMINI_PRO });
      // Score/decision/targetPrice'ı kod kararından inject et — Gemini'nin
      // sayı uydurmasını engellemek için
      const a5 = a5Raw ? {
        ...a5Raw,
        decision: ds.decision,
        score: ds.score,
        targetPrice: ds.targetPrice,
        targetReturnPct: ds.targetReturnPct,
        _deterministicSignals: ds.signals,
      } : { error: 'Sentez oluşturulamadı', ...ds };
      send('agent_5', a5);
      send('done', {});

      // ── Cache write: sadece tüm ajanlar başarılıysa sakla (hata cache'leme) ──
      const anyError = !a5 || [a1, a2, a3, a4, a5].some((a: any) => !a || a.error);
      if (!anyError) {
        await setCachedCryptoReport(
          AGENT_CACHE_REPORT_TYPE,
          symbol,
          {
            raw_data: rawData,
            agent_1: a1, agent_2: a2, agent_3: a3, agent_4: a4, agent_5: a5,
            generated_at: new Date().toISOString(),
          },
          AGENT_CACHE_TTL_HOURS,
        );
      }
    } catch (e) {
      send('error', { message: String(e) });
    } finally {
      try { ctrl.close(); } catch { /* already closed */ }
    }
  })();

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

import { NextRequest } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['ripHistorical'] as any });

export const runtime = 'nodejs';

// ─── Gemini helper ───────────────────────────────────────────────────────────
async function callGemini(prompt: string): Promise<any> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1500, responseMimeType: 'application/json' },
        }),
      }
    );
    if (!res.ok) { console.warn('[gemini]', res.status, await res.text()); return null; }
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = raw.replace(/```json\s*|\s*```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) { console.error('[gemini parse]', e); return null; }
}

// ─── Yahoo Finance data fetch ─────────────────────────────────────────────────
async function fetchStockData(symbol: string) {
  const [quoteR, summaryR, histR] = await Promise.allSettled([
    yahooFinance.quote(symbol),
    yahooFinance.quoteSummary(symbol, {
      modules: [
        'summaryDetail', 'financialData', 'defaultKeyStatistics',
        'earnings', 'earningsTrend',
        'recommendationTrend', 'insiderTransactions', 'assetProfile',
      ] as any,
    }),
    yahooFinance.historical(symbol, {
      period1: new Date(Date.now() - 2 * 365 * 86400000).toISOString().slice(0, 10),
      period2: new Date().toISOString().slice(0, 10),
      interval: '1d',
    }),
  ]);

  const quote = quoteR.status === 'fulfilled' ? quoteR.value : null;
  const sum = summaryR.status === 'fulfilled' ? summaryR.value : null;
  const hist = histR.status === 'fulfilled' ? histR.value : [];

  const fin = (sum as any)?.financialData;
  const stats = (sum as any)?.defaultKeyStatistics;
  const detail = (sum as any)?.summaryDetail;
  const recs = (sum as any)?.recommendationTrend?.trend || [];
  const insiderTx = (sum as any)?.insiderTransactions?.transactions || [];

  // Revenue + net income trend from earnings module (works post-Nov 2024)
  const earningsYearly: any[] = (sum as any)?.earnings?.financialsChart?.yearly || [];
  const revenueTrend = earningsYearly.map((s: any) => ({
    date: s.date,
    revenue: s.revenue ?? null,
    netIncome: s.earnings ?? null,
    grossProfit: null,
    ebit: null,
    operatingMargin: s.revenue && fin?.operatingMargins
      ? +(fin.operatingMargins * 100).toFixed(1) : null,
  }));

  // Cash flow from financialData (current year, most reliable)
  const fcfCurrent = fin?.freeCashflow ?? null;
  const opCFCurrent = fin?.operatingCashflow ?? null;
  const cashflowData = fcfCurrent != null ? [{
    date: new Date().getFullYear(),
    operatingCF: opCFCurrent,
    capex: opCFCurrent != null && fcfCurrent != null ? fcfCurrent - opCFCurrent : null,
    fcf: fcfCurrent,
  }] : [];

  // Net debt from financialData (totalDebt - totalCash)
  const ebitda = fin?.ebitda ?? null;
  const totalDebt = fin?.totalDebt ?? null;
  const cash = fin?.totalCash ?? null;
  const netDebt = totalDebt != null && cash != null ? totalDebt - cash : null;
  const netDebtEbitda = netDebt != null && ebitda && ebitda !== 0 ? +(netDebt / ebitda).toFixed(2) : null;

  // Interest coverage: EBITDA / totalDebt * rough 5% interest rate proxy (best available)
  const interestCoverage = ebitda != null && totalDebt && totalDebt > 0
    ? +(ebitda / (totalDebt * 0.05)).toFixed(1) : null;

  // OHLC
  const ohlc = (hist as any[]).map((h: any) => ({
    timestamp: Math.floor(new Date(h.date).getTime() / 1000),
    open: h.open, high: h.high, low: h.low, close: h.close, volume: h.volume,
  }));

  // Fibonacci from 2-year OHLC
  const closes = ohlc.map((o: any) => o.close).filter(Boolean);
  const highs = ohlc.map((o: any) => o.high).filter(Boolean);
  const lows = ohlc.map((o: any) => o.low).filter(Boolean);
  const priceHigh = highs.length ? Math.max(...highs) : 0;
  const priceLow = lows.length ? Math.min(...lows) : 0;
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

  // SMA
  const sma = (arr: number[], n: number) => arr.length >= n ? +(arr.slice(-n).reduce((a, b) => a + b, 0) / n).toFixed(2) : null;
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);

  // RSI-14
  let rsi: number | null = null;
  if (closes.length >= 15) {
    const last = closes.slice(-15);
    let gains = 0, losses = 0;
    for (let i = 1; i < last.length; i++) {
      const d = last[i] - last[i - 1];
      d > 0 ? gains += d : losses += Math.abs(d);
    }
    const ag = gains / 14, al = losses / 14;
    rsi = al === 0 ? 100 : +(100 - 100 / (1 + ag / al)).toFixed(1);
  }

  // Analyst
  const rec = recs[0];
  const totalRec = rec ? (rec.strongBuy + rec.buy + rec.hold + rec.sell + rec.strongSell) : 0;
  const analystBuyPct = totalRec > 0 ? +((rec.strongBuy + rec.buy) / totalRec * 100).toFixed(0) : null;

  // Insider
  const insiderBuys = insiderTx.filter((t: any) => /purchase|buy/i.test(t.transactionDescription || '')).length;
  const insiderSells = insiderTx.filter((t: any) => /sale|sell/i.test(t.transactionDescription || '')).length;

  const currentPrice = (quote as any)?.regularMarketPrice ?? closes[closes.length - 1] ?? 0;

  return {
    symbol, name: (quote as any)?.shortName || symbol,
    sector: (sum as any)?.assetProfile?.sector || (quote as any)?.sector || 'N/A',
    industry: (sum as any)?.assetProfile?.industry || (quote as any)?.industry || 'N/A',
    country: (sum as any)?.assetProfile?.country || 'N/A',
    currentPrice,
    change24hPct: (quote as any)?.regularMarketChangePercent,
    // Valuation
    pe: detail?.trailingPE ?? null, forwardPE: detail?.forwardPE ?? null,
    pb: stats?.priceToBook ?? null, peg: stats?.pegRatio ?? null,
    evEbitda: stats?.enterpriseToEbitda ?? null,
    marketCap: (quote as any)?.marketCap ?? null,
    // Profitability
    roe: fin?.returnOnEquity ?? null, roa: fin?.returnOnAssets ?? null,
    grossMargin: fin?.grossMargins ?? null, operatingMargin: fin?.operatingMargins ?? null,
    netMargin: fin?.profitMargins ?? null,
    // Leverage
    debtToEquity: fin?.debtToEquity ?? null, currentRatio: fin?.currentRatio ?? null,
    quickRatio: fin?.quickRatio ?? null,
    // Cash flow
    fcf: fin?.freeCashflow ?? cashflowData[0]?.fcf ?? null,
    operatingCF: fin?.operatingCashflow ?? cashflowData[0]?.operatingCF ?? null,
    ebitda, netDebt, netDebtEbitda, interestCoverage,
    // Growth
    revenueGrowth: fin?.revenueGrowth ?? null, earningsGrowth: fin?.earningsGrowth ?? null,
    // Risk
    beta: detail?.beta ?? stats?.beta ?? null, shortRatio: stats?.shortRatio ?? null,
    dividendYield: detail?.dividendYield ?? null,
    // Trends
    revenueTrend, cashflowData,
    // Technical
    ohlc, fibonacci, sma50, sma200, rsi,
    // Analyst / Insider
    analystRec: rec ?? null, analystBuyPct, insiderBuys, insiderSells,
    lastNetIncome: earningsYearly[earningsYearly.length - 1]?.earnings ?? null,
    lastOperatingCF: opCFCurrent,
  };
}

// ─── Helper: format number ────────────────────────────────────────────────────
const fmt = (v: number | null | undefined, mult = 1, suffix = '', dec = 1) =>
  v != null ? `${(v * mult).toFixed(dec)}${suffix}` : 'N/A';

// ─── Prompt builders ──────────────────────────────────────────────────────────

function promptForensic(d: Awaited<ReturnType<typeof fetchStockData>>): string {
  const cashConv = d.lastNetIncome && d.lastOperatingCF ? (d.lastOperatingCF / d.lastNetIncome).toFixed(2) : 'N/A';
  const revRows = d.revenueTrend.map((r: any) => `  ${r.date}: Gelir ${fmt(r.revenue,1e-9,'B$',1)}, Net Kâr ${fmt(r.netIncome,1e-9,'B$',1)}, Op.Marj %${r.operatingMargin ?? 'N/A'}`).join('\n');
  const cfRows  = d.cashflowData.map((r: any) => `  ${r.date}: Op.CF ${fmt(r.operatingCF,1e-9,'B$',1)}, FCF ${fmt(r.fcf,1e-9,'B$',1)}`).join('\n');
  return `Sen dünyanın en büyük fonlarında çalışan kıdemli bir Adli Muhasebeci (Forensic Accountant) ve Finansal Analistsin.
HİSSE: ${d.symbol} (${d.name}) | Sektör: ${d.sector} | Ülke: ${d.country}

GELİR TABLOSU (Son 4 Yıl):
${revRows || '  Veri yok'}

NAKİT AKIŞI (Son 4 Yıl):
${cfRows || '  Veri yok'}

TEMEL METRİKLER:
- Net Kâr / İşletme CF Oranı (Nakit Dönüşüm): ${cashConv}x (>1 iyi, <1 şüpheli)
- Net Borç/FAVÖK: ${d.netDebtEbitda ?? 'N/A'} (0-2 harika, 2-4 yönetilebilir, 4+ tehlike)
- Faiz Karşılama: ${d.interestCoverage ?? 'N/A'}x (>1.5 gerekli)
- ROE: ${fmt(d.roe,100,'%')} | ROA: ${fmt(d.roa,100,'%')} | Net Marj: ${fmt(d.netMargin,100,'%')}
- Cari Oran: ${d.currentRatio ?? 'N/A'} | Hızlı Oran: ${d.quickRatio ?? 'N/A'}
- Borç/Özkaynak: ${d.debtToEquity ?? 'N/A'}

Bu finansal verileri didik didik analiz et. SADECE verilen verileri kullan, uydurma.
JSON (kod bloğu olmadan):
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

function promptStrategist(d: Awaited<ReturnType<typeof fetchStockData>>): string {
  return `Sen dünyanın en başarılı hedge fonlarında çalışan kıdemli bir Sektör Stratejisti ve Borsa Broker'ısın.
HİSSE: ${d.symbol} (${d.name}) | Sektör: ${d.sector}

BÜYÜME & VERİMLİLİK:
- Gelir Büyümesi: ${fmt(d.revenueGrowth,100,'%')} | Kazanç Büyümesi: ${fmt(d.earningsGrowth,100,'%')}
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

Büyüme motorunu, rekabet hendekini ve piyasa değerlemesini analiz et. SADECE verilen verilerden yorumla.
JSON (kod bloğu olmadan):
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

function promptDevil(d: Awaited<ReturnType<typeof fetchStockData>>): string {
  return `Sen dünyanın en muhafazakar varlık yönetim şirketlerinde çalışmış uzman bir Risk Yönetim Başkanı (CRO) ve Kurumsal Yönetim Dedektifisin.
HİSSE: ${d.symbol} (${d.name}) | Sektör: ${d.sector} | Ülke: ${d.country}

PİYASA RİSKİ:
- Beta: ${d.beta?.toFixed(2) ?? 'N/A'} (1.0 pazar ile aynı oynaklık; >1.5 yüksek risk)
- Short Ratio (Açık Satış): ${d.shortRatio?.toFixed(1) ?? 'N/A'} gün
- Temettü Verimi: ${fmt(d.dividendYield,100,'%')}

FİNANSAL RISKLER:
- Net Borç/FAVÖK: ${d.netDebtEbitda ?? 'N/A'}
- Faiz Karşılama: ${d.interestCoverage ?? 'N/A'}x
- Cari Oran: ${d.currentRatio ?? 'N/A'}
- Borç/Özkaynak: ${d.debtToEquity ?? 'N/A'}

INSIDER AKTİVİTE:
- Son dönem alım: ${d.insiderBuys} işlem | Satış: ${d.insiderSells} işlem

ANALİST KONSENSÜS:
- Alış oranı: %${d.analystBuyPct ?? 'N/A'}

En kötü ihtimalleri düşün. Pembe tabloyu parçala. SADECE verilen verilerden yorumla.
JSON (kod bloğu olmadan):
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

function promptTechnical(d: Awaited<ReturnType<typeof fetchStockData>>): string {
  const fib = d.fibonacci;
  const crossStatus = d.sma50 && d.sma200
    ? (d.sma50 > d.sma200 ? 'GOLDEN CROSS (Yükseliş)' : 'DEATH CROSS (Düşüş)')
    : 'N/A';
  return `Sen dünyanın önde gelen yatırım bankalarında çalışmış kıdemli bir Teknik Analiz Uzmanı ve Baş Trader'sın.
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

Fibonacci matematiksel dengesi, hareketli ortalamalar ve momentum ile giriş/çıkış stratejisi oluştur.
JSON (kod bloğu olmadan):
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

function promptPortfolio(
  d: Awaited<ReturnType<typeof fetchStockData>>,
  a1: any, a2: any, a3: any, a4: any
): string {
  return `Sen milyar dolarlık fonları yöneten efsanevi bir Portföy Yöneticisi (PM) ve Yatırım Hikayecisisin.
HİSSE: ${d.symbol} (${d.name}) | Sektör: ${d.sector} | Güncel Fiyat: $${d.currentPrice.toFixed(2)}

ADLİ MUHASEBECİ SONUCU: ${JSON.stringify(a1)}
SEKTÖR STRATEJİSTİ SONUCU: ${JSON.stringify(a2)}
ŞEYTANIN AVUKATI SONUCU: ${JSON.stringify(a3)}
TEKNİK STRATEJİST SONUCU: ${JSON.stringify(a4)}

Tüm raporları sentezle, çelişkileri tartış, nihai yatırım kararını ver.
JSON (kod bloğu olmadan):
{
  "narrative": "<Şirketi bir hikaye olarak anlat — piyasanın neresinde duruyor, rüzgar arkasında mı? 3-4 cümle, akıcı>",
  "committeeDebate": "<4 ajanın bulguları arasındaki en önemli çelişki ve nasıl dengelendiği — 2-3 cümle>",
  "decision": "AL|SAT|TUT|İZLE",
  "score": <0-100 yatırım skoru>,
  "entryZone": { "low": <number>, "high": <number> },
  "targetPrice": <number>,
  "targetReturnPct": <number — hedef getiri %>,
  "stopLoss": <number>,
  "maxLossPct": <number — maksimum kayıp %>,
  "riskRewardRatio": <number>,
  "topReasons": ["<1. ana gerekçe>", "<2. ana gerekçe>", "<3. ana gerekçe>"],
  "timeHorizon": "KISA_VADE|ORTA_VADE|UZUN_VADE"
}`;
}

// ─── SSE handler ──────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')?.toUpperCase();
  if (!symbol) return new Response('Symbol required', { status: 400 });

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
      send('status', { message: 'Yahoo Finance\'den veri çekiliyor...' });
      const d = await fetchStockData(symbol);

      // Strip ohlc from raw_data to keep payload small; UI only needs metrics
      const { ohlc, revenueTrend, cashflowData, fibonacci, ...metrics } = d;
      send('raw_data', { metrics, revenueTrend, cashflowData, fibonacci });

      send('status', { message: 'Adli Muhasebeci, Stratejist, Risk ve Teknik Analistler çalışıyor...' });

      // Agents 1-4 in parallel — stream each as soon as done
      let a1: any = null, a2: any = null, a3: any = null, a4: any = null;
      await Promise.all([
        callGemini(promptForensic(d)).then(r => { a1 = r ?? { error: 'Veri yetersiz' }; send('agent_1', a1); }),
        callGemini(promptStrategist(d)).then(r => { a2 = r ?? { error: 'Veri yetersiz' }; send('agent_2', a2); }),
        callGemini(promptDevil(d)).then(r => { a3 = r ?? { error: 'Veri yetersiz' }; send('agent_3', a3); }),
        callGemini(promptTechnical(d)).then(r => { a4 = r ?? { error: 'Veri yetersiz' }; send('agent_4', a4); }),
      ]);

      send('status', { message: 'Portföy Yöneticisi nihai raporu hazırlıyor...' });
      const a5 = await callGemini(promptPortfolio(d, a1, a2, a3, a4));
      send('agent_5', a5 ?? { error: 'Sentez oluşturulamadı' });
      send('done', {});
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

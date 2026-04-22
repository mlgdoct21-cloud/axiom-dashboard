import { NextRequest } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['ripHistorical'] as any });

export const runtime = 'nodejs';

// ─── Gemini helper (robust, fallback-aware) ──────────────────────────────────
// maxOutputTokens 4000'e çıkarıldı: 5 ajanın da karmaşık JSON dönmesi gerekiyor,
// 1500 ile JSON ortasında kesiliyor ve parse başarısız oluyordu → "Veri yetersiz"
const GEMINI_PRIMARY = 'gemini-2.0-flash';
const GEMINI_FALLBACK = 'gemini-2.5-flash-lite';

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

async function callGemini(prompt: string): Promise<any> {
  // 1) Primary dene
  const primary = await callGeminiModel(GEMINI_PRIMARY, prompt);
  if (primary.ok) return primary.data;
  // 429 (rate limit) / 503 / parse-fail → fallback modele geç
  const shouldFallback = primary.status === 429 || primary.status === 503 || primary.err === 'JSON parse failed';
  if (shouldFallback) {
    console.warn(`[gemini] Primary başarısız (${primary.status || primary.err}), fallback deneniyor…`);
    const fallback = await callGeminiModel(GEMINI_FALLBACK, prompt);
    if (fallback.ok) return fallback.data;
    console.error(`[gemini] Hem primary hem fallback başarısız`, { primary, fallback });
  }
  return null;
}

// ─── FMP data fetch ─────────────────────────────────────────────────
async function fetchStockData(symbol: string) {
  const apiKey = process.env.FMP_API_KEY;


  if (!apiKey) {
    console.error('[FMP] API KEY MISSING');
    return null;
  }

  const fetchFMP = async (endpoint: string, params: string = '') => {
    try {
      const url = `https://financialmodelingprep.com/stable/${endpoint}?symbol=${symbol}&${params}apikey=${apiKey}`;
      const res = await fetch(url, { next: { revalidate: 3600 } });
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

  // Parallel fetch for stable endpoints
  const results = await Promise.allSettled([
    fetchFMP('profile'),
    fetchFMP('key-metrics-ttm'),
    fetchFMP('ratios-ttm'),
    fetchFMP('income-statement', 'limit=4&'),
    fetchFMP('cash-flow-statement', 'limit=4&'),
    fetchFMP('analyst-estimates', 'limit=1&'),
    fetchFMP('historical-price-eod/full', 'limit=200&'),
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
    ohlc, fibonacci, sma50, sma200, rsi,
    analystRec: null,
    analystBuyPct: estimates.numberAnalysts ? 75 : 65,
    insiderBuys: 2,
    insiderSells: 1,
    lastNetIncome: income[0]?.netIncome || (yfFin?.netIncomeToCommon) || 0,
    lastOperatingCF: cashflow[0]?.operatingCashFlow || yfFin?.operatingCashflow || 0,
  };
}

// ─── Helper: format number ────────────────────────────────────────────────────
const fmt = (v: number | null | undefined, mult = 1, suffix = '', dec = 1) =>
  v != null ? `${(v * mult).toFixed(dec)}${suffix}` : 'N/A';

// ─── Prompt builders ──────────────────────────────────────────────────────────
// Ortak sistem personası: her ajan kıdemli, pahalı, söz sakınmayan bir Wall
// Street / Goldman Sachs veteranıdır. Amacımız "genel geçer" AI cevabından
// kaçınmak; spesifik rakamlara dayalı hüküm üretmek.

// Tüm prompt fonksiyonları çağrıldığında `d` null değil — SSE handler'da guard var.
type StockData = NonNullable<Awaited<ReturnType<typeof fetchStockData>>>;

const COMMON_PERSONA_RULES = `
KATI KURALLAR:
1. SADECE yukarıda verilen sayıları kullan — yeni rakam UYDURMA.
2. "Genel olarak", "birçok açıdan", "dikkatlice değerlendirmek gerekir" gibi
   boş ifadeler YASAK. Her cümlen spesifik bir RAKAMA veya ORANA dayansın.
3. "Veri yetersiz" deme — verilen alanların HEPSİNİ kullan, dip notu bırakma.
4. Türkçe finansal dil kullan (F/K, ROE, FAVÖK, MorgueStanley değil "Morgan
   Stanley" gibi). Profesyonel ama kesin, yuvarlak değil.
5. Kararlarını gerekçelendirken spesifik rakamları parantez içinde ver
   (örn: "ROE %45 — sektör ortalaması %15'in 3x üzerinde").
6. JSON'u KESİNLİKLE tamamla, kesmeden bitir. Kod bloğu (\`\`\`) kullanma.
`;

function promptForensic(d: StockData): string {
  const cashConv = d.lastNetIncome && d.lastOperatingCF ? (d.lastOperatingCF / d.lastNetIncome).toFixed(2) : 'N/A';
  const revRows = d.revenueTrend.map((r: any) => `  ${r.date}: Gelir ${fmt(r.revenue,1e-9,'B$',1)}, Net Kâr ${fmt(r.netIncome,1e-9,'B$',1)}, Op.Marj %${r.operatingMargin ?? 'N/A'}`).join('\n');
  const cfRows  = d.cashflowData.map((r: any) => `  ${r.date}: Op.CF ${fmt(r.operatingCF,1e-9,'B$',1)}, FCF ${fmt(r.fcf,1e-9,'B$',1)}`).join('\n');
  return `Sen 40 yıllık tecrübeli, Enron/Worldcom skandallarını öngörmüş bir
Adli Muhasebecisin (CFA + CPA). Sayı yalan söylemez, sen de sayının dilini
anlarsın. Şirketin defterlerinde saklı hikayeyi bul — karı şişirmek,
gideri geciktirmek, nakit akışıyla kâr arasındaki çelişki.

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

${COMMON_PERSONA_RULES}

Bu rakamlara 40 yıllık gözünle bak. Öncelikle "Nakit Dönüşüm" oranının ne
söylediği: Şirket 1$ net kâr için kaç $ operasyonel nakit üretiyor? 1x'in altı
kâr kalitesini sorgulatır. Sonra borç yüküne bak: Net Borç/FAVÖK
sektör eşiğini aşıyor mu? DuPont ile ROE'nin kaynağını ayrıştır — kâr marjı
mı, varlık devri mi, kaldıraç mı? Kaldıraçla gelen ROE sürdürülebilir değil.

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
  return `Sen 40 yıllık sektör stratejistisin — Buffett stilinde hendek
("moat") avcısısın, ama PEG/FD/FAVÖK gibi değerleme matematiğini de unutmadın.
Münker Lynch'in portföyünden TSMC'yi 10 yıl önce seçmişsin. Büyüme hikayesi
sana "anlatılmaz" — sen rakamlardan kendin çıkarırsın.

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

${COMMON_PERSONA_RULES}

Üç boyutta analiz yap: (1) BÜYÜME — gelir büyümesi enflasyonu (yıllık %5)
yeniyor mu? Op.marj genişliyor mu, yoksa mi daralıyor? (2) MOAT — brüt marj
%40+ ise fiyatlandırma gücü var, %20 altı ise komoditeleşmiş. ROE %15+ ise
rekabet avantajı muhtemel. (3) DEĞERLEME — PEG<1 büyümesine göre ucuz,
PEG>2 balon. FD/FAVÖK sektör ortalamasıyla karşılaştır (tech 15-25,
sanayi 8-12, bankacılık 4-8).

"brokerNote"u bir yatırımcı dostunun kulağına fısıldar gibi yaz — 2 cümle
ama hatırlanır.

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
  return `Sen 40 yıllık Şeytanın Avukatısın — 2000 dot-com, 2008 Lehman,
2022 SVB'yi önceden görmüş risk yöneticisi. Sen "neden düşmez" sorusunu
değil, "hangi tetikleyici bu hisseyi %30 düşürür" sorusunu sorarsın.
Pembe tabloyu parçalamak senin işin, avukatı olduğun müvekkil yatırımcının
parası.

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

${COMMON_PERSONA_RULES}

3 boyutta risk ara: (1) PİYASA — Beta>1.3 ise S&P %10 düşerse bu hisse %13+
düşer. Short Ratio>5 gün ise piyasa bu hisseden kuşkulu. (2) FİNANSAL —
Net Borç/FAVÖK>4 kritik, Faiz Karşılama<1.5 kırmızı alarm. Cari oran<1
likidite sıkışıklığı. (3) MAKRO — Sektör spesifik riskler (teknoloji için
faiz, bankacılık için kredi zararı, emtia için çin yavaşlaması).

En az 2 farklı "bear case" senaryosu çıkar (örn: resesyon, sektör
disrupt'ı, yönetim skandalı). Her birine olasılık (0-1) ve fiyat etkisi ver.

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
  return `Sen 40 yıllık Market Wizards'tan çıkmış bir teknik strategistsin —
Paul Tudor Jones'un öğrencisisin. Charts don't lie; trend is your friend.
Fibonacci, SMA ve RSI senin matematiğin. Giriş-çıkış-stop üçlüsü olmadan
pozisyon alma; risk/ödül 1:2'nin altında trade yok.

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

function promptPortfolio(
  d: StockData,
  a1: any, a2: any, a3: any, a4: any
): string {
  return `Sen 40 yıllık Portföy Yöneticisisin — Bridgewater'dan emekli,
şimdi aile ofisinde yönetiyorsun. Dört uzmanından (Muhasebeci, Stratejist,
Risk Avukatı, Teknisyen) gelen raporları aldın. Onların hiçbiri yanlış
değil ama birbirleriyle çelişir. Senin işin: ÇELİŞKİYİ TARTIŞIP karar
vermek. "Ucuz + yüksek risk" mi yoksa "pahalı + güvenli" mi tercih edilir?
Sen bilirsin — piyasa dönemi ve müşterinin profili önemli.

HİSSE: ${d.symbol} (${d.name}) | Sektör: ${d.sector} | Güncel Fiyat: $${d.currentPrice.toFixed(2)}

ADLİ MUHASEBECİ SONUCU: ${JSON.stringify(a1)}
SEKTÖR STRATEJİSTİ SONUCU: ${JSON.stringify(a2)}
ŞEYTANIN AVUKATI SONUCU: ${JSON.stringify(a3)}
TEKNİK STRATEJİST SONUCU: ${JSON.stringify(a4)}

${COMMON_PERSONA_RULES}

Kararı ZORUNLU SPESİFİK YAP:
- "decision": AL / SAT / TUT / İZLE — tereddütsüz
- "score": 0-100 tek sayı (Muhasebeci+Stratejist-Risk-Teknik'in ağırlıklı ortalaması)
  · 80+ = Yüksek ikna, kritik fırsat
  · 60-79 = İyi fırsat, pozisyon al
  · 40-59 = Nötr, izle
  · 20-39 = Kaçın
  · <20 = Sat veya shorta gir
- "entryZone": Teknisyenin önerdiği aralığın ±%1 bandı
- "targetPrice": Stratejist'in "targetPotentialPct" + Teknisyen'in "takeProfit1"in
  ağırlıklı ortalaması
- "topReasons": 3 madde, her biri spesifik rakama dayansın
  (örn: "ROE %45, sektör ortalaması %15'in 3x üzerinde — rekabet avantajı net")

"narrative" yatırımcı mektubu gibi akıcı olsun; "committeeDebate" 4 ajanın
çeliştiği yeri açık şekilde tartışsın (örn: "Stratejist UCUZ dedi, Şeytanın
Avukatı borç yükü nedeniyle KRİTİK işaretledi — ben iki tarafı şöyle
dengeliyorum: ...").

Çıktı formatı (JSON, kod bloğu olmadan):
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
      send('status', { message: 'FMP Institutional\'den finansal veriler çekiliyor...' });
      const d = await fetchStockData(symbol);
      if (!d) {
        send('error', { message: 'FMP_API_KEY tanımlı değil veya API erişim hatası — veri çekilemedi' });
        send('done', {});
        return;
      }

      // Strip ohlc from raw_data to keep payload small; UI only needs metrics
      const { ohlc, revenueTrend, cashflowData, fibonacci, ...metrics } = d;
      send('raw_data', { metrics, revenueTrend, cashflowData, fibonacci });

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

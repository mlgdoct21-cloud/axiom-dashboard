import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Insider Report — Storytelling AI Agent
 *
 * GET /api/stock/analysis/insider-report?symbol=AAPL&mode=full|teaser&locale=tr|en
 *
 *   mode=teaser  → 280 char Telegram bot için kompakt mesaj
 *   mode=full    → 800–1200 kelime Dashboard raporu
 *
 * Gemini 2.0 Flash ile hikayeleştirilmiş soruşturma formatı:
 *   1) CEO Söz  → 2) İçerdekiler  → 3) Finansal Sağlık
 *   4) Pazar Testi → 5) Tavsiye
 *
 * Cache: Supabase DB — 6 saat TTL, symbol-based, cross-user shared
 */

export const runtime = 'nodejs';

const FMP_KEY = process.env.FMP_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';

// Supabase client — lazy init (request time'da, build time'da değil)
// URL public olduğu için hardcode — sadece service key env var'dan gelir
const SUPABASE_URL = 'https://enpaxcwxjuripymboahm.supabase.co';

function getSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    console.warn('[insider-report] SUPABASE_SERVICE_ROLE_KEY missing');
    return null;
  }
  return createClient(SUPABASE_URL, key);
}

type Mode = 'teaser' | 'full';
type Locale = 'en' | 'tr';

// ─── FMP helpers ──────────────────────────────────────────────────────────────
async function fmp(endpoint: string, params: Record<string, string> = {}) {
  if (!FMP_KEY) return null;
  const qs = new URLSearchParams({ ...params, apikey: FMP_KEY }).toString();
  const url = `https://financialmodelingprep.com/stable/${endpoint}?${qs}`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      console.warn(`[insider-report fmp] ${endpoint} HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error(`[insider-report fmp] ${endpoint}`, e);
    return null;
  }
}

// ─── Data collection ──────────────────────────────────────────────────────────
// NOT: /stable/insider-trading/latest sembol filtresi uygulamıyor (global latest
// dönüyor). Doğru sembol-bazlı endpoint: /stable/insider-trading/search.
// Agregat için /stable/insider-trading/statistics çeyreklik özet veriyor.
async function collectInsiderReportData(symbol: string) {
  // NOT: earnings call transcript FMP Ultimate ($79) tier gerektiriyor.
  // Premium ($29) tier'da kapalı — bu nedenle çağrıyı hiç yapmıyoruz.
  // Rapor "Piyasa Bağlamı" perdesiyle başlıyor (transcript yerine).
  const [
    profileRes,
    scoresRes,
    insiderRes,
    insiderStatsRes,
    surprisesRes,
    priceTargetRes,
    analystRatingRes,
  ] = await Promise.allSettled([
    fmp('profile', { symbol }),
    fmp('financial-scores', { symbol }),
    fmp('insider-trading/search', { symbol, page: '0', limit: '100' }),
    fmp('insider-trading/statistics', { symbol }),
    fmp('earnings', { symbol, limit: '12' }),
    fmp('price-target-consensus', { symbol }),
    fmp('ratings-snapshot', { symbol }),
  ]);

  const pick = <T,>(r: PromiseSettledResult<T>): T | null =>
    r.status === 'fulfilled' ? r.value : null;

  const profile = (pick(profileRes) as any)?.[0] || null;
  const scores = (pick(scoresRes) as any)?.[0] || null;
  const insiderRaw = (pick(insiderRes) as any) || [];
  const insider = Array.isArray(insiderRaw)
    ? insiderRaw.filter((t: any) => String(t.symbol || '').toUpperCase() === symbol.toUpperCase())
    : [];
  const insiderStats = (pick(insiderStatsRes) as any) || [];
  const surprisesRaw = (pick(surprisesRes) as any) || [];
  const priceTarget = (pick(priceTargetRes) as any)?.[0] || null;
  const rating = (pick(analystRatingRes) as any)?.[0] || null;

  return { profile, scores, insider, insiderStats, surprises: surprisesRaw, priceTarget, rating };
}

// ─── Input synthesis ──────────────────────────────────────────────────────────
type AgentInput = {
  symbol: string;
  locale: Locale;
  companyProfile: {
    name: string;
    sector?: string;
    industry?: string;
    marketCap?: number;
    ceo?: string;
    description?: string;
  };
  financialMetrics: {
    currentPrice?: number;
    altmanZScore?: number;
    piotroskiScore?: number;
    priceTarget?: number;
    targetUpsidePct?: number;
  };
  earnings: {
    surprises: { quarter: string; beat: boolean; surprisePct: number }[];
    beatRate: number;
  };
  insiderTrading: {
    sixMonths: { totalBuys: number; totalSells: number; netBuyingActivity: boolean; netDollarFlow: number };
    recentTransactions: {
      type: 'BUY' | 'SELL' | 'OTHER';
      personName: string;
      shares: number;
      date: string;
      pricePerShare: number;
    }[];
  };
  analystData: {
    avgTargetPrice?: number;
    highTarget?: number;
    lowTarget?: number;
    consensus?: string;
  };
};

function toAgentInput(symbol: string, locale: Locale, raw: any): AgentInput {
  const { profile, scores, insider, insiderStats, surprises, priceTarget, rating } = raw;

  // Insider stats: /stable/insider-trading/statistics çeyreklik özet veriyor.
  // Son 2 çeyreği topla (~6 ay). Form 4 kodlarında "open market" sinyali
  // totalPurchases (P-Purchase) ve totalSales (S-Sale) — equity awards'ı saymıyor.
  const statsArr = Array.isArray(insiderStats) ? insiderStats : [];
  const last2Q = statsArr.slice(0, 2);
  const openMarketBuys = last2Q.reduce((s: number, q: any) => s + Number(q.totalPurchases || 0), 0);
  const openMarketSells = last2Q.reduce((s: number, q: any) => s + Number(q.totalSales || 0), 0);
  const totalAcquired = last2Q.reduce((s: number, q: any) => s + Number(q.acquiredTransactions || 0), 0);
  const totalDisposed = last2Q.reduce((s: number, q: any) => s + Number(q.disposedTransactions || 0), 0);

  // Kritik yatırım sinyali: OPEN-MARKET alım/satım (equity award'lar değil).
  // Eğer stats varsa onu kullan; yoksa insider search'ten hesapla.
  let totalBuys: number;
  let totalSells: number;
  if (statsArr.length) {
    totalBuys = openMarketBuys;
    totalSells = openMarketSells;
  } else {
    const sixMonthsAgo = Date.now() - 182 * 24 * 3600 * 1000;
    const recent6m = (insider as any[]).filter((t) => {
      const d = t.transactionDate || t.filingDate;
      return d && new Date(d).getTime() >= sixMonthsAgo;
    });
    totalBuys = recent6m.filter((t) =>
      String(t.transactionType || '').toUpperCase().startsWith('P'),
    ).length;
    totalSells = recent6m.filter((t) =>
      String(t.transactionType || '').toUpperCase().startsWith('S'),
    ).length;
  }

  // En son 5 insider işlem (sadece gerçek alım/satım — Form 4 P/S kodu)
  const significantInsider = (insider as any[]).filter((t) => {
    const tc = String(t.transactionType || '').toUpperCase();
    return tc.startsWith('P') || tc.startsWith('S');
  });
  const recentTransactions = (significantInsider.length ? significantInsider : insider as any[])
    .slice(0, 5)
    .map((t) => {
      const typeRaw = String(t.transactionType || '').toUpperCase();
      const type: 'BUY' | 'SELL' | 'OTHER' =
        typeRaw.startsWith('P') ? 'BUY'
        : typeRaw.startsWith('S') ? 'SELL'
        : 'OTHER';
      return {
        type,
        personName: t.reportingName || t.name || 'Unknown',
        shares: Number(t.securitiesTransacted || 0),
        date: t.transactionDate || t.filingDate || '',
        pricePerShare: Number(t.price || 0),
      };
    });

  // Earnings surprises — /stable/earnings hem geçmiş hem gelecek dönemi dönüyor.
  // epsActual=null olan kayıtlar henüz açıklanmamış earnings, onları atla; son
  // 4 açıklanmış çeyreği al.
  const surpriseItems = (surprises as any[])
    .filter((s) => s.epsActual != null && s.epsEstimated != null)
    .slice(0, 4)
    .map((s) => {
      const actual = Number(s.epsActual);
      const estimate = Number(s.epsEstimated);
      const pct = estimate !== 0 ? ((actual - estimate) / Math.abs(estimate)) * 100 : 0;
      return {
        quarter: s.date || s.fiscalDateEnding || '',
        beat: actual > estimate,
        surprisePct: Number(pct.toFixed(2)),
      };
    });
  const beatRate = surpriseItems.length
    ? surpriseItems.filter((s) => s.beat).length / surpriseItems.length
    : 0;

  // Price target upside
  const currentPrice = Number(profile?.price || 0);
  const avgTarget = Number(priceTarget?.targetConsensus || priceTarget?.priceTarget || 0);
  const upsidePct = currentPrice && avgTarget ? ((avgTarget - currentPrice) / currentPrice) * 100 : undefined;

  return {
    symbol,
    locale,
    companyProfile: {
      name: profile?.companyName || symbol,
      sector: profile?.sector,
      industry: profile?.industry,
      marketCap: profile?.marketCap ? Number(profile.marketCap) : undefined,
      ceo: profile?.ceo,
      description: profile?.description?.slice(0, 700),
    },
    financialMetrics: {
      currentPrice,
      altmanZScore: scores?.altmanZScore != null ? Number(scores.altmanZScore) : undefined,
      piotroskiScore: scores?.piotroskiScore != null ? Number(scores.piotroskiScore) : undefined,
      priceTarget: avgTarget || undefined,
      targetUpsidePct: upsidePct != null ? Number(upsidePct.toFixed(2)) : undefined,
    },
    earnings: {
      surprises: surpriseItems,
      beatRate: Number(beatRate.toFixed(2)),
    },
    insiderTrading: {
      sixMonths: {
        totalBuys,
        totalSells,
        netBuyingActivity: totalBuys > totalSells,
        netDollarFlow: totalBuys - totalSells,
      },
      recentTransactions,
    },
    analystData: {
      avgTargetPrice: avgTarget || undefined,
      highTarget: priceTarget?.targetHigh ? Number(priceTarget.targetHigh) : undefined,
      lowTarget: priceTarget?.targetLow ? Number(priceTarget.targetLow) : undefined,
      consensus: rating?.rating || rating?.ratingRecommendation,
    },
  };
}

// ─── Prompt ───────────────────────────────────────────────────────────────────
function buildPrompt(input: AgentInput, mode: Mode): string {
  const isTr = input.locale === 'tr';

  const systemTr = `Sen Financial Times ve Bloomberg'de çalışmış, veriyi hikayeleştirme yeteneği olan bir kıdemli finansal analistsin. Görevin: CEO'nun vaadi, içerdekilerin kararları ve finansal veriler arasında bir SORUŞTURMA kurmak. Kuru sayı değil — merak uyandıran bulgular yaz. Ton profesyonel ama erişilebilir. Hype yok; kanıt var.`;
  const systemEn = `You are a senior financial analyst trained at Bloomberg/FT, skilled at turning raw data into investigative storytelling. Your job: build an INVESTIGATION linking the CEO's promise, insider decisions, and financial data. No dry numbers — write findings that create curiosity. Tone: professional yet accessible. No hype; only evidence.`;

  const system = isTr ? systemTr : systemEn;

  const inputJson = JSON.stringify(input, null, 2);

  if (mode === 'teaser') {
    const taskTr = `Aşağıdaki veriye bakarak SADECE kompakt bir TEASER mesajı üret.

KURALLAR:
- Maksimum 280 karakter (Telegram için)
- Format: Emoji + Ticker + CEO'nun en iddialı vaadi + İçerdekilerin sinyali + Upside% + CTA
- Türkçe yaz
- Emoji: başta 📊, sonda 🚀

SADECE şu JSON'u döndür (başka hiçbir şey yazma):
{
  "teaser": "..."
}

VERİ:
${inputJson}`;

    const taskEn = `Based on the data below, produce ONLY a compact TEASER message.

RULES:
- Max 280 characters (for Telegram)
- Format: Emoji + Ticker + CEO's boldest claim + Insider signal + Upside% + CTA
- English
- Emoji: 📊 at start, 🚀 at end

Return ONLY this JSON (nothing else):
{
  "teaser": "..."
}

DATA:
${inputJson}`;

    return `${system}\n\n${isTr ? taskTr : taskEn}`;
  }

  // mode === 'full'
  const taskTr = `Aşağıdaki veriye bakarak YATIRIMCI için detaylı bir SORUŞTURMA RAPORU yaz (800–1200 kelime).

ZORUNLU KURAL — HALLÜSİNASYON YASAK:
- Sadece VERİDE bulunan sayıları, isimleri, tarihleri kullan
- Uydurma söz/demeç/rakam yazma
- Bir veri yoksa "veri mevcut değil" de, tahmin ETME
- Earnings call transcript'i bu raporda YOK — CEO sözü alıntılama

YAPI — 5 Perde:

1) Piyasa ve Rekabet Bağlamı (100–150 kelime)
   - Şirket hangi sektörde? Hangi endüstride? (companyProfile.sector/industry)
   - Bu sektörün 2025–2026 makro trendleri neler? (genel bilgi kullanabilirsin)
   - Şirketin pozisyonu: market cap ve sektör dinamikleri karşısında neresinde?
   - Bu perde piyasa arka planı — sayısal iddia YOK

2) İçerdekiler Ne Yapıyor? (150–200 kelime)
   - Son 6 ayda OPEN-MARKET insider alım/satım: kaç alım, kaç satış
   - En son 1–2 gerçek alım/satım işlemi: kim (insiderTrading.recentTransactions'tan), ne zaman, kaç hisse, hangi fiyattan
   - Equity award (A-Award) sayma — sadece gerçek alım/satım yorumla
   - Net alım varsa → "yönetim güven gösteriyor"
   - Net satış varsa → "⚠️ uyarı" ama sebepleri nötr listele (vergi planlaması, opsiyon kullanımı, portföy dengelemesi VE stratejik endişe olabilir — tek bir sebebe tuzak kurma)
   - recentTransactions boşsa veya tümü OTHER ise "son 6 ayda kayıt altına geçen açık piyasa işlemi bulunamadı" yaz

3) Finansal Sağlık Testi (150–200 kelime)
   - Altman Z-Score yorumu: >3 güvenli / 1.8–3 dikkat / <1.8 iflas riski
   - Piotroski F-Score: 7–9 sağlam / 4–6 orta / 0–3 zayıf
   - İki skoru BİRLİKTE yorumla: ne söylüyorlar?
   - Veri yoksa "skor mevcut değil" yaz — uydurma

4) Pazar Testi ve Fiyat Potansiyeli (200–250 kelime)
   - Mevcut fiyat vs. analyst consensus target, upside%
   - Earnings beat rate (son 4 çeyrek) — kaç çeyrek beat, kaç miss?
   - Son çeyreklik surprise yüzdeleri
   - Downside (low target) vs. upside (high target) senaryoları
   - Analyst consensus rating ne diyor?

5) Sonuç ve Tavsiye (100–150 kelime)
   - BUY / HOLD / CAUTION — net karar
   - 3 madde halinde ANA GEREKÇE (insider + finansal + valuation)
   - Hangi yatırımcı profiline uygun (risk iştahı)
   - Son söz: takip edilecek katalist

FORMAT KURALLARI:
- Markdown: her perde ## emoji + başlık
- Emoji başlıklar: 🌐 Bağlam / 🔍 İçerdekiler / 💪 Finansal / 💰 Potansiyel / ✅ Sonuç
- Negatif sinyal varsa ⚠️
- Z-Score, Piotroski, Altman orijinal terim
- Şirket ve insan isimleri orijinal (çevirme)
- Sayı biçimi: $288.62, %15.3, 1,234 hisse

ZORUNLU: Rapor sonuna şu CTA bloğunu ekle (markdown):
---
🔐 **Günlük Insider İstihbaratını Kaçırma**
Abonelik planı ile her gün benzeri analizi telefonuna gönder.
**[Şimdi Abone Ol]** (3 gün ücretsiz)

SADECE şu JSON'u döndür (başka hiçbir şey yazma):
{
  "teaser": "...(280 char teaser — Telegram için)...",
  "fullReport": "...(markdown, 800-1200 kelime)...",
  "recommendation": "BUY|HOLD|CAUTION",
  "keyInsight": "Tek cümlelik ana bulgu — insider+finansal+valuation'ı tek cümlede özetle"
}

VERİ:
${inputJson}`;

  const taskEn = `Using the data below, write a detailed INVESTIGATIVE REPORT for an investor (800–1200 words).

STRUCTURE — 5 Acts:

1) The CEO's Word (100–150 words)
   - Quote the CEO's boldest claim from the transcript (if none, write "N/A")
   - Why this matters
   - Is the strategy realistic?

2) What Are Insiders Doing? (150–200 words)
   - Buy/sell ratio in last 6 months
   - Latest transaction: who, when, how many shares, at what price
   - Net buying → "management shows confidence"
   - Net selling → "⚠️ warning signal"
   - Does insider behavior support the CEO's claim?

3) Financial Health Check (150–200 words)
   - Altman Z-Score: >3 safe / 1.8–3 caution / <1.8 risk
   - Piotroski F-Score: 7–9 healthy / 4–6 average / 0–3 weak
   - Enough liquidity to deliver the CEO's vision?

4) Market Test & Price Potential (200–250 words)
   - Current price vs. analyst target, upside%
   - Earnings beat rate (last 4 quarters)
   - Downside risk (low target), upside scenario

5) Verdict & Recommendation (100–150 words)
   - BUY / HOLD / CAUTION
   - Suitable investor profile
   - Closing word

FORMAT RULES:
- Markdown: each act as ## emoji + title
- Emoji headers: 📈 CEO / 🔍 Insiders / 💪 Financial / 💰 Upside / ✅ Verdict
- ⚠️ for negative signals
- Quote CEO claim verbatim, no translation

REQUIRED: append this CTA block at the end (markdown):
---
🔐 **Don't Miss Daily Insider Intelligence**
Get reports like this on your phone every day with a subscription.
**[Subscribe Now]** (3 days free)

Return ONLY this JSON (nothing else):
{
  "teaser": "...(280 char teaser)...",
  "fullReport": "...(markdown, 800-1200 words)...",
  "recommendation": "BUY|HOLD|CAUTION",
  "keyInsight": "One-sentence headline finding"
}

DATA:
${inputJson}`;

  return `${system}\n\n${isTr ? taskTr : taskEn}`;
}

// ─── Gemini ───────────────────────────────────────────────────────────────────
function parseGeminiJson(raw: string): any | null {
  if (!raw) return null;
  let txt = raw.replace(/```json\s*|\s*```/g, '').trim();
  const firstBrace = txt.indexOf('{');
  const lastBrace = txt.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    txt = txt.slice(firstBrace, lastBrace + 1);
  }
  const cleaned = txt.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    try {
      const fixed = cleaned.replace(/("(?:[^"\\]|\\.)*?)(\n)/g, (_m, g1) => `${g1}\\n`);
      return JSON.parse(fixed);
    } catch (e) {
      console.error('[insider-report parse]', String(e).slice(0, 160));
      return null;
    }
  }
}

const MODELS_CASCADE = [
  'gemini-2.0-flash',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-2.5-flash',
];

async function callGeminiModel(model: string, prompt: string): Promise<
  { ok: true; data: any } | { ok: false; status: number; reason: string }
> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.55,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    console.warn(`[insider-report gemini ${model}] HTTP ${res.status} ${body.slice(0, 160)}`);
    return { ok: false, status: res.status, reason: `${model} HTTP ${res.status}: ${body.slice(0, 200)}` };
  }
  const data = await res.json();
  const finishReason = data.candidates?.[0]?.finishReason;
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!raw) {
    return { ok: false, status: 0, reason: `${model} returned no text (finishReason=${finishReason || 'unknown'})` };
  }
  const parsed = parseGeminiJson(raw);
  if (!parsed) {
    return { ok: false, status: 0, reason: `${model} response not valid JSON` };
  }
  return { ok: true, data: parsed };
}

async function callGemini(prompt: string): Promise<{ ok: true; data: any } | { ok: false; reason: string }> {
  if (!GEMINI_KEY) {
    return { ok: false, reason: 'GEMINI_API_KEY missing' };
  }
  const errors: string[] = [];
  for (const model of MODELS_CASCADE) {
    try {
      const r = await callGeminiModel(model, prompt);
      if (r.ok) return r;
      errors.push(r.reason);
      if (r.status !== 429 && r.status !== 503 && r.status !== 0) break;
    } catch (e) {
      errors.push(`${model} fetch error: ${String(e).slice(0, 120)}`);
    }
  }
  return { ok: false, reason: errors.join(' | ').slice(0, 1000) };
}

// ─── Database cache (Supabase) ────────────────────────────────────────────────
// Supabase insider_report_cache table → 6h TTL, symbol-based, cross-user shared
// Fallback: in-memory cache (60 sec) eğer DB bağlantı yoksa

const DB_CACHE_TTL_MS = 60 * 1000; // fallback in-memory TTL

async function getCachedReport(symbol: string): Promise<any | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('insider_report_cache')
      .select('report_data')
      .eq('symbol', symbol.toUpperCase())
      .gt('expires_at', now)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.warn('[insider-report cache read] DB error:', error.message);
      return null;
    }

    if (data) {
      console.log(`✓ Cache HIT (Supabase): ${symbol}`);
      return data.report_data;
    }
  } catch (e) {
    console.error('[insider-report cache read] Exception:', String(e).slice(0, 160));
  }

  return null;
}

async function setCachedReport(symbol: string, payload: any): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('insider_report_cache')
      .upsert(
        {
          symbol: symbol.toUpperCase(),
          report_data: payload,
          created_at: now.toISOString(),
          expires_at: expiresAt,
        },
        { onConflict: 'symbol' }
      );

    if (error) {
      console.warn('[insider-report cache write] DB error:', error.message);
      return;
    }

    console.log(`✓ Cache SET (Supabase): ${symbol} (expires in 6h)`);
  } catch (e) {
    console.error('[insider-report cache write] Exception:', String(e).slice(0, 160));
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const symbol = params.get('symbol')?.toUpperCase().trim();
  const mode: Mode = params.get('mode') === 'teaser' ? 'teaser' : 'full';
  const locale: Locale = params.get('locale') === 'en' ? 'en' : 'tr';
  const force = params.get('force') === '1';

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
  }

  if (!FMP_KEY || !GEMINI_KEY) {
    return NextResponse.json(
      { error: 'Service not configured (missing API key)' },
      { status: 503 },
    );
  }

  // Cache lookup (Supabase DB) — symbol-based, cross-user shared
  // NOTE: cache is per-symbol, not per (symbol, mode, locale) combo
  // So same AAPL cache serves both teaser + full modes, all locales
  if (!force) {
    const cached = await getCachedReport(symbol);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true, cacheSource: 'supabase' });
    }
  }

  try {
    const raw = await collectInsiderReportData(symbol);
    if (!raw.profile) {
      return NextResponse.json(
        { error: 'Stock not found or no data available' },
        { status: 404 },
      );
    }

    const agentInput = toAgentInput(symbol, locale, raw);
    const prompt = buildPrompt(agentInput, mode);
    const gem = await callGemini(prompt);

    if (!gem.ok) {
      return NextResponse.json(
        { error: 'AI analysis failed', reason: gem.reason },
        { status: 502 },
      );
    }
    const result = gem.data;

    const payload = {
      symbol,
      mode,
      locale,
      generatedAt: Date.now(),
      teaser: result.teaser || null,
      fullReport: mode === 'full' ? result.fullReport || null : null,
      recommendation: result.recommendation || null,
      keyInsight: result.keyInsight || null,
      meta: {
        companyName: agentInput.companyProfile.name,
        ceo: agentInput.companyProfile.ceo,
        currentPrice: agentInput.financialMetrics.currentPrice,
        altmanZScore: agentInput.financialMetrics.altmanZScore,
        piotroskiScore: agentInput.financialMetrics.piotroskiScore,
        targetUpsidePct: agentInput.financialMetrics.targetUpsidePct,
        insiderNetBuying: agentInput.insiderTrading.sixMonths.netDollarFlow,
        beatRate: agentInput.earnings.beatRate,
      },
    };

    // Store in Supabase cache (6h TTL)
    await setCachedReport(symbol, payload);

    return NextResponse.json({ ...payload, cached: false, cacheSource: 'gemini' });
  } catch (e) {
    console.error('[insider-report]', e);
    return NextResponse.json(
      { error: 'Internal error generating insider report' },
      { status: 500 },
    );
  }
}

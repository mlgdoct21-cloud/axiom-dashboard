import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSecFilingsData } from '@/lib/sec-edgar';
import YahooFinance from 'yahoo-finance2';
import { isBISTAsync } from '@/lib/bist-detect-server';
import { toYahooSymbol, BIST_COMPANY_NAMES } from '@/lib/bist-symbols';

const yfBist = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

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
    secFilingsRes,
  ] = await Promise.allSettled([
    fmp('profile', { symbol }),
    fmp('financial-scores', { symbol }),
    fmp('insider-trading/search', { symbol, page: '0', limit: '100' }),
    fmp('insider-trading/statistics', { symbol }),
    fmp('earnings', { symbol, limit: '12' }),
    fmp('price-target-consensus', { symbol }),
    fmp('ratings-snapshot', { symbol }),
    getSecFilingsData(symbol), // SEC.gov — 10-K (Item 7) + 10-Q (Item 2), free
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
  const secFilings = pick(secFilingsRes) ?? { annual: null, quarterly: null };

  return { profile, scores, insider, insiderStats, surprises: surprisesRaw, priceTarget, rating, secFilings };
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
  secFilings: {
    annual: string | null;    // 10-K MD&A (Item 7)
    quarterly: string | null; // 10-Q MD&A (Item 2)
  };
};

function toAgentInput(symbol: string, locale: Locale, raw: any): AgentInput {
  const { profile, scores, insider, insiderStats, surprises, priceTarget, rating, secFilings } = raw;

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
    secFilings: {
      annual: secFilings?.annual ?? null,
      quarterly: secFilings?.quarterly ?? null,
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

YAPI — 6 Perde:

1) Piyasa ve Rekabet Bağlamı (100–150 kelime)
   - Şirket hangi sektörde? Hangi endüstride? (companyProfile.sector/industry)
   - Bu sektörün 2025–2026 makro trendleri neler? (genel bilgi kullanabilirsin)
   - Şirketin pozisyonu: market cap ve sektör dinamikleri karşısında neresinde?
   - Bu perde piyasa arka planı — sayısal iddia YOK

2) Yönetim Resmi Söylüyor Ki… (100–150 kelime)
   - secFilings.annual → SEC 10-K yıllık rapordaki MD&A: yönetim büyük resimde ne söylüyor?
   - secFilings.quarterly → SEC 10-Q çeyreklik rapordaki MD&A: son 3 aydaki tablo nedir?
   - İki rapor arasında tutarsızlık var mı? (yıllık iyimser, çeyreklik kötümser → ⚠️)
   - Her iki alan da null ise: "SEC 10-K/10-Q verisi bu hisse için alınamadı" yaz, perde'yi atla
   - SADECE alıntıdaki bilgiyi yaz — yorum ekleme, uydurma yapma

3) İçerdekiler Ne Yapıyor? (150–200 kelime)
   - Son 6 ayda OPEN-MARKET insider alım/satım: kaç alım, kaç satış
   - En son 1–2 gerçek alım/satım işlemi: kim (insiderTrading.recentTransactions'tan), ne zaman, kaç hisse, hangi fiyattan
   - Equity award (A-Award) sayma — sadece gerçek alım/satım yorumla
   - Net alım varsa → "yönetim güven gösteriyor"
   - Net satış varsa → "⚠️ uyarı" ama sebepleri nötr listele (vergi planlaması, opsiyon kullanımı, portföy dengelemesi VE stratejik endişe olabilir — tek bir sebebe tuzak kurma)
   - recentTransactions boşsa veya tümü OTHER ise "son 6 ayda kayıt altına geçen açık piyasa işlemi bulunamadı" yaz
   - SEC verisi varsa: "Yönetim 10-K/10-Q'da X dedi — insider davranışı bununla UYUMLU MU?" sorusunu yanıtla

4) Finansal Sağlık Testi (150–200 kelime)
   - Altman Z-Score yorumu: >3 güvenli / 1.8–3 dikkat / <1.8 iflas riski
   - Piotroski F-Score: 7–9 sağlam / 4–6 orta / 0–3 zayıf
   - İki skoru BİRLİKTE yorumla: ne söylüyorlar?
   - Veri yoksa "skor mevcut değil" yaz — uydurma

5) Pazar Testi ve Fiyat Potansiyeli (200–250 kelime)
   - Mevcut fiyat vs. analyst consensus target, upside%
   - Earnings beat rate (son 4 çeyrek) — kaç çeyrek beat, kaç miss?
   - Son çeyreklik surprise yüzdeleri
   - Downside (low target) vs. upside (high target) senaryoları
   - Analyst consensus rating ne diyor?

6) Sonuç ve Tavsiye (100–150 kelime)
   - BUY / HOLD / CAUTION — net karar
   - 3 madde halinde ANA GEREKÇE (insider + SEC beyanı + valuation)
   - Hangi yatırımcı profiline uygun (risk iştahı)
   - Son söz: takip edilecek katalist

FORMAT KURALLARI:
- Markdown: her perde ## emoji + başlık
- Emoji başlıklar: 🌐 Bağlam / 📋 Yönetim Beyanı / 🔍 İçerdekiler / 💪 Finansal / 💰 Potansiyel / ✅ Sonuç
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

STRUCTURE — 6 Acts:

1) Market & Competitive Context (100–150 words)
   - Sector, industry, macro trends 2025–2026
   - Company's position by market cap

2) What Management Officially Says (100–150 words)
   - secFilings.annual → 10-K annual MD&A: big-picture strategy
   - secFilings.quarterly → 10-Q quarterly MD&A: latest quarter tone
   - Is there a gap between annual optimism and quarterly reality? (→ ⚠️ if so)
   - If both are null: write "SEC 10-K/10-Q data unavailable for this ticker" and skip act
   - ONLY use what is in the excerpts — no invention

3) What Are Insiders Doing? (150–200 words)
   - Buy/sell ratio in last 6 months
   - Latest transaction: who, when, how many shares, at what price
   - Net buying → "management shows confidence"
   - Net selling → "⚠️ warning signal"
   - If SEC data available: "Management said X in 10-K/10-Q — does insider behavior ALIGN?"

4) Financial Health Check (150–200 words)
   - Altman Z-Score: >3 safe / 1.8–3 caution / <1.8 risk
   - Piotroski F-Score: 7–9 healthy / 4–6 average / 0–3 weak
   - Read both scores together

5) Market Test & Price Potential (200–250 words)
   - Current price vs. analyst target, upside%
   - Earnings beat rate (last 4 quarters)
   - Downside risk (low target), upside scenario

6) Verdict & Recommendation (100–150 words)
   - BUY / HOLD / CAUTION
   - 3 key reasons (insider + SEC statement + valuation)
   - Suitable investor profile
   - Closing word

FORMAT RULES:
- Markdown: each act as ## emoji + title
- Emoji headers: 🌐 Context / 📋 Management / 🔍 Insiders / 💪 Financial / 💰 Upside / ✅ Verdict
- ⚠️ for negative signals

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

/**
 * Compound cache key: SYMBOL::LOCALE::MODE
 *
 * Why composite: a single Gemini call produces (locale, mode)-specific text.
 * - TR teaser ≠ EN teaser (language)
 * - teaser ≠ full (length, format)
 *
 * The Supabase table's `symbol` column is the PK; we encode the tuple into it
 * so no schema migration is needed. TR is the default (TR-first product),
 * EN/other locales get separate cache entries.
 *
 * Examples:
 *   "GARAN::tr::full"      ← Türkçe tam rapor (varsayılan)
 *   "GARAN::tr::teaser"    ← Türkçe Telegram teaser
 *   "GARAN::en::full"      ← English full report
 *   "AAPL::tr::full"       ← Türkçe AAPL raporu (US sembolü, çevirisi)
 */
function cacheKey(symbol: string, locale: Locale, mode: Mode): string {
  return `${symbol.toUpperCase()}::${locale}::${mode}`;
}

async function getCachedReport(symbol: string, locale: Locale, mode: Mode): Promise<any | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const key = cacheKey(symbol, locale, mode);

  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('insider_report_cache')
      .select('report_data')
      .eq('symbol', key)
      .gt('expires_at', now)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.warn('[insider-report cache read] DB error:', error.message);
      return null;
    }

    if (data) {
      console.log(`✓ Cache HIT (Supabase): ${key}`);
      return data.report_data;
    }
  } catch (e) {
    console.error('[insider-report cache read] Exception:', String(e).slice(0, 160));
  }

  return null;
}

async function setCachedReport(
  symbol: string, payload: any, locale: Locale, mode: Mode
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const key = cacheKey(symbol, locale, mode);

  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('insider_report_cache')
      .upsert(
        {
          symbol: key,
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

    console.log(`✓ Cache SET (Supabase): ${key} (expires in 6h)`);
  } catch (e) {
    console.error('[insider-report cache write] Exception:', String(e).slice(0, 160));
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────
// ─── BIST adapter ────────────────────────────────────────────────────────────
// FMP/SEC EDGAR don't cover BIST. For Turkish stocks we build the same payload
// shape using yahoo-finance2 (profile + summary stats + recent news) and let
// Gemini synthesize a CEO-vs-truth style narrative. Insider trading data is
// not available — we mark it explicitly in the prompt.
async function generateBISTInsiderReport(
  symbol: string, mode: Mode, locale: Locale
): Promise<any | null> {
  if (!GEMINI_KEY) return null;

  let summary: any = null;
  let newsRes: any[] = [];
  try {
    [summary, newsRes] = await Promise.all([
      yfBist.quoteSummary(toYahooSymbol(symbol), {
        modules: ['summaryProfile', 'price', 'summaryDetail', 'defaultKeyStatistics', 'financialData'],
      }).catch(() => null),
      yfBist.search(symbol, { quotesCount: 0, newsCount: 8 }).then(r => r.news || []).catch(() => []),
    ]);
  } catch (e) {
    console.warn('[insider-report/bist]', (e as Error).message);
  }
  if (!summary) return null;

  const profile = summary.summaryProfile || {};
  const price = summary.price || {};
  const fin = summary.financialData || {};
  const stats = summary.defaultKeyStatistics || {};
  const detail = summary.summaryDetail || {};

  const companyName = price.longName || price.shortName || BIST_COMPANY_NAMES[symbol] || symbol;
  const officers = (profile.companyOfficers || []) as any[];
  const ceo = officers.find(o => /CEO|Chief Executive|Genel M/i.test(o.title || ''))?.name
    || officers[0]?.name || 'Bilinmiyor';
  const currentPrice = Number(price.regularMarketPrice ?? 0);
  const targetMean = Number(fin.targetMeanPrice ?? 0);
  const targetUpside = currentPrice && targetMean ? ((targetMean - currentPrice) / currentPrice * 100) : null;
  const recentNews = (newsRes || []).slice(0, 5).map((n: any) => ({
    title: n.title,
    publisher: n.publisher,
    publishTime: n.providerPublishTime,
  }));

  const ctx = {
    symbol,
    market: 'BIST',
    company: companyName,
    sector: profile.sector || 'N/A',
    industry: profile.industry || 'N/A',
    description: (profile.longBusinessSummary || '').slice(0, 600),
    ceo,
    currentPrice,
    currency: price.currency || 'TRY',
    marketCap: Number(price.marketCap ?? 0),
    pe: Number(detail.trailingPE ?? stats.trailingPE ?? 0) || null,
    forwardPE: Number(detail.forwardPE ?? stats.forwardPE ?? 0) || null,
    roe: Number(fin.returnOnEquity ?? 0) || null,
    profitMargin: Number(fin.profitMargins ?? 0) || null,
    revenueGrowth: Number(fin.revenueGrowth ?? 0) || null,
    targetMean: targetMean || null,
    targetUpsidePct: targetUpside,
    beta: Number(stats.beta ?? 0) || null,
    fiftyTwoWeekHigh: Number(detail.fiftyTwoWeekHigh ?? 0) || null,
    fiftyTwoWeekLow: Number(detail.fiftyTwoWeekLow ?? 0) || null,
    recentNews,
  };

  const dataJson = JSON.stringify(ctx, null, 2);

  // ── System persona ────────────────────────────────────────────────
  const systemTr = `Sen Bloomberg HT ve Financial Times Türkiye'de yetişmiş, BIST'i 15 yıl izlemiş kıdemli bir finansal analistsin. Görevin: kuru sayıları HİKÂYEYE çevirmek — şirketin profili, kamuya açık beyanları, son haber akışı ve finansal sağlığı arasında bir SORUŞTURMA kurmak. Ton: profesyonel, kanıt-temelli, merak uyandıran. Ne hype ne de kötümserlik — VERİ konuşur, sen sadece bağlamı kurarsın.`;
  const systemEn = `You are a senior financial analyst trained at Bloomberg HT and FT Türkiye, with 15 years covering BIST. Your job: turn raw numbers into a STORY — connecting the company's profile, public statements, news flow, and financial health into an INVESTIGATION. Tone: professional, evidence-based, curiosity-inducing. No hype, no doom — DATA speaks; you only build the context.`;
  const system = locale === 'tr' ? systemTr : systemEn;

  // ── Anti-hallucination rules (mandatory, repeated for emphasis) ──
  const guardrailsTr = `🚫 ZORUNLU KURAL — HALÜSİNASYON YASAK:
1. SADECE aşağıdaki "VERİ" bloğunda bulunan SAYILARI, İSİMLERİ, ORANLARI, TARİHLERİ kullan.
2. Veride OLMAYAN bir rakam, isim, tarih veya oran UYDURMA. Yaklaşık değer yazma.
3. CEO sözü, yönetim beyanı, basın açıklaması ALINTILAMA — bunlar veride yok. Yalnızca recentNews başlıklarını DOĞRUDAN aktarabilirsin (yorumla, ama metni değiştirme).
4. KAP duyuruları, SPK kararları, bilanço açıklama tarihleri veride YOK — bunlardan bahsetme.
5. Earnings call / analyst day transcript YOK — yöneticinin "ne söylediği" hakkında SPEKÜLASYON YAPMA.
6. Insider trading / içerden alım-satım verisi BIST için MEVCUT DEĞİL (KAP üzerinden takip edilir, biz çekmiyoruz). Bu maddeyi açıkça belirt, "şu kadar alım yaptılar" gibi UYDURMA YAZMA.
7. Sektör trendleri için genel bilgi kullanabilirsin AMA spesifik istatistik/oran uydurma. "Türkiye perakende sektörü genelde dijitalleşiyor" OK; "sektör %X büyüdü" yasak (kaynak yoksa).
8. Bir alan null/0 ise "veri mevcut değil" yaz, perde'yi atla. Tahmin etme.
9. Beta, P/E, ROE gibi her sayıyı parantez içinde GERÇEK değerle ver: "ROE %28.6 ile sektör ortalamasının üstünde" — sayıyı veriden al.
10. RAKAMLARDA hata yapma: ROE 0.286 ise "%28.6" yaz, "%286" değil. P/E 5.12 ise "5.1x" yaz, "%5.1" değil.`;
  const guardrailsEn = `🚫 MANDATORY — NO HALLUCINATION:
1. Use ONLY numbers, names, ratios, dates from the DATA block below.
2. Do NOT invent figures, names, dates, or ratios. No "approximations".
3. Do NOT quote CEO statements, press releases, or management commentary — they are NOT in the data. You may reference recentNews headlines verbatim.
4. KAP filings, SPK rulings, earnings dates are NOT in data — do not mention them.
5. Earnings call / analyst day transcripts are NOT available — do NOT speculate about what management "said".
6. Insider trading data is NOT available for BIST (tracked via KAP separately). State this explicitly; do NOT invent buy/sell counts.
7. You may use general sector knowledge but do NOT invent statistics. "Turkish retail is digitizing" OK; "sector grew X%" forbidden if no source.
8. If a field is null/0, write "data unavailable" and skip the act. Do not guess.
9. Cite each number in parentheses with actual data values.
10. Format ratios correctly: ROE 0.286 → "28.6%", not "286%". P/E 5.12 → "5.1x", not "5.1%".`;
  const guardrails = locale === 'tr' ? guardrailsTr : guardrailsEn;

  // ── Teaser mode (Telegram-friendly, 280 chars) ────────────────────
  if (mode === 'teaser') {
    const taskTr = `${guardrails}

GÖREV: Aşağıdaki veriden 280 karakterlik kompakt bir BIST teaser üret.

KURALLAR:
- Maksimum 280 karakter (Telegram için)
- Format: 📊 + ${symbol} + en çarpıcı veri noktası (target upside% VEYA P/E uçtaysa VEYA revenueGrowth dikkat çekiyorsa) + AL/SAT/TUT/İZLE ile bitir + 🚀
- Türkçe yaz
- VERİDEKI sayıları kullan (uydurma yok)

SADECE şu JSON'u döndür (başka hiçbir şey ekleme):
{
  "teaser": "...(280 karakter)...",
  "recommendation": "AL|SAT|TUT|İZLE",
  "keyInsight": "Tek cümlelik ana bulgu — sayısal kanıtla"
}

VERİ:
${dataJson}`;

    const taskEn = `${guardrails}

TASK: Produce a compact 280-character BIST teaser from the data below.

RULES:
- Max 280 characters (Telegram)
- Format: 📊 + ${symbol} + most striking data point + AL/SAT/TUT/İZLE close + 🚀
- English
- Use ONLY data values

Return ONLY this JSON:
{
  "teaser": "...(280 char)...",
  "recommendation": "AL|SAT|TUT|İZLE",
  "keyInsight": "One-sentence key finding"
}

DATA:
${dataJson}`;

    return `${system}\n\n${locale === 'tr' ? taskTr : taskEn}`;
  }

  // ── Full mode: 6-act investigative narrative ──────────────────────
  const taskTr = `${guardrails}

GÖREV: BIST yatırımcısı için 600–900 kelimelik bir SORUŞTURMA RAPORU yaz. Hikâye akışı 6 perde halinde — her perde önceki ile bağlantılı, sayılar parantez içinde, kanıt zinciri kuruyor.

📋 YAPI — 6 PERDE:

**1) 🌐 Piyasa Sahnesi & Rekabet Konumu** (~100 kelime)
   - Şirket hangi sektörde? (ctx.sector / ctx.industry)
   - Türkiye'de bu sektörün 2025–2026 makro arka planı (genel bilgi — spesifik istatistik UYDURMA)
   - Şirketin pozisyonu: ₺${(ctx.marketCap / 1e9).toFixed(0)}B piyasa değeri sektördeki büyüklüğü gösteriyor mu?
   - SAYISAL İDDİA YOK — sahne kuruyorsun

**2) 📋 Şirketin Yüzü** (~100 kelime)
   - ctx.description'dan tüm temel iş modelini özetle (1-2 cümle)
   - CEO: ${ctx.ceo === 'Bilinmiyor' ? '"Veride mevcut değil"' : ctx.ceo} — yorumla DEMEDIĞINI yazma
   - "Beta ${ctx.beta?.toFixed(2) || 'N/A'}" → piyasaya göre volatilite (1'in altında defansif, 1.5+ saldırgan)
   - 52 haftalık aralık ile mevcut fiyat: anlamlı yer mı (dipte/tepede/orta)?

**3) 📰 Son Haber Akışı** (~120 kelime)
   - recentNews dizisi (varsa son ${ctx.recentNews.length} haber)
   - Başlıkları VERBATIM aktar (yayıncı + tarih), sadece BİR cümle yorum ekle
   - Haber yoksa: "Yahoo Finance üzerinden son haftalarda dikkat çekici haber akışı tespit edilmedi" yaz, perde kısaltabilirsin
   - SAKIN haber UYDURMA

**4) 💪 Finansal Sağlık Testi** (~150 kelime)
   - F/K (P/E TTM): ${ctx.pe?.toFixed(2) || 'veri yok'} — düşük (<10 cazip), orta (10–25 normal), yüksek (>30 dikkat)
   - İleriye dönük F/K: ${ctx.forwardPE?.toFixed(2) || 'veri yok'} — TTM'den düşükse büyüme bekleniyor
   - ROE: ${ctx.roe ? (ctx.roe * 100).toFixed(1) + '%' : 'veri yok'} — sermayenin verimliliği (>%15 güçlü)
   - Net kâr marjı: ${ctx.profitMargin ? (ctx.profitMargin * 100).toFixed(1) + '%' : 'veri yok'}
   - Gelir büyümesi (YoY): ${ctx.revenueGrowth ? (ctx.revenueGrowth * 100).toFixed(1) + '%' : 'veri yok'}
   - Bu rakamların BİRLEŞİK hikâyesi: ucuz ve büyüyor mu? Pahalı ama kârlı mı? Vasat mı?

**5) 🎯 Pazar Testi & Fiyat Potansiyeli** (~150 kelime)
   - Mevcut fiyat: ₺${ctx.currentPrice?.toFixed(2)}
   - Analist hedef ortalaması: ${ctx.targetMean ? '₺' + ctx.targetMean.toFixed(2) : 'veri yok'}
   - Hedef-üstü potansiyel: ${ctx.targetUpsidePct != null ? ctx.targetUpsidePct.toFixed(1) + '%' : 'hesaplanamadı'}
   - 52 hafta yüksek/düşük: ₺${ctx.fiftyTwoWeekLow?.toFixed(2) || '?'} – ₺${ctx.fiftyTwoWeekHigh?.toFixed(2) || '?'}
   - Mevcut fiyat 52 haftalık aralığın neresinde? (zirvede / dipte / orta)
   - Bu pozisyonun anlamı: momentum mu, geri çekilme fırsatı mı, balon mu?

**6) ✅ Sonuç & Tavsiye** (~80 kelime)
   - **AL / SAT / TUT / İZLE** — net karar
   - 3 madde halinde ANA GEREKÇE (her biri PARANTEZLİ rakamla):
     • Finansal: (P/E ${ctx.pe?.toFixed(1)} + ROE)
     • Pazar: (target upside ${ctx.targetUpsidePct?.toFixed(0)}%)
     • Risk: (Beta ${ctx.beta?.toFixed(2)} + Türkiye makro/kur riski)
   - Hangi yatırımcıya uygun (uzun vadeli değer / momentum / agresif)
   - Takip edilecek katalist (next earnings, KAP duyurusu)

⚠️ ZORUNLU KAPANIŞ NOTU (rapor sonuna yapıştır):
> 📌 *Bu rapor BIST verisi için Yahoo Finance + son haber akışı + finansal oranlar üzerinden üretilmiştir. SEC EDGAR / FMP insider trading verisi BIST hisseleri için mevcut değildir; içerden alım-satım hareketleri için [KAP — Kamuyu Aydınlatma Platformu](https://www.kap.org.tr) takip edilmelidir. Veri ~15 dakika gecikmelidir.*

📐 FORMAT KURALLARI:
- Markdown başlıklar: \`## 🌐 Piyasa Sahnesi\` formatında
- Her sayıyı parantezle ver: "(P/E 5.12)", "(₺641.50)"
- Negatif sinyal varsa ⚠️
- Yorum cümlelerinde "veride bulundu" gibi meta-konuşma YOK — doğal yaz
- Rakamlar: ₺ sembolü, % işareti, x çarpan (P/E için), B/M/K ölçek

SADECE şu JSON'u döndür (başka hiçbir şey ekleme, code block kullanma):
{
  "teaser": "...(280 karakter, Telegram için)...",
  "fullReport": "...(markdown, 600-900 kelime, 6 perde)...",
  "recommendation": "AL|SAT|TUT|İZLE",
  "keyInsight": "Tek cümlelik ana bulgu — finansal+pazar+risk'i tek cümlede özetle"
}

VERİ:
${dataJson}`;

  const taskEn = `${guardrails}

TASK: Write a 600-900 word INVESTIGATION REPORT for a BIST investor. 6-act narrative — each act builds on the previous, numbers in parentheses, evidence chain.

STRUCTURE — 6 ACTS:

**1) 🌐 Market Stage & Competitive Position** (~100 words)
   - Sector / industry; Turkey 2025–2026 macro backdrop (general — no invented stats)
   - Company position: ₺${(ctx.marketCap / 1e9).toFixed(0)}B market cap relative to sector

**2) 📋 The Company's Face** (~100 words)
   - Business model from description (1-2 sentences)
   - CEO, beta, 52w range vs current price

**3) 📰 News Flow** (~120 words)
   - Recent headlines verbatim (publisher + date)
   - One-sentence interpretation each
   - Skip if empty

**4) 💪 Financial Health Check** (~150 words)
   - P/E TTM, forward P/E, ROE, profit margin, revenue growth — combined story

**5) 🎯 Market Test & Price Potential** (~150 words)
   - Current vs target, upside%, 52w range positioning

**6) ✅ Verdict** (~80 words)
   - BUY / SELL / HOLD / WATCH
   - 3 reasons each with cited number
   - Suitable investor profile + catalyst to watch

⚠️ MANDATORY CLOSING:
> 📌 *This BIST report is based on Yahoo Finance + recent news + financial ratios. SEC EDGAR / FMP insider trading data is unavailable for BIST stocks; track insider activity via [KAP](https://www.kap.org.tr). Data ~15 min delayed.*

Return ONLY this JSON (no code block):
{
  "teaser": "...(280 char)...",
  "fullReport": "...(markdown, 600-900 words, 6 acts)...",
  "recommendation": "AL|SAT|TUT|İZLE",
  "keyInsight": "One-sentence key finding"
}

DATA:
${dataJson}`;

  const prompt = `${system}\n\n${locale === 'tr' ? taskTr : taskEn}`;

  const gem = await callGemini(prompt);
  if (!gem.ok) return null;
  const result = gem.data;

  return {
    symbol,
    mode,
    locale,
    generatedAt: Date.now(),
    teaser: result.teaser || null,
    fullReport: mode === 'full' ? (result.fullReport || null) : null,
    recommendation: result.recommendation || null,
    keyInsight: result.keyInsight || null,
    meta: {
      companyName,
      ceo,
      currentPrice,
      altmanZScore: null,
      piotroskiScore: null,
      targetUpsidePct: targetUpside,
      insiderNetBuying: null,
      beatRate: null,
      secAnnualAvailable: false,
      secQuarterlyAvailable: false,
      market: 'BIST',
      currency: ctx.currency,
      note: locale === 'tr'
        ? 'BIST: SEC/FMP insider verisi yok — kamu verileri ve haber akışı ile analiz.'
        : 'BIST: SEC/FMP insider data unavailable — analysis based on public data + news.',
    },
  };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const symbol = params.get('symbol')?.toUpperCase().trim();
  const mode: Mode = params.get('mode') === 'teaser' ? 'teaser' : 'full';
  const locale: Locale = params.get('locale') === 'en' ? 'en' : 'tr';
  const force = params.get('force') === '1';

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
  }

  // ── BIST branch ───────────────────────────────────────────────────────
  // FMP / SEC EDGAR don't cover BIST. Use yahoo-finance2 + Gemini instead.
  // Gemini key is required; FMP key is optional for BIST.
  if (await isBISTAsync(symbol)) {
    if (!GEMINI_KEY) {
      return NextResponse.json(
        { error: 'Service not configured (GEMINI_API_KEY missing)' },
        { status: 503 },
      );
    }
    if (!force) {
      const cached = await getCachedReport(symbol, locale, mode);
      if (cached) {
        return NextResponse.json({ ...cached, cached: true, cacheSource: 'supabase' });
      }
    }
    const payload = await generateBISTInsiderReport(symbol, mode, locale);
    if (!payload) {
      return NextResponse.json(
        { error: 'BIST verileri çekilemedi veya AI analizi başarısız' },
        { status: 502 },
      );
    }
    await setCachedReport(symbol, payload, locale, mode);
    return NextResponse.json({ ...payload, cached: false, cacheSource: 'gemini-bist' });
  }

  if (!FMP_KEY || !GEMINI_KEY) {
    return NextResponse.json(
      { error: 'Service not configured (missing API key)' },
      { status: 503 },
    );
  }

  // Cache lookup (Supabase DB) — keyed by (symbol, locale, mode)
  // TR is the default locale (TR-first product); EN/other locales get
  // separate cache entries. Teaser and full also cached separately.
  if (!force) {
    const cached = await getCachedReport(symbol, locale, mode);
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
        secAnnualAvailable: !!agentInput.secFilings.annual,
        secQuarterlyAvailable: !!agentInput.secFilings.quarterly,
      },
    };

    // Store in Supabase cache (6h TTL, keyed by symbol+locale+mode)
    await setCachedReport(symbol, payload, locale, mode);

    return NextResponse.json({ ...payload, cached: false, cacheSource: 'gemini' });
  } catch (e) {
    console.error('[insider-report]', e);
    return NextResponse.json(
      { error: 'Internal error generating insider report' },
      { status: 500 },
    );
  }
}

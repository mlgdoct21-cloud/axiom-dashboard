import { NextRequest, NextResponse } from 'next/server';

/**
 * AGENT 5: Corporate Intelligence
 *
 * GET /api/stock/analysis/v3/corporate?symbol=AAPL
 *
 * Pipeline:
 *   1. Finnhub /stock/profile2         → company profile (CEO, sector, employees, IPO)
 *   2. Finnhub /company-news           → last 30d news
 *   3. Finnhub /stock/peers            → peer group (for competitive positioning)
 *   4. Finnhub /stock/recommendation   → analyst consensus
 *   5. Finnhub /stock/insider-sentiment → insider buying signal
 *   6. Gemini 2.0 Flash                → structured synthesis
 *
 * Response feeds into /api/stock/analysis/v3/decision as the qualitative layer.
 */

const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const FINNHUB_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || 'demo';
const GEMINI_KEY = process.env.GEMINI_API_KEY;

// ---------- Finnhub types ----------

interface FinnhubProfile {
  name?: string;
  ticker?: string;
  country?: string;
  exchange?: string;
  ipo?: string;
  marketCapitalization?: number;
  shareOutstanding?: number;
  logo?: string;
  finnhubIndustry?: string;
  weburl?: string;
  phone?: string;
  currency?: string;
}

interface FinnhubNewsItem {
  category?: string;
  datetime: number;
  headline: string;
  id?: number;
  image?: string;
  related?: string;
  source?: string;
  summary?: string;
  url?: string;
}

interface FinnhubRecommendation {
  buy: number;
  hold: number;
  period: string;
  sell: number;
  strongBuy: number;
  strongSell: number;
  symbol: string;
}

interface FinnhubInsiderSentiment {
  data?: Array<{
    symbol: string;
    year: number;
    month: number;
    change: number;
    mspr: number; // Monthly Share Purchase Ratio
  }>;
}

// ---------- Response type (also consumed by dashboard) ----------

export interface CorporateIntelligence {
  symbol: string;

  profile: {
    name: string;
    sector: string;
    country: string;
    ipo: string;
    marketCap: number; // in millions
    employees: number | null;
    logo: string | null;
    website: string | null;
  };

  peers: string[];

  // Structured news events
  recentMoves: Array<{
    date: string;
    type: 'M&A' | 'Partnership' | 'Product' | 'Earnings' | 'Regulatory' | 'Management' | 'Other';
    title: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    source: string;
    url: string;
  }>;

  analystConsensus: {
    strongBuy: number;
    buy: number;
    hold: number;
    sell: number;
    strongSell: number;
    label: string; // "BUY" | "HOLD" | "SELL" | "—"
  } | null;

  insiderBuying: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | null;

  // Synthesized by Gemini
  companySnapshot: string;
  competitiveEdge: string[];
  managementAssessment: string;
  keyRisks: string[];
  narrativeSummary: string;

  // 0-100 qualitative score (feeds decision agent)
  qualitativeScore: number;

  dataCompleteness: {
    profile: boolean;
    news: number;      // count of items
    peers: number;
    analyst: boolean;
    insider: boolean;
    llmSynthesis: boolean;
  };

  timestamp: number;
}

// ---------- Helpers ----------

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (e) {
    console.warn('[corporate] fetch failed', url, e);
    return null;
  }
}

function formatDate(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toISOString().slice(0, 10);
}

function analystLabel(r: FinnhubRecommendation | null): string {
  if (!r) return '—';
  const buy = r.buy + r.strongBuy;
  const sell = r.sell + r.strongSell;
  const total = buy + r.hold + sell;
  if (total === 0) return '—';
  if (buy / total > 0.5) return 'BUY';
  if (sell / total > 0.35) return 'SELL';
  return 'HOLD';
}

function scoreInsider(sent: FinnhubInsiderSentiment | null): 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | null {
  if (!sent?.data || sent.data.length === 0) return null;
  // Average MSPR over last 6 months; positive = more buying
  const avgMspr = sent.data.reduce((a, b) => a + (b.mspr || 0), 0) / sent.data.length;
  if (avgMspr > 0.1) return 'POSITIVE';
  if (avgMspr < -0.1) return 'NEGATIVE';
  return 'NEUTRAL';
}

// Deterministic qualitative score when no LLM
function heuristicScore(
  analystLbl: string,
  insider: string | null,
  newsCount: number
): number {
  let score = 50;
  if (analystLbl === 'BUY') score += 15;
  if (analystLbl === 'SELL') score -= 15;
  if (insider === 'POSITIVE') score += 10;
  if (insider === 'NEGATIVE') score -= 10;
  if (newsCount >= 10) score += 5;
  if (newsCount === 0) score -= 5;
  return Math.max(0, Math.min(100, score));
}

// ---------- Gemini synthesis ----------

interface GeminiOutput {
  companySnapshot: string;
  recentMoves: Array<{
    date: string;
    type: string;
    title: string;
    sentiment: 'positive' | 'negative' | 'neutral';
  }>;
  competitiveEdge: string[];
  managementAssessment: string;
  keyRisks: string[];
  narrativeSummary: string;
  qualitativeScore: number;
}

async function synthesizeWithGemini(args: {
  symbol: string;
  profile: FinnhubProfile | null;
  news: FinnhubNewsItem[];
  peers: string[];
  analystLbl: string;
  insiderLbl: string | null;
}): Promise<GeminiOutput | null> {
  if (!GEMINI_KEY) return null;

  const { symbol, profile, news, peers, analystLbl, insiderLbl } = args;

  // Compact news list (title + date + source only → keep tokens low)
  const newsLines = news
    .slice(0, 20)
    .map((n, i) => `[${i}] ${formatDate(n.datetime)} | ${n.source || 'unk'} | ${n.headline}${n.summary ? ' — ' + n.summary.slice(0, 160) : ''}`)
    .join('\n');

  const prompt = `Finansal analist olarak, ${symbol} hissesi için son 30 günlük haberleri + şirket profilini değerlendir.
SADECE verilen bilgilere dayan — uydurma. Emin olmadığın alanları boş bırak.

=== ŞİRKET PROFİLİ ===
İsim: ${profile?.name || '?'}
Sektör: ${profile?.finnhubIndustry || '?'}
Ülke: ${profile?.country || '?'}
IPO: ${profile?.ipo || '?'}
Pazar Değeri: ${profile?.marketCapitalization ? '$' + (profile.marketCapitalization / 1000).toFixed(1) + 'B' : '?'}

=== PEER GROUP (sektör rakipleri) ===
${peers.join(', ') || '?'}

=== ANALİST KONSENSÜS ===
${analystLbl}

=== INSIDER SENTIMENT ===
${insiderLbl || 'veri yok'}

=== SON 30 GÜN HABERLERİ ===
${newsLines || 'haber yok'}

=== ÇIKTI (sadece geçerli JSON, kod bloğu yok) ===
{
  "companySnapshot": "2-3 cümle: şirketi kısaca tanıt",
  "recentMoves": [
    {"date": "YYYY-MM-DD", "type": "M&A|Partnership|Product|Earnings|Regulatory|Management|Other", "title": "haberden somut olay", "sentiment": "positive|negative|neutral"}
  ],
  "competitiveEdge": ["rakiplerden (${peers.slice(0, 3).join(', ')}) somut farkı — haberlerden çıkar; uyduramazsan boş bırak", "..."],
  "managementAssessment": "CEO/yönetim hakkında 1-2 cümle — haberlerden okunanlar",
  "keyRisks": ["son dönem haberlerden çıkan somut risk", "..."],
  "narrativeSummary": "3-4 cümle: şirketi bir yatırımcıya özetle — son çeyreğin genel hikâyesi",
  "qualitativeScore": 0-100
}

Kurallar:
- recentMoves en fazla 6 öğe, en önemli olaylar. Her biri gerçek bir haberden gelmeli.
- competitiveEdge uydurma — haberlerde yoksa [] döndür
- qualitativeScore: 50 nötr. 65+ güçlü kurumsal hamle+pozitif sentiment. <40 skandal/kötü haber. Karar için: analyst konsensüs + insider + haber sentiment ağırlıkla.
- Tüm metinler Türkçe olsun.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1200,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!res.ok) {
      console.warn('[corporate] Gemini failed', await res.text());
      return null;
    }

    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return null;

    // Parse (Gemini may still add fences)
    const cleaned = raw.replace(/```json\s*|\s*```/g, '').trim();
    const parsed = JSON.parse(cleaned) as GeminiOutput;

    // Basic validation
    if (typeof parsed.qualitativeScore !== 'number') parsed.qualitativeScore = 50;
    parsed.qualitativeScore = Math.max(0, Math.min(100, parsed.qualitativeScore));
    if (!Array.isArray(parsed.recentMoves)) parsed.recentMoves = [];
    if (!Array.isArray(parsed.competitiveEdge)) parsed.competitiveEdge = [];
    if (!Array.isArray(parsed.keyRisks)) parsed.keyRisks = [];

    return parsed;
  } catch (e) {
    console.warn('[corporate] Gemini parse failed', e);
    return null;
  }
}

// ---------- Handler ----------

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')?.toUpperCase();
  if (!symbol) {
    return NextResponse.json({ error: 'symbol required' }, { status: 400 });
  }

  const toISO = new Date().toISOString().slice(0, 10);
  const fromISO = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);

  // Fan-out fetches in parallel (all tolerant to failure)
  const [profile, newsRaw, peersRaw, recRaw, insiderRaw] = await Promise.all([
    fetchJSON<FinnhubProfile>(`${FINNHUB_BASE}/stock/profile2?symbol=${symbol}&token=${FINNHUB_KEY}`),
    fetchJSON<FinnhubNewsItem[]>(`${FINNHUB_BASE}/company-news?symbol=${symbol}&from=${fromISO}&to=${toISO}&token=${FINNHUB_KEY}`),
    fetchJSON<string[]>(`${FINNHUB_BASE}/stock/peers?symbol=${symbol}&token=${FINNHUB_KEY}`),
    fetchJSON<FinnhubRecommendation[]>(`${FINNHUB_BASE}/stock/recommendation?symbol=${symbol}&token=${FINNHUB_KEY}`),
    fetchJSON<FinnhubInsiderSentiment>(`${FINNHUB_BASE}/stock/insider-sentiment?symbol=${symbol}&from=${fromISO}&to=${toISO}&token=${FINNHUB_KEY}`),
  ]);

  // Normalize news — strip duplicates, keep most recent 25, filter obvious junk
  const seen = new Set<string>();
  const news = (newsRaw || [])
    .filter((n) => {
      if (!n.headline) return false;
      if (seen.has(n.headline)) return false;
      seen.add(n.headline);
      return true;
    })
    .sort((a, b) => b.datetime - a.datetime)
    .slice(0, 25);

  // Peers: drop self, keep top 6
  const peers = (peersRaw || [])
    .filter((p) => p && p !== symbol)
    .slice(0, 6);

  // Analyst: take most recent period
  const rec = recRaw?.[0] || null;
  const analystLbl = analystLabel(rec);

  const insiderLbl = scoreInsider(insiderRaw);

  // LLM synthesis (may return null if no key / network issue)
  const llm = await synthesizeWithGemini({
    symbol,
    profile,
    news,
    peers,
    analystLbl,
    insiderLbl,
  });

  // Build recentMoves — prefer Gemini's labeled list; fall back to raw news
  let recentMoves: CorporateIntelligence['recentMoves'] = [];
  if (llm?.recentMoves?.length) {
    // Map Gemini items to news URLs by fuzzy title match
    recentMoves = llm.recentMoves.slice(0, 8).map((m) => {
      const match = news.find(
        (n) =>
          n.headline &&
          (n.headline.toLowerCase().includes(m.title.toLowerCase().slice(0, 20)) ||
            m.title.toLowerCase().includes(n.headline.toLowerCase().slice(0, 20)))
      );
      const allowedTypes = ['M&A', 'Partnership', 'Product', 'Earnings', 'Regulatory', 'Management', 'Other'] as const;
      const type = (allowedTypes as readonly string[]).includes(m.type) ? (m.type as typeof allowedTypes[number]) : 'Other';
      return {
        date: m.date,
        type,
        title: m.title,
        sentiment: m.sentiment,
        source: match?.source || '—',
        url: match?.url || '',
      };
    });
  } else {
    // Fallback: just show the most recent 6 headlines as "Other"
    recentMoves = news.slice(0, 6).map((n) => ({
      date: formatDate(n.datetime),
      type: 'Other' as const,
      title: n.headline,
      sentiment: 'neutral' as const,
      source: n.source || '—',
      url: n.url || '',
    }));
  }

  const qualitativeScore =
    llm?.qualitativeScore ?? heuristicScore(analystLbl, insiderLbl, news.length);

  const response: CorporateIntelligence = {
    symbol,
    profile: {
      name: profile?.name || symbol,
      sector: profile?.finnhubIndustry || 'Unknown',
      country: profile?.country || '?',
      ipo: profile?.ipo || '?',
      marketCap: profile?.marketCapitalization || 0,
      employees: null, // Finnhub profile2 doesn't include this; will be enriched later
      logo: profile?.logo || null,
      website: profile?.weburl || null,
    },
    peers,
    recentMoves,
    analystConsensus: rec
      ? {
          strongBuy: rec.strongBuy,
          buy: rec.buy,
          hold: rec.hold,
          sell: rec.sell,
          strongSell: rec.strongSell,
          label: analystLbl,
        }
      : null,
    insiderBuying: insiderLbl,
    companySnapshot: llm?.companySnapshot || (profile?.name ? `${profile.name} — ${profile.finnhubIndustry || 'N/A'} sektöründe faaliyet gösteriyor.` : ''),
    competitiveEdge: llm?.competitiveEdge || [],
    managementAssessment: llm?.managementAssessment || '',
    keyRisks: llm?.keyRisks || [],
    narrativeSummary:
      llm?.narrativeSummary ||
      `${symbol} için son 30 günde ${news.length} haber tespit edildi. Analist konsensüsü: ${analystLbl}.`,
    qualitativeScore,
    dataCompleteness: {
      profile: !!profile,
      news: news.length,
      peers: peers.length,
      analyst: !!rec,
      insider: !!insiderLbl,
      llmSynthesis: !!llm,
    },
    timestamp: Date.now(),
  };

  return NextResponse.json(response);
}

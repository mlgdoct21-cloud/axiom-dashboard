import { NextRequest, NextResponse } from 'next/server';

/**
 * AGENT 5: Corporate Intelligence (Hybrid FMP-First)
 * GET /api/stock/analysis/v3/corporate?symbol=AAPL
 */

const FMP_KEY = process.env.FMP_API_KEY;
const FINNHUB_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

export interface CorporateIntelligence {
  symbol: string;
  profile: {
    name: string;
    sector: string;
    country: string;
    ipo: string;
    marketCap: number;
    employees: number | null;
    logo: string | null;
    website: string | null;
    ceo?: string;
  };
  peers: string[];
  recentMoves: Array<{
    date: string;
    type: string;
    title: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    source: string;
    url: string;
  }>;
  analystConsensus: {
    buy: number;
    hold: number;
    sell: number;
    label: string;
  } | null;
  insiderBuying: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | null;
  companySnapshot: string;
  competitiveEdge: string[];
  managementAssessment: string;
  keyRisks: string[];
  narrativeSummary: string;
  qualitativeScore: number;
  timestamp: number;
}

async function fetchFMPData(symbol: string) {
  if (!FMP_KEY) return null;
  try {
    const [pRes, newsRes, peerRes, recRes] = await Promise.all([
      fetch(`https://financialmodelingprep.com/stable/profile?symbol=${symbol}&apikey=${FMP_KEY}`),
      fetch(`https://financialmodelingprep.com/v3/stock_news?tickers=${symbol}&limit=20&apikey=${FMP_KEY}`),
      fetch(`https://financialmodelingprep.com/v4/stock_peers?symbol=${symbol}&apikey=${FMP_KEY}`),
      fetch(`https://financialmodelingprep.com/v3/analyst-stock-recommendations/${symbol}?limit=1&apikey=${FMP_KEY}`)
    ]);
    return {
      profile: pRes.ok ? (await pRes.json())?.[0] : null,
      news: newsRes.ok ? await newsRes.json() : [],
      peers: peerRes.ok ? (await peerRes.json())?.[0]?.peersList : [],
      rec: recRes.ok ? (await recRes.json())?.[0] : null
    };
  } catch (e) {
    console.error('[FMP Corporate Fetch Failed]', e);
    return null;
  }
}

async function fetchFinnhubFallback(symbol: string) {
  if (!FINNHUB_KEY) return null;
  try {
    const pRes = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_KEY}`);
    return pRes.ok ? await pRes.json() : null;
  } catch (e) {
    return null;
  }
}

async function synthesizeWithGemini(context: any) {
  if (!GEMINI_KEY) return null;
  const prompt = `Kurumsal istihbarat analisti olarak aşağıdaki verileri yorumla ve JSON döndür.
  Şirket: ${context.name} (${context.symbol})
  Profil: ${JSON.stringify(context.profile)}
  Haberler: ${JSON.stringify(context.news?.slice(0, 5))}
  Rakipler: ${context.peers?.join(', ')}
  Analist Görüşü: ${JSON.stringify(context.rec)}

  JSON Format:
  {
    "companySnapshot": "2 cümlelik şirket özeti",
    "recentMoves": [{"date": "YYYY-MM-DD", "type": "...","title": "...", "sentiment": "..."}],
    "competitiveEdge": ["madde 1", "madde 2"],
    "managementAssessment": "Yönetim kalitesi yorumu",
    "keyRisks": ["risk 1", "risk 2"],
    "narrativeSummary": "3 cümlelik yatırımcı özeti",
    "qualitativeScore": 0-100
  }
  Tüm metinler Türkçe olsun.`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST',
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } })
    });
    const data = await res.json();
    return JSON.parse(data.candidates[0].content.parts[0].text);
  } catch (e) { return null; }
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')?.toUpperCase();
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });

  const fmp = await fetchFMPData(symbol);
  const finn = !fmp?.profile ? await fetchFinnhubFallback(symbol) : null;

  if (!fmp?.profile && !finn) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const profile = {
    name: fmp?.profile?.companyName || finn?.name || symbol,
    sector: fmp?.profile?.sector || finn?.finnhubIndustry || 'N/A',
    country: fmp?.profile?.country || finn?.country || 'N/A',
    ipo: fmp?.profile?.ipoDate || finn?.ipo || 'N/A',
    marketCap: fmp?.profile?.marketCap || finn?.marketCapitalization || 0,
    employees: fmp?.profile?.fullTimeEmployees || null,
    logo: fmp?.profile?.image || finn?.logo || null,
    website: fmp?.profile?.website || finn?.weburl || null,
    ceo: fmp?.profile?.ceo || 'N/A'
  };

  const llm = await synthesizeWithGemini({ symbol, name: profile.name, profile: fmp?.profile || finn, news: fmp?.news, peers: fmp?.peers, rec: fmp?.rec });

  const response: CorporateIntelligence = {
    symbol,
    profile,
    peers: fmp?.peers || [],
    recentMoves: llm?.recentMoves || [],
    analystConsensus: fmp?.rec ? {
      buy: fmp.rec.buy,
      hold: fmp.rec.hold,
      sell: fmp.rec.sell,
      label: (fmp.rec.buy > fmp.rec.sell) ? 'BUY' : 'HOLD'
    } : null,
    insiderBuying: null, // FMP Insider data needs a different endpoint if needed
    companySnapshot: llm?.companySnapshot || '',
    competitiveEdge: llm?.competitiveEdge || [],
    managementAssessment: llm?.managementAssessment || '',
    keyRisks: llm?.keyRisks || [],
    narrativeSummary: llm?.narrativeSummary || '',
    qualitativeScore: llm?.qualitativeScore || 50,
    timestamp: Date.now()
  };

  return NextResponse.json(response);
}

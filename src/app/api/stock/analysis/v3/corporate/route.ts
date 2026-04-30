import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { toYahooSymbol, BIST_COMPANY_NAMES } from '@/lib/bist-symbols';
import { isBISTAsync } from '@/lib/bist-detect-server';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

/**
 * AGENT 5: Corporate Intelligence (Hybrid FMP-First, BIST via yahoo-finance2)
 * GET /api/stock/analysis/v3/corporate?symbol=AAPL
 * GET /api/stock/analysis/v3/corporate?symbol=GARAN  (BIST)
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
    strongBuy: number;
    buy: number;
    hold: number;
    sell: number;
    strongSell: number;
    label: string;
  } | null;
  insiderBuying: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | null;
  companySnapshot: string;
  competitiveEdge: string[];
  managementAssessment: string;
  keyRisks: string[];
  narrativeSummary: string;
  qualitativeScore: number;
  dataCompleteness: {
    profile: boolean;
    news: number;
    peers: number;
    analyst: boolean;
    insider: boolean;
    llmSynthesis: boolean;
  };
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

async function fetchBISTProfile(symbol: string) {
  try {
    const yfSym = toYahooSymbol(symbol);
    const [quote, summary] = await Promise.all([
      yahooFinance.quote(yfSym),
      yahooFinance.quoteSummary(yfSym, {
        modules: ['summaryProfile', 'price', 'assetProfile'],
      }).catch(() => null),
    ]);
    const single: any = Array.isArray(quote) ? quote[0] : quote;
    if (!single) return null;
    const profile = summary?.summaryProfile || (summary as any)?.assetProfile;
    return {
      companyName: single.longName || single.shortName || BIST_COMPANY_NAMES[symbol] || symbol,
      sector: profile?.sector || 'N/A',
      industry: profile?.industry || 'N/A',
      country: profile?.country || 'Turkey',
      marketCap: Number(single.marketCap ?? 0),
      employees: profile?.fullTimeEmployees ?? null,
      website: profile?.website ?? null,
      logo: null,
      ipoDate: 'N/A',
      ceo: profile?.companyOfficers?.[0]?.name || 'N/A',
      description: profile?.longBusinessSummary || '',
    };
  } catch (e) {
    console.error('[corporate/bist]', symbol, (e as Error).message);
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

  // Route BIST symbols to yahoo-finance2 (FMP/Finnhub free tiers don't cover BIST well)
  const bistProfile = (await isBISTAsync(symbol)) ? await fetchBISTProfile(symbol) : null;

  // For US: try FMP, then Finnhub
  const fmp = !bistProfile ? await fetchFMPData(symbol) : null;
  const finn = !bistProfile && !fmp?.profile ? await fetchFinnhubFallback(symbol) : null;

  if (!bistProfile && !fmp?.profile && !finn) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const profile = {
    name: bistProfile?.companyName || fmp?.profile?.companyName || finn?.name || symbol,
    sector: bistProfile?.sector || fmp?.profile?.sector || finn?.finnhubIndustry || 'N/A',
    country: bistProfile?.country || fmp?.profile?.country || finn?.country || 'N/A',
    ipo: bistProfile?.ipoDate || fmp?.profile?.ipoDate || finn?.ipo || 'N/A',
    marketCap: bistProfile?.marketCap || fmp?.profile?.marketCap || finn?.marketCapitalization || 0,
    employees: bistProfile?.employees || fmp?.profile?.fullTimeEmployees || null,
    logo: bistProfile?.logo || fmp?.profile?.image || finn?.logo || null,
    website: bistProfile?.website || fmp?.profile?.website || finn?.weburl || null,
    ceo: bistProfile?.ceo || fmp?.profile?.ceo || 'N/A',
  };

  const llmContext = bistProfile
    ? { symbol, name: profile.name, profile: bistProfile, news: [], peers: [], rec: null }
    : { symbol, name: profile.name, profile: fmp?.profile || finn, news: fmp?.news, peers: fmp?.peers, rec: fmp?.rec };
  const llm = await synthesizeWithGemini(llmContext);

  const response: CorporateIntelligence = {
    symbol,
    profile,
    peers: fmp?.peers || [],
    recentMoves: llm?.recentMoves || [],
    analystConsensus: fmp?.rec ? {
      strongBuy: fmp.rec.strongBuy || 0,
      buy: fmp.rec.buy || 0,
      hold: fmp.rec.hold || 0,
      sell: fmp.rec.sell || 0,
      strongSell: fmp.rec.strongSell || 0,
      label: (fmp.rec.buy > fmp.rec.sell) ? 'BUY' : 'HOLD'
    } : null,
    insiderBuying: null, // FMP Insider data needs a different endpoint if needed
    companySnapshot: llm?.companySnapshot || '',
    competitiveEdge: llm?.competitiveEdge || [],
    managementAssessment: llm?.managementAssessment || '',
    keyRisks: llm?.keyRisks || [],
    narrativeSummary: llm?.narrativeSummary || '',
    qualitativeScore: llm?.qualitativeScore || 50,
    dataCompleteness: {
      profile: !!(fmp?.profile || finn),
      news: Array.isArray(fmp?.news) ? fmp.news.length : 0,
      peers: Array.isArray(fmp?.peers) ? fmp.peers.length : 0,
      analyst: !!fmp?.rec,
      insider: false,
      llmSynthesis: !!llm
    },
    timestamp: Date.now()
  };

  return NextResponse.json(response);
}

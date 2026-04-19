import { NextRequest, NextResponse } from 'next/server';

/**
 * AI Stock Analysis & Recommendation
 * POST /api/stock/analysis
 *
 * Generates Buy/Sell/Hold recommendation using Gemini 2.0 Flash
 * Considers:
 * - Fundamental metrics (P/E, ROE, growth)
 * - Technical indicators (RSI, MACD, trend)
 * - Earnings history (surprises, guidance)
 * - Recent news sentiment
 * - Valuation vs peers
 *
 * Returns AI recommendation with confidence & rationale
 */

interface AnalysisRequest {
  symbol: string;
  name: string;
  price: number;
  sector: string;

  fundamentals: {
    pe?: number;
    roe?: number;
    debtToEquity?: number;
    fcf?: number;
    dividendYield?: number;
    earningsGrowth?: number;
  };

  technicals: {
    rsi?: number;
    macdStatus?: string;
    bbPosition?: string;
    maStatus?: string;
  };

  earnings: {
    nextDate?: string;
    daysUntil?: number;
    historicalSurprises?: number[];
  };

  news?: string[]; // Recent relevant news

  locale: 'en' | 'tr';
}

interface RecommendationResponse {
  symbol: string;
  recommendation: 'BUY' | 'HOLD' | 'SELL';
  confidence: number; // 0-1
  confidence_percent: number; // 0-100

  targetPrice?: number;
  targetPriceChange?: number; // -0.20 to 0.50

  rationale: string;
  keyStrengths: string[];
  risks: string[];

  investorStance: 'ACCUMULATE' | 'HOLD' | 'REDUCE';
  riskRating: 'LOW' | 'MODERATE' | 'HIGH';

  success_probability: number;
  timestamp: number;
}

async function generateRecommendation(
  request: AnalysisRequest
): Promise<RecommendationResponse | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  // Build context string from data
  const fundamentalsText = request.fundamentals
    ? `
Fundamentals:
- P/E Ratio: ${request.fundamentals.pe?.toFixed(2) || 'N/A'}
- ROE: ${request.fundamentals.roe ? (request.fundamentals.roe * 100).toFixed(1) : 'N/A'}%
- Debt/Equity: ${request.fundamentals.debtToEquity?.toFixed(2) || 'N/A'}
- Free Cash Flow: ${request.fundamentals.fcf ? '$' + (request.fundamentals.fcf / 1e9).toFixed(1) + 'B' : 'N/A'}
- Dividend Yield: ${request.fundamentals.dividendYield ? (request.fundamentals.dividendYield * 100).toFixed(2) : 'N/A'}%
- EPS Growth: ${request.fundamentals.earningsGrowth ? (request.fundamentals.earningsGrowth * 100).toFixed(1) : 'N/A'}%`
    : '';

  const technicalsText = request.technicals
    ? `
Technicals:
- RSI: ${request.technicals.rsi?.toFixed(1) || 'N/A'}
- MACD: ${request.technicals.macdStatus || 'N/A'}
- Bollinger Bands: ${request.technicals.bbPosition || 'N/A'}
- Moving Averages: ${request.technicals.maStatus || 'N/A'}`
    : '';

  const earningsText = request.earnings?.nextDate
    ? `
Earnings:
- Next Report: ${request.earnings.nextDate} (${request.earnings.daysUntil} days)
- Historical Surprises: ${request.earnings.historicalSurprises?.map(v => (v * 100).toFixed(1) + '%').join(', ') || 'N/A'}`
    : '';

  const newsText =
    request.news && request.news.length > 0
      ? `\nRecent News:\n${request.news.slice(0, 3).join('\n')}`
      : '';

  const prompt =
    request.locale === 'tr'
      ? `${request.symbol} (${request.name}) stoku için AI tabanlı bir yatırım tavsiyesi oluştur.

STOK BİLGİSİ:
${fundamentalsText}
${technicalsText}
${earningsText}
${newsText}

GÖREV:
1. Tavsiyeni BUY, HOLD veya SELL olarak belirt
2. Güven seviyesi: 0-100% arası bir sayı
3. Hedef fiyat ve beklenen değişim %
4. Kısa ve açık bir mantık (2-3 cümle)
5. Temel güçler (2-3 madde)
6. Riskler (2-3 madde)
7. Yatırımcı duruşu: ACCUMULATE, HOLD veya REDUCE
8. Risk Derecelendirmesi: LOW, MODERATE veya HIGH
9. Başarı olasılığı: 0-100%

Lütfen aşağıdaki JSON formatında cevap ver:
{
  "recommendation": "BUY|HOLD|SELL",
  "confidence": 78,
  "targetPrice": 195.50,
  "targetPriceChange": 5.1,
  "rationale": "...",
  "keyStrengths": ["...", "..."],
  "risks": ["...", "..."],
  "investorStance": "ACCUMULATE|HOLD|REDUCE",
  "riskRating": "LOW|MODERATE|HIGH",
  "success_probability": 72
}`
      : `Generate an AI-driven investment recommendation for ${request.symbol} (${request.name}).

STOCK DATA:
${fundamentalsText}
${technicalsText}
${earningsText}
${newsText}

TASK:
1. State your recommendation: BUY, HOLD, or SELL
2. Confidence level: 0-100%
3. Target price and expected % change
4. Clear rationale (2-3 sentences)
5. Key strengths (2-3 points)
6. Key risks (2-3 points)
7. Investor stance: ACCUMULATE, HOLD, or REDUCE
8. Risk rating: LOW, MODERATE, or HIGH
9. Success probability: 0-100%

Please respond in JSON format:
{
  "recommendation": "BUY|HOLD|SELL",
  "confidence": 78,
  "targetPrice": 195.50,
  "targetPriceChange": 5.1,
  "rationale": "...",
  "keyStrengths": ["...", "..."],
  "risks": ["...", "..."],
  "investorStance": "ACCUMULATE|HOLD|REDUCE",
  "riskRating": "LOW|MODERATE|HIGH",
  "success_probability": 72
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('[analysis/gemini]', response.status);
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[analysis/parse]', 'No JSON found in response');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      symbol: request.symbol,
      recommendation: parsed.recommendation || 'HOLD',
      confidence: (parsed.confidence || 50) / 100,
      confidence_percent: parsed.confidence || 50,
      targetPrice: parsed.targetPrice,
      targetPriceChange: parsed.targetPriceChange
        ? parsed.targetPriceChange / 100
        : undefined,
      rationale: parsed.rationale || '',
      keyStrengths: parsed.keyStrengths || [],
      risks: parsed.risks || [],
      investorStance: parsed.investorStance || 'HOLD',
      riskRating: parsed.riskRating || 'MODERATE',
      success_probability: (parsed.success_probability || 50) / 100,
      timestamp: Date.now(),
    };
  } catch (e) {
    console.error('[analysis/error]', e);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalysisRequest;

    if (!body.symbol) {
      return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
    }

    const recommendation = await generateRecommendation(body);

    if (!recommendation) {
      return NextResponse.json(
        { error: 'Failed to generate analysis' },
        { status: 500 }
      );
    }

    return NextResponse.json(recommendation);
  } catch (e) {
    console.error('[analysis]', e);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}

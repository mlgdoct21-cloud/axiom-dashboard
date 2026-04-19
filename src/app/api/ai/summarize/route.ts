import { NextRequest, NextResponse } from 'next/server';

/**
 * Gemini AI — Haber Özeti
 *
 * POST /api/ai/summarize
 *
 * Haber başlığı + özeti alıp Gemini'ye gönderiyor,
 * önemli noktaları ve etkisini özet yapıyor.
 *
 * Request:
 * {
 *   "title": "Bitcoin düştü",
 *   "summary": "Bitcoin fiyatı...",
 *   "locale": "tr" | "en"
 * }
 *
 * Response: Streaming text
 */

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Gemini API key not configured' },
      { status: 500 }
    );
  }

  try {
    const { title, summary, locale = 'tr' } = await request.json();

    if (!title || !summary) {
      return NextResponse.json(
        { error: 'title and summary required' },
        { status: 400 }
      );
    }

    const prompt = locale === 'tr'
      ? `Aşağıdaki haber başlığı ve özeti için kısa, etkili bir özet yap. Önemli noktaları ve pazar etkisini vurgula. 2-3 paragraf olsun.

Başlık: "${title}"
Özet: "${summary}"

Çıktı:`
      : `Create a concise, impactful summary of the following news headline and content. Highlight key points and market impact. Keep it to 2-3 paragraphs.

Title: "${title}"
Summary: "${summary}"

Output:`;

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
            maxOutputTokens: 300,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[ai/summarize] Gemini error:', error);
      return NextResponse.json(
        { error: 'Failed to generate summary' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const summaryText =
      data.candidates?.[0]?.content?.parts?.[0]?.text || 'Özet oluşturulamadı';

    return NextResponse.json({
      summary: summaryText,
      success: true,
    });
  } catch (e) {
    console.error('[ai/summarize]', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

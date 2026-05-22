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
      { error: 'AXIOM AI service not configured' },
      { status: 500 }
    );
  }

  try {
    const { title, summary, locale = 'tr' } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: 'title required' },
        { status: 400 }
      );
    }

    const hasBody = typeof summary === 'string' && summary.trim().length > 0;

    const prompt = locale === 'tr'
      ? `Aşağıdaki finansal haber için kısa, etkili bir özet yap. Önemli noktaları ve olası pazar etkisini vurgula. 2-3 paragraf olsun. Gövde metni az olsa bile başlıktan yola çıkarak somut, doğrudan özet yaz; "yeterli bilgi yok", "varsayımsaldır" gibi uyarı/özür cümleleri YAZMA.

Başlık: "${title}"${hasBody ? `\nDetay: "${summary}"` : ''}

Çıktı:`
      : `Write a concise, impactful summary of the following financial news. Highlight key points and likely market impact in 2-3 paragraphs. Even if the body is thin, write a concrete, direct summary based on the headline; do NOT write disclaimers like "insufficient information" or "this is assumed".

Title: "${title}"${hasBody ? `\nDetail: "${summary}"` : ''}

Output:`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
            maxOutputTokens: 800,
            thinkingConfig: { thinkingBudget: 0 },
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

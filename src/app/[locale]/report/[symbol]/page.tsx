'use client';

import { useEffect, useState, use } from 'react';

type ReportPayload = {
  symbol: string;
  mode: 'full' | 'teaser';
  locale: 'tr' | 'en';
  teaser: string | null;
  fullReport: string | null;
  recommendation: string | null;
  keyInsight: string | null;
  meta: {
    companyName?: string;
    ceo?: string;
    currentPrice?: number;
    altmanZScore?: number;
    piotroskiScore?: number;
    targetUpsidePct?: number;
    insiderNetBuying?: number;
    beatRate?: number;
  };
  cached?: boolean;
};

function renderMarkdownBlock(md: string): React.ReactNode[] {
  const lines = md.split('\n');
  const out: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let paraBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length) {
      out.push(
        <ul key={`ul-${out.length}`} className="list-disc pl-5 space-y-1.5 my-3 text-[#c0c0d0]">
          {listBuffer.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
          ))}
        </ul>,
      );
      listBuffer = [];
    }
  };

  const flushPara = () => {
    if (paraBuffer.length) {
      out.push(
        <p
          key={`p-${out.length}`}
          className="my-3 text-[#c0c0d0] leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderInline(paraBuffer.join(' ')) }}
        />,
      );
      paraBuffer = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      flushPara();
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      flushPara();
      out.push(
        <h2
          key={`h2-${out.length}`}
          className="mt-6 mb-3 text-xl sm:text-2xl font-bold text-[#4fc3f7] border-b border-[#2a2a3e] pb-2"
          dangerouslySetInnerHTML={{ __html: renderInline(line.slice(3)) }}
        />,
      );
    } else if (line.startsWith('### ')) {
      flushList();
      flushPara();
      out.push(
        <h3
          key={`h3-${out.length}`}
          className="mt-4 mb-2 text-lg font-semibold text-[#e0e0e0]"
          dangerouslySetInnerHTML={{ __html: renderInline(line.slice(4)) }}
        />,
      );
    } else if (line.startsWith('# ')) {
      flushList();
      flushPara();
      out.push(
        <h1
          key={`h1-${out.length}`}
          className="mt-4 mb-4 text-2xl sm:text-3xl font-bold text-white"
          dangerouslySetInnerHTML={{ __html: renderInline(line.slice(2)) }}
        />,
      );
    } else if (/^[-*]\s+/.test(line)) {
      flushPara();
      listBuffer.push(line.replace(/^[-*]\s+/, ''));
    } else {
      flushList();
      paraBuffer.push(line);
    }
  }
  flushList();
  flushPara();
  return out;
}

function renderInline(text: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let out = escape(text);
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>');
  out = out.replace(/\*(.+?)\*/g, '<em>$1</em>');
  out = out.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-[#1e1e38] rounded text-[#4fc3f7] text-sm">$1</code>');
  return out;
}

function formatMoney(n?: number): string {
  if (n == null) return '—';
  return `$${n.toFixed(2)}`;
}

function formatPct(n?: number): string {
  if (n == null) return '—';
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
}

export default function ReportPage({
  params,
}: {
  params: Promise<{ locale: string; symbol: string }>;
}) {
  const { locale, symbol: rawSymbol } = use(params);
  const symbol = rawSymbol.toUpperCase();
  const loc = locale === 'en' ? 'en' : 'tr';

  const [data, setData] = useState<ReportPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const r = await fetch(
          `/api/stock/analysis/insider-report?symbol=${encodeURIComponent(symbol)}&mode=full&locale=${loc}`,
          { cache: 'no-store' },
        );
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          if (!aborted) setError(body.error || `HTTP ${r.status}`);
          return;
        }
        const json = (await r.json()) as ReportPayload;
        if (!aborted) setData(json);
      } catch (e) {
        if (!aborted) setError(String(e));
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [symbol, loc]);

  const t = loc === 'tr'
    ? {
        title: 'Insider Raporu',
        loading: 'Rapor oluşturuluyor...',
        loadingSub: 'FMP verileri + Gemini AI analizi (~15 sn)',
        errorTitle: 'Rapor alınamadı',
        retry: 'Tekrar Dene',
        price: 'Fiyat',
        upside: 'Hedef Potansiyel',
        altman: 'Altman Z',
        piotroski: 'Piotroski F',
        insider: 'İçeriden Net Alım (6ay)',
        beat: 'Earnings Beat',
        ceo: 'CEO',
        recommendation: 'Tavsiye',
        keyInsight: 'Ana İçgörü',
        backHome: 'Dashboard\'a Dön',
      }
    : {
        title: 'Insider Report',
        loading: 'Generating report...',
        loadingSub: 'FMP data + Gemini AI analysis (~15 sec)',
        errorTitle: 'Failed to load report',
        retry: 'Retry',
        price: 'Price',
        upside: 'Target Upside',
        altman: 'Altman Z',
        piotroski: 'Piotroski F',
        insider: 'Insider Net Buying (6mo)',
        beat: 'Earnings Beat',
        ceo: 'CEO',
        recommendation: 'Recommendation',
        keyInsight: 'Key Insight',
        backHome: 'Back to Dashboard',
      };

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-[#e0e0e0]">
      <header className="sticky top-0 z-10 bg-[#141425]/95 backdrop-blur border-b border-[#2a2a3e] px-4 py-3 flex items-center justify-between">
        <a
          href={`/${loc}`}
          className="flex items-center gap-2 text-[#4fc3f7] hover:text-white transition"
        >
          <span className="text-xl">←</span>
          <span className="text-sm font-medium">{t.backHome}</span>
        </a>
        <div className="text-sm text-[#8888a0]">
          📊 {symbol} {t.title}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 pb-16">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-3 border-[#4fc3f7] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#e0e0e0] font-medium">{t.loading}</p>
            <p className="text-xs text-[#8888a0]">{t.loadingSub}</p>
          </div>
        )}

        {error && (
          <div className="py-10 text-center">
            <p className="text-red-400 text-lg font-semibold mb-2">{t.errorTitle}</p>
            <p className="text-[#8888a0] text-sm mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2 bg-[#4fc3f7] text-[#0d0d1a] font-semibold rounded hover:bg-[#3fb3e7] transition"
            >
              {t.retry}
            </button>
          </div>
        )}

        {data && !loading && (
          <>
            <div className="bg-[#141425] rounded-lg p-4 sm:p-5 mb-5 border border-[#2a2a3e]">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                {data.meta.companyName || symbol}
              </h1>
              <p className="text-[#8888a0] text-sm">
                {symbol}
                {data.meta.ceo ? ` • ${t.ceo}: ${data.meta.ceo}` : ''}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                <MetricBox label={t.price} value={formatMoney(data.meta.currentPrice)} />
                <MetricBox
                  label={t.upside}
                  value={formatPct(data.meta.targetUpsidePct)}
                  tone={data.meta.targetUpsidePct != null ? (data.meta.targetUpsidePct > 0 ? 'pos' : 'neg') : undefined}
                />
                <MetricBox label={t.altman} value={data.meta.altmanZScore?.toFixed(2) ?? '—'} />
                <MetricBox label={t.piotroski} value={`${data.meta.piotroskiScore ?? '—'}/9`} />
                <MetricBox
                  label={t.insider}
                  value={formatMoney(data.meta.insiderNetBuying)}
                  tone={data.meta.insiderNetBuying != null ? (data.meta.insiderNetBuying > 0 ? 'pos' : 'neg') : undefined}
                />
                <MetricBox label={t.beat} value={formatPct(data.meta.beatRate != null ? data.meta.beatRate * 100 : undefined)} />
              </div>
            </div>

            {data.recommendation && (
              <div className="bg-gradient-to-br from-[#1a2a4f] to-[#141425] border border-[#4fc3f7]/30 rounded-lg p-4 sm:p-5 mb-5">
                <div className="text-xs uppercase tracking-wider text-[#4fc3f7] font-semibold mb-1.5">
                  {t.recommendation}
                </div>
                <p className="text-white text-base sm:text-lg leading-snug">{data.recommendation}</p>
              </div>
            )}

            {data.keyInsight && (
              <div className="bg-[#141425] border-l-4 border-[#ffb347] rounded p-4 mb-5">
                <div className="text-xs uppercase tracking-wider text-[#ffb347] font-semibold mb-1.5">
                  💡 {t.keyInsight}
                </div>
                <p className="text-[#e0e0e0] text-sm sm:text-base leading-relaxed">
                  {data.keyInsight}
                </p>
              </div>
            )}

            {data.fullReport && (
              <article className="bg-[#141425] rounded-lg p-4 sm:p-6 border border-[#2a2a3e]">
                {renderMarkdownBlock(data.fullReport)}
              </article>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function MetricBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'pos' | 'neg';
}) {
  const color =
    tone === 'pos' ? 'text-green-400' : tone === 'neg' ? 'text-red-400' : 'text-white';
  return (
    <div className="bg-[#0d0d1a] rounded p-2.5 border border-[#2a2a3e]">
      <div className="text-[10px] uppercase tracking-wider text-[#8888a0] mb-1">{label}</div>
      <div className={`text-sm sm:text-base font-bold ${color}`}>{value}</div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import type { NewsItem } from '@/components/tabs/NewsTab';

interface NewsModalProps {
  item: NewsItem | null;
  isOpen: boolean;
  onClose: () => void;
  locale: 'en' | 'tr';
  marketAnalysis?: string;
}

export default function NewsModal({ item, isOpen, onClose, locale, marketAnalysis }: NewsModalProps) {
  const [showIframe, setShowIframe] = useState(false);

  if (!isOpen || !item) return null;

  const formatDate = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-4 md:inset-8 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-[#2a2a3e]">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-[#e0e0e0] mb-2">{item.title}</h2>
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="text-[#4fc3f7]">{item.source}</span>
              <span className="text-[#444460]">{formatDate(item.publishedAt)}</span>
              <span className="inline-block px-2 py-0.5 bg-[#2a2a3e] text-[#8888a0] rounded uppercase">
                {item.category}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="ml-4 text-[#8888a0] hover:text-[#e0e0e0] transition flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        {showIframe && item.url && item.url !== '#' ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a3e] bg-[#0f0f20]">
              <span className="text-xs text-[#555570]">
                {locale === 'tr' ? 'Orijinal Makale' : 'Original Article'}
              </span>
              <button
                onClick={() => setShowIframe(false)}
                className="text-xs text-[#4fc3f7] hover:text-[#ff9800] transition"
              >
                ← {locale === 'tr' ? 'Geri' : 'Back'}
              </button>
            </div>
            <iframe
              src={item.url}
              className="flex-1 w-full border-0"
              title="Article"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {item.imageUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={item.imageUrl}
                alt={item.title}
                className="max-w-full rounded border border-[#2a2a3e]"
                onError={e => ((e.target as HTMLImageElement).style.display = 'none')}
              />
            )}
            <p className="text-[#c0c0d0] leading-relaxed text-sm whitespace-pre-line">
              {item.summary}
            </p>

            {item.symbols && item.symbols.length > 0 && (
              <div className="pt-3 border-t border-[#2a2a3e]">
                <div className="text-[10px] text-[#555570] uppercase mb-2 tracking-wider">
                  {locale === 'tr' ? 'Bahsedilen Semboller' : 'Mentioned Symbols'}
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.symbols.map(sym => (
                    <span
                      key={sym}
                      className="px-2 py-1 bg-[#2a2a3e] text-[#ff9800] text-xs rounded font-mono"
                    >
                      {sym.replace('BINANCE:', '').replace('OANDA:', '').replace('_', '/')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* AXIOM Market Analysis */}
            {marketAnalysis && (
              <div className="pt-4 border-t border-[#2a2a3e]">
                <div className="text-[10px] text-[#ff9800] uppercase mb-2 font-semibold tracking-wider">
                  📊 {locale === 'tr' ? 'AXIOM Pazar Analizi' : 'AXIOM Market Analysis'}
                </div>
                <p className="text-[#c0c0d0] text-xs leading-relaxed whitespace-pre-line">
                  {marketAnalysis}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-[#2a2a3e] p-4 flex items-center justify-between gap-2">
          <span className="text-xs text-[#555570] flex-1">{item.source}</span>
          <div className="flex gap-2">
            {item.url && item.url !== '#' && (
              <>
                <button
                  onClick={() => setShowIframe(!showIframe)}
                  className="px-3 py-1.5 bg-[#1a2a3e] border border-[#2a4a6e] text-[#4fc3f7] hover:bg-[#1e3248] rounded text-xs transition"
                >
                  {locale === 'tr' ? '📖 Makale Oku' : '📖 Read Article'}
                </button>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#2a2a3e] hover:bg-[#3a3a4e] text-[#ff9800] rounded text-xs transition"
                >
                  {locale === 'tr' ? 'Yeni Sekmede' : 'New Tab'} ↗
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

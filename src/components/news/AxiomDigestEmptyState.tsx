'use client';

import { useEffect, useState } from 'react';

// For date display "Sen Uyurken..." checking standard hours
export default function AxiomDigestEmptyState({ locale }: { locale: 'en' | 'tr' }) {
  const [greeting, setGreeting] = useState('');
  
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 11) {
      setGreeting(locale === 'tr' ? '🌙 Sen Uyurken Piyasada Neler Oldu?' : '🌙 While You Were Sleeping:');
    } else if (hour > 18) {
      setGreeting(locale === 'tr' ? '🌇 Günün Özeti ve Axiom Tespiti' : '🌇 Daily Wrap-Up & Axiom Insights');
    } else {
      setGreeting(locale === 'tr' ? '⚡ Axiom Erken Uyarı Sistemi' : '⚡ Axiom Early Warning System');
    }
  }, [locale]);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#0d0d1a] p-4 md:p-8 overflow-y-auto">
      <div className="w-full max-w-4xl flex flex-col gap-6 animate-in fade-in zoom-in duration-500">
        
        {/* Header Section */}
        <div className="text-center mb-4">
          <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#e0e0e0] to-[#8888a0]">
            {greeting || '...'}
          </h1>
          <p className="text-[#8888a0] mt-2 text-sm max-w-2xl mx-auto">
            {locale === 'tr' 
              ? 'Kurumsal düzey piyasa tarama algoritmalarımız son 12 saatteki küresel verileri süzdü. İşte analist masalarından çıkan kritik sonuçlar.' 
              : 'Our institutional-grade algorithms have filtered global data over the last 12 hours. Here are the critical insights from our quant desks.'}
          </p>
        </div>

        {/* Sentiment Gauge / Overview */}
        <div className="bg-[#141425] border border-[#2a2a3e] rounded-xl p-5 shadow-[0_0_20px_rgba(79,195,247,0.05)] flex flex-col md:flex-row items-center gap-6">
          <div className="flex-shrink-0 relative">
            {/* Visual Gauge Mockup */}
            <svg width="120" height="60" viewBox="0 0 120 60" className="opacity-80">
              <path d="M 10 50 A 40 40 0 0 1 110 50" fill="none" stroke="#2a2a3e" strokeWidth="8" strokeLinecap="round" />
              {/* Colored active section */}
              <path d="M 10 50 A 40 40 0 0 1 80 18" fill="none" stroke="url(#sentimentGrad)" strokeWidth="8" strokeLinecap="round" />
              {/* Needle */}
              <polygon points="60,50 58,45 80,18 62,45" fill="#e0e0e0" />
              <circle cx="60" cy="50" r="4" fill="#e0e0e0" />
              <defs>
                <linearGradient id="sentimentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f44336" />
                  <stop offset="50%" stopColor="#ff9800" />
                  <stop offset="100%" stopColor="#4caf50" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute bottom-[-10px] w-full text-center text-xs font-bold text-[#ff9800]">
              {locale === 'tr' ? 'TEMKİNLİ İYİMSER' : 'CAUTIOUSLY OPTIMISTIC'}
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-[11px] text-[#4fc3f7] uppercase tracking-widest font-semibold mb-2">
              {locale === 'tr' ? 'Axiom Piyasa Eğilimi' : 'Axiom Market Sentiment'}
            </h3>
            <p className="text-[#c0c0d0] text-sm leading-relaxed">
              {locale === 'tr'
                ? '"Son 12 saatteki 80+ makro gelişim ışığında; Asya piyasalarında kriptoya yönelik satış baskısı zayıflarken, yaklaşan teknoloji bilançoları öncesi opsiyon masalarında sürpriz bir volatilitenin fiyatlandığını gözlemliyoruz."'
                : '"Based on 80+ macro developments in the last 12 hours; selling pressure on crypto in Asian markets is weakening, while we observe surprising volatility being priced in option desks ahead of upcoming tech earnings."'}
            </p>
          </div>
        </div>

        {/* 3 Actionable Insight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1: Risk */}
          <div className="bg-[#1a0f12] border border-[#5a1b1b] rounded-xl p-4 transition-transform hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(244,67,54,0.15)]">
            <div className="flex items-center gap-2 text-[#f44336] text-[10px] font-bold uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-[#f44336] animate-pulse"></span>
              Axiom Risk Radar
            </div>
            <h4 className="text-[#e0e0e0] text-sm font-semibold mb-2">
              {locale === 'tr' ? 'FED Tutanaklarında Gizli Şahin Duruş' : 'Hidden Hawkish Stance in Fed Minutes'}
            </h4>
            <p className="text-[#8888a0] text-xs leading-relaxed">
              {locale === 'tr'
                ? 'Makro Ekonomi Masamız, tutanak satır aralarında enflasyon katılığının beklendiğinden daha büyük bir risk olarak kodlandığını saptadı. Riskli varlıklarda bugün defansif ağırlık öneriliyor.'
                : 'Our Macro Economy Desk detected that inflation stickiness is coded as a larger risk than expected in the subtext. A defensive weight is recommended in risk assets today.'}
            </p>
          </div>

          {/* Card 2: Quant Fırsat */}
          <div className="bg-[#0f1a14] border border-[#1b5a3a] rounded-xl p-4 transition-transform hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(76,175,80,0.15)]">
            <div className="flex items-center gap-2 text-[#4caf50] text-[10px] font-bold uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-[#4caf50]"></span>
              Axiom Kantitatif Analiz
            </div>
            <h4 className="text-[#e0e0e0] text-sm font-semibold mb-2">
              {locale === 'tr' ? 'AAPL Opsiyonlarında Hacim Patlaması' : 'Volume Anomalies in AAPL Options'}
            </h4>
            <p className="text-[#8888a0] text-xs leading-relaxed">
              {locale === 'tr'
                ? 'Kantitatif Algoritmalarımız, AAPL kısa vadeli alım (call) opsiyonlarında son 3 saattir kurumsal seviyede blok alımlar tespit etti. Fiyatlanmamış bir bilanço beklentisi olabilir.'
                : 'Our Quant Algorithms detected institutional-level block buying in short-term AAPL call options over the last 3 hours. There may be unpriced earnings expectations.'}
            </p>
          </div>

          {/* Card 3: Watchlist Alert */}
          <div className="bg-[#1a180f] border border-[#5a4a1b] rounded-xl p-4 transition-transform hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(255,152,0,0.15)]">
            <div className="flex items-center gap-2 text-[#ff9800] text-[10px] font-bold uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-[#ff9800]"></span>
              {locale === 'tr' ? 'Portföy Sinyali' : 'Portfolio Signal'}
            </div>
            <h4 className="text-[#e0e0e0] text-sm font-semibold mb-2">
              {locale === 'tr' ? 'BTC / Kritik Destek Testi' : 'BTC / Critical Support Test'}
            </h4>
            <p className="text-[#8888a0] text-xs leading-relaxed">
              {locale === 'tr'
                ? 'Portföy Analiz Sistemimiz uyarıyor: Takip listenizdeki Bitcoin için offshore borsalardan satış akışı devam ediyor. Kantitatif destek seviyesi: $61,500.'
                : 'Our Portfolio Analysis System warns: Sell flow from offshore exchanges continues for Bitcoin on your watchlist. Quantitative support level: $61,500.'}
            </p>
          </div>

        </div>

        {/* Footer/Signature */}
        <div className="mt-6 pt-4 border-t border-[#2a2a3e] text-center">
          <p className="text-[#555570] text-[10px] font-mono tracking-widest uppercase flex items-center justify-center gap-2">
            <span>◆</span>
            {locale === 'tr' ? 'Axiom Analitik İstihbarat Masası Tarafından Oluşturuldu' : 'Generated by Axiom Analytical Intelligence Desk'}
            <span>◆</span>
          </p>
        </div>

      </div>
    </div>
  );
}

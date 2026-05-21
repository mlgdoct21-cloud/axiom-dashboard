/**
 * Teknik göstergeler kategorisi — fiyat-temelli analiz araçları.
 * AXIOM Technical tab ve dashboard chart panellerinde geçer.
 */

import type { GlossaryTerm } from './types';

export const TECHNICAL_TERMS: GlossaryTerm[] = [
  {
    slug: 'rsi', short: 'RSI', full_tr: 'Göreceli Güç Endeksi', full_en: 'Relative Strength Index',
    category: 'technical', subcategory: 'Momentum',
    what_is: 'Son 14 periyottaki ortalama yükselişin, ortalama düşüşe oranı (0-100). Fiyat momentumu ölçümü.',
    how_to_read: [
      { range: 'RSI > 70', emoji: '🔴', label: 'Aşırı alım', meaning: 'Düzeltme baskısı; geri çekilme yakın olabilir' },
      { range: 'RSI 50-70', emoji: '🟢', label: 'Yükseliş momentum', meaning: 'Trend devam ediyor' },
      { range: 'RSI 30-50', emoji: '🟡', label: 'Düşüş momentum', meaning: 'Zayıflık veya yatay rejim' },
      { range: 'RSI < 30', emoji: '🟢', label: 'Aşırı satım', meaning: 'Tepki yükselişi olabilir; kontekstle birlikte oku' },
    ],
    why_matters: 'Trend tükenmesi göstergesi. Yalnız kullanılmaz — divergence (fiyat yeni zirve ama RSI yapmıyor) en güçlü sinyal.',
    pitfall: 'Güçlü trendde RSI haftalarca >70 kalabilir; "aşırı alım" otomatik satış sinyali değildir.',
  },
  {
    slug: 'macd', short: 'MACD', full_tr: 'Hareketli Ortalama Yakınsama / Iraksama', full_en: 'MACD',
    category: 'technical', subcategory: 'Momentum',
    what_is: 'Kısa-dönem EMA (12) - uzun-dönem EMA (26) farkı. 9-period sinyal çizgisi ile birlikte trend dönüşü işareti.',
    why_matters: 'MACD çizgisinin sinyal çizgisini yukarı kesmesi = bullish crossover. Histogram sıfırın üstüne çıkarsa momentum pozitif.',
    pitfall: 'Yan piyasada (range-bound) çok yanlış sinyal üretir. Trending piyasada anlamlı.',
  },
  {
    slug: 'bollinger', short: 'Bollinger', full_tr: 'Bollinger Bantları', full_en: 'Bollinger Bands',
    category: 'technical', subcategory: 'Volatilite',
    what_is: '20-period MA + 2 standart sapma üst/alt bantları. Fiyat istatistiksel olarak %95 bant içinde kalır.',
    why_matters: 'Bant daralması (squeeze) = düşük volatilite + patlama hazırlığı. Bant genişlemesi = trend yürüyor.',
    pitfall: 'Bandın üstüne çıkmak otomatik "sat" sinyali değil; güçlü trendde fiyat bantta yürür ("walking the band").',
  },
  {
    slug: 'ma', short: 'MA', full_tr: 'Hareketli Ortalama', full_en: 'Moving Average',
    category: 'technical', subcategory: 'Trend',
    what_is: 'Son N periyodun kapanış fiyat ortalaması. Yaygın: 20, 50, 100, 200.',
    why_matters: '200 MA = ana trend referansı. Fiyat 200 MA üstündeyse bull, altındaysa bear çerçeve. 50 MA + 200 MA kesişimleri "altın haç" / "ölüm haçı".',
  },
  {
    slug: 'ema', short: 'EMA', full_tr: 'Üstel Hareketli Ortalama', full_en: 'Exponential Moving Average',
    category: 'technical', subcategory: 'Trend',
    what_is: 'Yeni fiyatlara daha fazla ağırlık veren hareketli ortalama. Aynı periyot için MA\'dan daha hızlı tepki verir.',
    why_matters: 'Hızlı trend dönüşlerini MA\'dan önce yakalar. 20 EMA + 50 EMA kombosu kısa-orta vade swing\'lerde tercih edilir.',
  },
  {
    slug: 'atr', short: 'ATR', full_tr: 'Ortalama Gerçek Aralık', full_en: 'Average True Range',
    category: 'technical', subcategory: 'Volatilite',
    what_is: 'Son N periyodun günlük fiyat aralığının ortalaması. Volatilitenin mutlak (dolar) ölçüsü.',
    why_matters: 'Stop-loss boyutunu hisse volatilitesine göre ölçeklendirmek için kullanılır. Yüksek ATR = geniş stop gerek; düşük ATR = sıkı stop.',
  },
  {
    slug: 'volume-profile', short: 'Volume Profile', full_tr: 'Hacim Profili', full_en: 'Volume Profile',
    category: 'technical', subcategory: 'Hacim',
    what_is: 'Belli bir tarih aralığında her fiyat seviyesinde işlem gören hacim. "Hangi seviyelerde takas yoğunluğu var?"',
    why_matters: 'POC (Point of Control) = en yüksek hacimli seviye. Fiyat oraya doğru çekilme eğilimi gösterir; "magnet" davranışı.',
  },
  {
    slug: 'fibonacci', short: 'Fibonacci', full_tr: 'Fibonacci Geri Çekilme', full_en: 'Fibonacci Retracement',
    category: 'technical', subcategory: 'Seviye',
    what_is: 'Bir trend hareketinin 23.6%, 38.2%, 50%, 61.8%, 78.6% seviyeleri. Geri çekilme veya genişleme ölçümü.',
    why_matters: 'Trader davranışı self-fulfilling — bir çok kişi 61.8 fib\'i izlediği için orada destek/direnç oluşur. Konfirmasyon için diğer göstergelerle birleştir.',
    pitfall: 'Hangi swing high/low seçildiğine göre tüm seviyeler değişir; subjektif. Tek başına alım/satım sinyali değil.',
  },
];

'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface PricingTabProps {
  locale: 'en' | 'tr';
}

interface Tier {
  name: string;
  price: string;
  period?: string;
  desc: string;
  features: string[];
  badge?: string;
  cta: string;
  highlighted: boolean;
  accent: 'slate' | 'cyan' | 'purple';
}

export default function PricingTab({ locale }: PricingTabProps) {
  const t = useTranslations('pricing');

  const tiers: Tier[] = [
    {
      name: t('tier1.name'),
      price: t('tier1.price'),
      period: t('tier1.period'),
      desc: t('tier1.desc'),
      features: [
        t('tier1.features.0'),
        t('tier1.features.1'),
        t('tier1.features.2'),
        t('tier1.features.3'),
        t('tier1.features.4'),
        t('tier1.features.5'),
      ],
      cta: locale === 'tr' ? 'Hemen Başla' : 'Get Started',
      highlighted: false,
      accent: 'slate',
    },
    {
      name: t('tier2.name'),
      price: t('tier2.price'),
      period: t('tier2.period'),
      desc: t('tier2.desc'),
      features: [
        t('tier2.features.0'),
        t('tier2.features.1'),
        t('tier2.features.2'),
        t('tier2.features.3'),
        t('tier2.features.4'),
        t('tier2.features.5'),
        t('tier2.features.6'),
      ],
      badge: t('tier2.badge'),
      cta: locale === 'tr' ? "Premium'a Geç" : 'Upgrade to Premium',
      highlighted: true,
      accent: 'cyan',
    },
    {
      name: t('tier3.name'),
      price: t('tier3.price'),
      period: t('tier3.period'),
      desc: t('tier3.desc'),
      features: [
        t('tier3.features.0'),
        t('tier3.features.1'),
        t('tier3.features.2'),
        t('tier3.features.3'),
        t('tier3.features.4'),
        t('tier3.features.5'),
        t('tier3.features.6'),
      ],
      badge: t('tier3.badge'),
      cta: locale === 'tr' ? "Advance'i Aç" : 'Activate Advance',
      highlighted: false,
      accent: 'purple',
    },
  ];

  const compareRows: { feature: string; free: string; premium: string; advance: string }[] = [
    {
      feature: locale === 'tr' ? 'Sembol başına analiz' : 'Symbols per analysis',
      free: locale === 'tr' ? '10 / gün' : '10 / day',
      premium: locale === 'tr' ? 'Sınırsız' : 'Unlimited',
      advance: locale === 'tr' ? 'Sınırsız' : 'Unlimited',
    },
    {
      feature: locale === 'tr' ? 'Teknik indikatörler' : 'Technical indicators',
      free: '5',
      premium: '9',
      advance: '9',
    },
    {
      feature: locale === 'tr' ? 'AI grafik yorumu' : 'AI chart commentary',
      free: '—',
      premium: '✓',
      advance: '✓',
    },
    {
      feature: locale === 'tr' ? 'Haber & makro brifing' : 'News & macro briefing',
      free: locale === 'tr' ? 'Günlük (5 dk gecikmeli)' : 'Daily (5 min delay)',
      premium: locale === 'tr' ? 'Anlık' : 'Real-time',
      advance: locale === 'tr' ? 'Anlık + 1 sa erken' : 'Real-time + 1h earlier',
    },
    {
      feature: locale === 'tr' ? 'Crypto Intel sorgusu' : 'Crypto Intel queries',
      free: locale === 'tr' ? '2 / 24 sa' : '2 / 24 h',
      premium: locale === 'tr' ? '30 / gün' : '30 / day',
      advance: locale === 'tr' ? 'Sınırsız' : 'Unlimited',
    },
    {
      feature: locale === 'tr' ? 'Whitepaper AI analizi' : 'Whitepaper AI analysis',
      free: '—',
      premium: '✓',
      advance: '✓',
    },
    {
      feature: locale === 'tr' ? 'Zincir-üstü uyarılar' : 'On-chain alerts',
      free: '—',
      premium: locale === 'tr' ? 'Standart' : 'Standard',
      advance: locale === 'tr' ? 'Gerçek zamanlı + özel eşik' : 'Real-time + custom thresholds',
    },
    {
      feature: locale === 'tr' ? 'Veri yenileme sıklığı' : 'Data refresh cadence',
      free: locale === 'tr' ? '6 saat' : '6 hours',
      premium: locale === 'tr' ? '1 saat' : '1 hour',
      advance: locale === 'tr' ? '30 dakika' : '30 minutes',
    },
    {
      feature: locale === 'tr' ? 'Telegram bot bildirim' : 'Telegram bot alerts',
      free: locale === 'tr' ? 'Brifing' : 'Briefing',
      premium: '✓',
      advance: locale === 'tr' ? '✓ + öncelik' : '✓ + priority',
    },
    {
      feature: locale === 'tr' ? 'Müşteri desteği' : 'Customer support',
      free: locale === 'tr' ? 'Topluluk' : 'Community',
      premium: locale === 'tr' ? 'E-posta' : 'Email',
      advance: locale === 'tr' ? 'Öncelikli' : 'Priority',
    },
  ];

  const faqs: { q: string; a: string }[] = locale === 'tr'
    ? [
        {
          q: 'Ücretsiz plandan Premium veya Advance\'e ne zaman geçebilirim?',
          a: 'İstediğiniz zaman, tek tıkla. Telegram bot içinden /upgrade komutu veya dashboard üzerindeki Yükselt butonu ile Stripe üzerinden ödeme yapabilirsiniz. Yükseltme anında devreye girer.',
        },
        {
          q: 'Aboneliğimi iptal edersem ne olur?',
          a: 'Herhangi bir taahhüt yoktur. İptal sonrası ücretli erişiminiz dönem sonuna kadar sürer; otomatik olarak Ücretsiz plana düşer ve verileriniz korunur.',
        },
        {
          q: 'Premium ile Advance arasındaki temel fark nedir?',
          a: 'Premium aktif yatırımcı için yeterli — sınırsız analiz ve anlık brifing. Advance ise gerçek zamanlı zincir-üstü uyarı, özel eşik tanımı, 30 dk yenileme ve sabah brifinginin 1 saat erken gönderilmesi gibi trader-grade özellikleri içerir.',
        },
        {
          q: 'Ödeme nasıl alınıyor?',
          a: 'Tüm ödemeler Stripe altyapısı üzerinden işlenir. Kredi/banka kartı bilgileriniz AXIOM sunucularında saklanmaz; PCI-DSS uyumlu Stripe ortamında tutulur.',
        },
        {
          q: 'Veriler ne kadar güvenilir?',
          a: 'CryptoQuant Pro, FMP Premium, FRED, TCMB EVDS3 ve Stripe gibi kurumsal kaynaklardan canlı çekiyoruz. Her veri kaynağı için bağımsız sağlamlık sondası ve sürpriz/dış değer doğrulayıcıları çalışır.',
        },
      ]
    : [
        {
          q: 'When can I upgrade from Free to Premium or Advance?',
          a: 'Anytime, in one click. Use the /upgrade command in the Telegram bot or the Upgrade button on the dashboard to pay via Stripe. Upgrades take effect immediately.',
        },
        {
          q: 'What happens if I cancel my subscription?',
          a: 'No commitments. Paid access continues until the end of the billing period, then automatically drops to Free. Your data is preserved.',
        },
        {
          q: 'What is the key difference between Premium and Advance?',
          a: 'Premium covers the active investor — unlimited analysis and real-time briefing. Advance adds trader-grade features: real-time on-chain alerts, custom thresholds, 30-minute refresh, and the morning briefing delivered 1 hour earlier.',
        },
        {
          q: 'How are payments processed?',
          a: 'All payments are handled through Stripe. Card details are never stored on AXIOM servers — they live entirely in PCI-DSS compliant Stripe infrastructure.',
        },
        {
          q: 'How reliable is the data?',
          a: 'We pull live from institutional sources including CryptoQuant Pro, FMP Premium, FRED, TCMB EVDS3 and Stripe. Each source is monitored by independent reliability probes and outlier validators.',
        },
      ];

  const accentClass = (a: Tier['accent'], on: boolean) => {
    if (a === 'cyan') return on ? 'border-cyan-400/60 shadow-cyan-500/10' : '';
    if (a === 'purple') return on ? 'border-purple-400/40 shadow-purple-500/10' : '';
    return '';
  };

  return (
    <div className="space-y-16 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="text-center space-y-3 pt-6">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-400/80 font-semibold">
          {locale === 'tr' ? 'AXIOM Üyelik' : 'AXIOM Membership'}
        </p>
        <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">{t('title')}</h1>
        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">{t('description')}</p>
        <p className="text-xs text-slate-500 pt-1">
          {locale === 'tr'
            ? 'Hiçbir gizli ücret yok • İstediğin zaman iptal et • Stripe güvenli ödeme'
            : 'No hidden fees • Cancel anytime • Secure Stripe checkout'}
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
        {tiers.map((tier, index) => (
          <div
            key={index}
            className={`relative rounded-2xl border bg-slate-900/40 backdrop-blur transition-all duration-300 hover:-translate-y-1 ${
              tier.highlighted
                ? `border-cyan-400/60 shadow-2xl shadow-cyan-500/10 md:scale-[1.03] bg-gradient-to-b from-slate-900/80 to-slate-900/30`
                : `border-slate-800 hover:border-slate-700 ${accentClass(tier.accent, true)}`
            }`}
          >
            {/* Badge */}
            {tier.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                <span
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase shadow-lg ${
                    tier.accent === 'cyan'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-cyan-500/30'
                      : 'bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white shadow-purple-500/30'
                  }`}
                >
                  {tier.badge}
                </span>
              </div>
            )}

            <div className="p-7 sm:p-8 space-y-6">
              {/* Title */}
              <div className="space-y-1">
                <h3 className="text-xl font-semibold text-white tracking-tight">{tier.name}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{tier.desc}</p>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-1.5 border-b border-slate-800 pb-6">
                <span className="text-4xl font-bold text-white tracking-tight tabular-nums">{tier.price}</span>
                {tier.period && <span className="text-sm text-slate-500">{tier.period}</span>}
              </div>

              {/* CTA */}
              <Link
                href="/auth/register"
                className={`block w-full py-2.5 px-4 rounded-lg font-semibold text-sm text-center transition-all ${
                  tier.highlighted
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400 shadow-lg shadow-cyan-500/20'
                    : tier.accent === 'purple'
                      ? 'bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white hover:from-purple-500 hover:to-fuchsia-400 shadow-lg shadow-purple-500/20'
                      : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'
                }`}
              >
                {tier.cta}
              </Link>

              {/* Features */}
              <ul className="space-y-2.5 pt-2">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm">
                    <svg
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        tier.accent === 'cyan'
                          ? 'text-cyan-400'
                          : tier.accent === 'purple'
                            ? 'text-purple-400'
                            : 'text-emerald-400'
                      }`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 5.29a1 1 0 00-1.408-1.418L8 11.168 4.704 7.872a1 1 0 10-1.408 1.418l4 4.005a1 1 0 001.408 0l8-8.005z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-slate-300 leading-snug">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison Table */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {locale === 'tr' ? 'Plan Karşılaştırması' : 'Plan Comparison'}
          </h2>
          <p className="text-sm text-slate-500">
            {locale === 'tr'
              ? 'Her plana dahil olan özellikler — yan yana'
              : 'Side-by-side breakdown of every feature'}
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60">
                <th className="px-5 py-4 text-left text-slate-300 font-semibold uppercase text-xs tracking-wider">
                  {locale === 'tr' ? 'Özellik' : 'Feature'}
                </th>
                <th className="px-5 py-4 text-center text-slate-400 font-semibold uppercase text-xs tracking-wider">
                  {locale === 'tr' ? 'Ücretsiz' : 'Free'}
                </th>
                <th className="px-5 py-4 text-center text-cyan-400 font-semibold uppercase text-xs tracking-wider">
                  Premium
                </th>
                <th className="px-5 py-4 text-center text-purple-400 font-semibold uppercase text-xs tracking-wider">
                  Advance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {compareRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-5 py-3.5 text-slate-200 font-medium">{row.feature}</td>
                  <td className="px-5 py-3.5 text-center text-slate-500">{row.free}</td>
                  <td className="px-5 py-3.5 text-center text-slate-200">{row.premium}</td>
                  <td className="px-5 py-3.5 text-center text-slate-200">{row.advance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {locale === 'tr' ? 'Sık Sorulan Sorular' : 'Frequently Asked Questions'}
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <details
              key={idx}
              className="group rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-colors open:border-cyan-500/30"
            >
              <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none">
                <span className="font-semibold text-white text-sm sm:text-base">{faq.q}</span>
                <svg
                  className="w-5 h-5 text-slate-500 transition-transform group-open:rotate-180 shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </summary>
              <p className="px-5 pb-5 text-sm text-slate-400 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Final CTA */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 via-slate-900/40 to-slate-900/80 p-8 sm:p-12 text-center space-y-5">
        <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          {locale === 'tr' ? 'Hangi planın doğru olduğundan emin değil misin?' : 'Not sure which plan fits?'}
        </h3>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          {locale === 'tr'
            ? 'Ücretsiz plan ile başla, ihtiyacın geliştikçe Premium veya Advance\'e geç. Taahhüt yok, geçişler anında.'
            : 'Start free, upgrade to Premium or Advance whenever your needs grow. No commitment — switches are instant.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/auth/register"
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-semibold text-sm hover:from-cyan-400 hover:to-blue-400 transition-all shadow-lg shadow-cyan-500/20"
          >
            {locale === 'tr' ? 'Ücretsiz Başla' : 'Start Free'}
          </Link>
          <Link
            href="mailto:contact@axiom.io"
            className="px-6 py-2.5 bg-slate-800 text-white rounded-lg font-semibold text-sm hover:bg-slate-700 transition-all border border-slate-700"
          >
            {locale === 'tr' ? 'Bize Ulaş' : 'Contact Us'}
          </Link>
        </div>
      </div>
    </div>
  );
}

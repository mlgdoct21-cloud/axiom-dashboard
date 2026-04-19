'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface PricingTabProps {
  locale: 'en' | 'tr';
}

export default function PricingTab({ locale }: PricingTabProps) {
  const t = useTranslations('pricing');

  const tiers = [
    {
      name: t('tier1.name'),
      price: t('tier1.price'),
      desc: t('tier1.desc'),
      features: [
        t('tier1.features.0'),
        t('tier1.features.1'),
        t('tier1.features.2'),
        t('tier1.features.3'),
        t('tier1.features.4'),
      ],
      cta: locale === 'tr' ? 'Hemen Başla' : 'Get Started',
      highlighted: false,
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
      cta: locale === 'tr' ? 'Pro\'ya Yükselt' : 'Upgrade to Pro',
      highlighted: true,
    },
    {
      name: t('tier3.name'),
      price: t('tier3.price'),
      desc: t('tier3.desc'),
      features: [
        t('tier3.features.0'),
        t('tier3.features.1'),
        t('tier3.features.2'),
        t('tier3.features.3'),
        t('tier3.features.4'),
        t('tier3.features.5'),
      ],
      cta: locale === 'tr' ? 'İletişime Geç' : 'Contact Sales',
      highlighted: false,
    },
  ];

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-white">{t('title')}</h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">{t('description')}</p>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {tiers.map((tier, index) => (
          <div
            key={index}
            className={`relative rounded-xl transition-smooth hover:shadow-lg ${
              tier.highlighted
                ? 'bg-gradient-to-br from-purple-600/20 to-cyan-600/20 border-2 border-purple-500 shadow-lg shadow-purple-500/20 md:scale-105'
                : 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 hover:border-cyan-500/30'
            }`}
          >
            {/* Badge */}
            {tier.badge && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-purple-600 to-cyan-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  {tier.badge}
                </span>
              </div>
            )}

            <div className="p-8 space-y-6">
              {/* Title */}
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                <p className="text-sm text-slate-400">{tier.desc}</p>
              </div>

              {/* Price */}
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white">{tier.price}</span>
                  {tier.period && <span className="text-slate-400">{tier.period}</span>}
                </div>
              </div>

              {/* CTA Button */}
              <Link
                href="/auth/register"
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-smooth text-center ${
                  tier.highlighted
                    ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:from-purple-700 hover:to-cyan-600 shadow-lg'
                    : 'bg-slate-700 text-white hover:bg-slate-600 border border-slate-600'
                }`}
              >
                {tier.cta}
              </Link>

              {/* Features */}
              <div className="space-y-3 border-t border-slate-700 pt-6">
                {tier.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                    <span className="text-slate-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison Table */}
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-white text-center">{locale === 'tr'
          ? 'Ayrıntılı Karşılaştırma'
          : 'Detailed Comparison'
        }</h2>

        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/50 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 text-left text-slate-300 font-semibold">{locale === 'tr' ? 'Özellikler' : 'Features'}</th>
                <th className="px-6 py-4 text-left text-slate-300 font-semibold">{locale === 'tr' ? 'Başlangıç' : 'Starter'}</th>
                <th className="px-6 py-4 text-left text-slate-300 font-semibold">Pro</th>
                <th className="px-6 py-4 text-left text-slate-300 font-semibold">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {[
                { feature: locale === 'tr' ? 'Temel Analiz Sembolleri' : 'Fundamental Symbols', starter: '10', pro: '∞', enterprise: '∞' },
                { feature: locale === 'tr' ? 'Teknik İndikatörler' : 'Technical Indicators', starter: '5', pro: '9', enterprise: '9' },
                { feature: locale === 'tr' ? 'Haber Özeti' : 'News Summary', starter: locale === 'tr' ? 'Günlük' : 'Daily', pro: locale === 'tr' ? 'Gerçek zamanlı' : 'Real-time', enterprise: locale === 'tr' ? 'Gerçek zamanlı' : 'Real-time' },
                { feature: locale === 'tr' ? 'AI Grafik Analizi' : 'AI Chart Analysis', starter: '❌', pro: '✓', enterprise: '✓' },
                { feature: locale === 'tr' ? 'Portföy Takibi' : 'Portfolio Tracking', starter: '❌', pro: '✓', enterprise: '✓' },
                { feature: locale === 'tr' ? 'API Erişimi' : 'API Access', starter: '❌', pro: '❌', enterprise: '✓' },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 text-slate-300 font-medium">{row.feature}</td>
                  <td className="px-6 py-4 text-slate-400">{row.starter}</td>
                  <td className="px-6 py-4 text-slate-300">{row.pro}</td>
                  <td className="px-6 py-4 text-slate-300">{row.enterprise}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-white text-center">{locale === 'tr'
          ? 'Sık Sorulan Sorular'
          : 'Frequently Asked Questions'
        }</h2>

        <div className="space-y-4">
          {[
            {
              q: locale === 'tr' ? 'Ücretsiz plandan Pro\'ya yükseltebilir miyim?' : 'Can I upgrade from Free to Pro?',
              a: locale === 'tr' ? 'Evet, istediğiniz zaman yükseltebilirsiniz. Sormla yazılı hale gelmez.' : 'Yes, you can upgrade anytime. Changes take effect immediately.'
            },
            {
              q: locale === 'tr' ? 'İptal etmek istersem ne olur?' : 'What if I want to cancel?',
              a: locale === 'tr' ? 'Herhangi bir zaman iptal edebilirsiniz. Sonraki ödeme dönemine kadar erişim bulunur.' : 'You can cancel anytime. Access continues until the next billing cycle.'
            },
            {
              q: locale === 'tr' ? 'Enterprise planı hakkında daha fazla bilgi?' : 'More about Enterprise plan?',
              a: locale === 'tr' ? 'Enterprise planı özel ihtiyaçlar için tasarlanmıştır. Satış ekibimizle iletişime geçiniz.' : 'Enterprise plan is customized for your needs. Contact our sales team.'
            },
          ].map((faq, idx) => (
            <div key={idx} className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-2">{faq.q}</h3>
              <p className="text-slate-400">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center space-y-4 py-12">
        <p className="text-slate-400">{locale === 'tr'
          ? 'Hangi plandan başlamak isteyeceğinizden emin değil misiniz?'
          : 'Not sure which plan to start with?'
        }</p>
        <Link
          href="mailto:contact@axiom.io"
          className="inline-block px-8 py-3 bg-gradient-to-r from-purple-600 to-cyan-500 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-cyan-600 transition-smooth"
        >
          {locale === 'tr' ? 'Bizimle İletişime Geç' : 'Contact Us'}
        </Link>
      </div>
    </div>
  );
}

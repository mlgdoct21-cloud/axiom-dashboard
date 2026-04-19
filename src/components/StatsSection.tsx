'use client';

import { useLocale } from 'next-intl';
import StatCounter from '@/components/StatCounter';

export default function StatsSection() {
  const locale = useLocale() as 'en' | 'tr';

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="grid md:grid-cols-3 gap-6">
        <StatCounter
          endValue={50000}
          label={locale === 'tr' ? 'Aktif Kullanıcı' : 'Active Users'}
          suffix="+"
          useLocale={locale}
        />
        <StatCounter
          endValue={2500000}
          label={locale === 'tr' ? 'Analiz Edilen İşlem' : 'Trades Analyzed'}
          suffix="+"
          useLocale={locale}
        />
        <StatCounter
          endValue={95}
          label={locale === 'tr' ? 'Sinyal Doğruluğu' : 'Signal Accuracy'}
          suffix="%"
          useLocale={locale}
        />
      </div>
    </section>
  );
}

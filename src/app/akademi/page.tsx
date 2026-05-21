import { Suspense } from 'react';
import AcademyClient from '@/components/academy/AcademyClient';

export const metadata = {
  title: 'AXIOM Opsiyon Akademisi — Türkçe sezgi diliyle opsiyon ve hedge kültürü',
  description:
    'AXIOM Opsiyon Akademisi: 4 modül, 16 ders. Türkçe sezgi diliyle opsiyon, Greeks ve hedge stratejileri. Saat çarkı (horology) metaforu. Eğitim amaçlıdır.',
};

export default function AkademiPage() {
  return (
    <main className="min-h-screen bg-[#0e0e1a] text-white">
      <Suspense fallback={<div className="p-8 text-gray-400">Yükleniyor…</div>}>
        <AcademyClient />
      </Suspense>
    </main>
  );
}

'use client';

import { useEffect, useState } from 'react';

/**
 * Theta çarkı v1 — saat metaforuyla Theta'nın "zaman kaybı hızını" gösterir.
 *
 * Vade slider'ı (1g - 180g) çarkın dönme hızını ve mainspring'in
 * doluluk oranını belirler. Vadeye yaklaşınca beat rate hızlanır.
 *
 * Bu görsel metafor — gerçek opsiyon hesabı yok. v2 (Faz 3) canlı kontrata bağlanır.
 */
export default function ThetaWheel() {
  const [daysToExpiry, setDaysToExpiry] = useState(30);

  // Mainspring doluluğu: 1g → ~5%, 180g → 100%.
  const fillPercent = Math.max(5, Math.min(100, (daysToExpiry / 180) * 100));
  // Beat rate (saniye/tıkırtı): vade uzun → yavaş; vade kısa → hızlı.
  // 180g'de ~6s/tur, 1g'de ~0.5s/tur.
  const rotationSeconds = Math.max(0.5, 0.5 + (daysToExpiry / 180) * 5.5);

  // Tooltip — vadeye göre kullanıcıya horology dili.
  let phrase = 'Mainspring kurulu — escapement yavaş tıkırdar.';
  if (daysToExpiry <= 7) phrase = 'Mainspring boşalmak üzere — beat rate uçtu.';
  else if (daysToExpiry <= 30) phrase = 'Mainspring yarıya indi — escapement hızlandı.';
  else if (daysToExpiry <= 90) phrase = 'Mainspring boşalıyor — tıkırtı normal.';

  return (
    <div className="w-full max-w-md mx-auto rounded-xl border border-[#26314a] bg-[#161629] p-6">
      <div className="text-xs font-semibold text-[#a78bfa] uppercase tracking-wider mb-3">
        🕰️ Theta Çarkı — Zaman Kaybı Hızı
      </div>

      <div className="relative w-48 h-48 mx-auto my-4">
        {/* Dış çerçeve — saat gövdesi */}
        <div className="absolute inset-0 rounded-full border-4 border-[#a78bfa]/30 bg-gradient-to-br from-[#1a1a2e] to-[#0e0e1a]" />

        {/* Mainspring sarılı kısım — conic gradient */}
        <div
          className="absolute inset-3 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, #a78bfa ${fillPercent}%, #26314a ${fillPercent}% 100%)`,
          }}
          aria-hidden
        />

        {/* İç merkez */}
        <div className="absolute inset-8 rounded-full bg-[#0e0e1a] border border-[#26314a] flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#a78bfa]">{daysToExpiry}</div>
            <div className="text-[10px] text-gray-400 uppercase">gün vade</div>
          </div>
        </div>

        {/* Escapement iğne — dönen ibre */}
        <div
          className="absolute inset-0 flex items-start justify-center pointer-events-none"
          style={{
            animation: `axiom-spin ${rotationSeconds}s linear infinite`,
            transformOrigin: 'center',
          }}
        >
          <div className="w-0.5 h-20 bg-gradient-to-b from-[#26de81] to-transparent rounded-full mt-4" />
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center mb-4 min-h-[2.5rem]">{phrase}</p>

      <label className="block text-xs text-gray-400 mb-2">
        Vade (gün): <span className="text-white font-mono">{daysToExpiry}</span>
      </label>
      <input
        type="range"
        min={1}
        max={180}
        value={daysToExpiry}
        onChange={(e) => setDaysToExpiry(Number(e.target.value))}
        className="w-full accent-[#a78bfa]"
        aria-label="Vade gün sayısı"
      />
      <div className="flex justify-between text-[10px] text-gray-500 mt-1">
        <span>1g · hızlı tıkırtı</span>
        <span>180g · yavaş tıkırtı</span>
      </div>

      <style jsx>{`
        @keyframes axiom-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

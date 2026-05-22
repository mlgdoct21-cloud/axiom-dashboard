'use client';

import { useAuth } from '@/hooks/useAuth';

// Hardcoded: Vercel env eski değer taşıyıp override ediyordu — bkz settings/page.
const BOT_USERNAME = 'AxiomAnaliz_Bot';
const LOGIN_DEEP_LINK = `https://t.me/${BOT_USERNAME}?start=login`;

const TIER_BADGE: Record<string, { label: string; cls: string }> = {
  free: { label: 'Free', cls: 'bg-[#2a2a3e] text-[#8888a0] border-[#3a3a52]' },
  premium: { label: '🌟 Premium', cls: 'bg-[#a78bfa]/15 text-[#c4b5fd] border-[#a78bfa]/40' },
  advance: { label: '🚀 Advance', cls: 'bg-[#4fc3f7]/15 text-[#7dd3fc] border-[#4fc3f7]/40' },
};

/**
 * /tr header'ındaki giriş/çıkış kontrolü. /tr'de görünür bir auth girişi yoktu;
 * kullanıcı yalnızca Telegram bot'una /login yazıp gelen linkle girebiliyordu
 * (keşfedilemez). Bu component durumu görünür kılar:
 *   - Giriş yapılmamış → "Giriş Yap" → bot login deep-link (tek-tık)
 *   - Giriş yapılmış   → tier rozeti + kullanıcı + "Çıkış"
 */
export default function AuthControl() {
  const { user, logout, isLoading } = useAuth();

  // İlk auth kontrolü tamamlanana dek hiçbir şey gösterme — yoksa kısa süreli
  // "Giriş Yap" → "Çıkış" zıplaması olur.
  if (isLoading) {
    return <span className="w-16 h-6" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <a
        href={LOGIN_DEEP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        title="Telegram ile giriş yap"
        className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold text-white bg-[#4fc3f7]/90 hover:bg-[#4fc3f7] transition"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
        Giriş Yap
      </a>
    );
  }

  const tier = (user.tier || 'free').toLowerCase();
  const badge = TIER_BADGE[tier] ?? TIER_BADGE.free;

  return (
    <div className="flex items-center gap-2">
      <span
        className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.cls}`}
        title={`Abonelik: ${badge.label}`}
      >
        {badge.label}
      </span>
      <span className="hidden md:inline text-xs text-[#8888a0] max-w-[120px] truncate">
        {user.username || user.telegram_id}
      </span>
      <button
        onClick={() => logout()}
        title="Çıkış yap"
        className="px-2.5 py-1 rounded text-xs font-medium text-[#8888a0] hover:text-[#e0e0e0] hover:bg-[#1e1e38] transition"
      >
        Çıkış
      </button>
    </div>
  );
}

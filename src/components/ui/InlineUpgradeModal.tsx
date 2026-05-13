'use client';

/**
 * In-page upgrade popup.
 *
 * Replaces the legacy pattern of `<a href="t.me/bot?start=upgrade_X">` external
 * redirects. Tıklanan modal context'i (örn. Makro Pulse) kapanmıyor; kullanıcı
 * istediği yöntemi seçip ya devam ediyor ya kapatıyor.
 *
 * Üç yol gösteriyor:
 *  1. Zaten abonem  → /auth/login (next param ile mevcut sayfaya döner)
 *  2. Yeni abonelik → Telegram bot /upgrade akışı (yeni sekme — explicit user choice)
 *  3. Vazgeç       → X ile kapat
 *
 * Stripe live-checkout dashboard'a entegre edildiğinde (1) ve (2) Stripe Checkout
 * URL'i ile değiştirilecek — şu an backend `/billing/checkout` sadece bot internal
 * secret ile çağrılabiliyor (Stripe tax registrations pending).
 */

import { useEffect } from 'react';

const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME || 'axiom_finansal_bot';

export type UpgradeTier = 'premium' | 'advance';

interface InlineUpgradeModalProps {
  open: boolean;
  onClose: () => void;
  targetTier: UpgradeTier;
  reason?: string;
}

const TIER_META: Record<UpgradeTier, {
  emoji: string;
  label: string;
  price: string;
  accent: string;
  features: string[];
}> = {
  premium: {
    emoji: '💎',
    label: 'PREMIUM',
    price: '$1.99/ay',
    accent: '#26de81',
    features: [
      'Tüm makro yorumları sınırsız',
      'Tam analiz · ağırlık matematiği · Fed reaksiyonu',
      'Anlık alert (günde 3)',
      'Sabah brifingi 09:00 TR',
    ],
  },
  advance: {
    emoji: '🚀',
    label: 'ADVANCE',
    price: '$4.99/ay',
    accent: '#a78bfa',
    features: [
      'Premium tüm özellikleri',
      'Sınırsız anlık alarm',
      'Senaryo hesabı · trend matematiği',
      'Revizyon push alert',
      'Brifing 1 saat erken (08:00 TR)',
    ],
  },
};

function hasAuthToken(): boolean {
  // axiom_auth JSON içinde access_token saklı (lib/api.ts şeması).
  // Eskiden bare 'auth_token' okunuyordu → her zaman false → giriş yapmış
  // kullanıcılara bile "Zaten Abonem · Giriş Yap" gösteriyordu (2026-05-13 bug).
  if (typeof window === 'undefined') return false;
  const AUTH_KEY = process.env.NEXT_PUBLIC_AUTH_STORAGE_KEY || 'axiom_auth';
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return false;
  try {
    return !!JSON.parse(raw)?.access_token;
  } catch {
    return false;
  }
}

export default function InlineUpgradeModal({
  open,
  onClose,
  targetTier,
  reason,
}: InlineUpgradeModalProps) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const meta = TIER_META[targetTier];
  const authed = hasAuthToken();
  // /auth/login'e dönüş URL'ini sakla; backend Stripe live olduğunda buradan
  // checkout'a yönlendirme yapılır.
  const nextParam =
    typeof window !== 'undefined'
      ? encodeURIComponent(window.location.pathname + window.location.search)
      : '';
  const loginHref = `/auth/login${nextParam ? `?next=${nextParam}` : ''}`;
  const telegramHref = `https://t.me/${BOT_USERNAME}?start=upgrade_${targetTier}`;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-[#141425] border border-[#2a2a3e] rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a3e]">
          <h2 className="text-sm font-semibold text-[#e0e0e0] flex items-center gap-2">
            <span className="text-base">{meta.emoji}</span>
            {meta.label} ile Devam Et
          </h2>
          <button
            onClick={onClose}
            className="text-[#8888a0] hover:text-[#e0e0e0] transition text-lg leading-none w-7 h-7 flex items-center justify-center rounded hover:bg-[#1f1f3a]"
            title="Kapat (Esc)"
            aria-label="Kapat"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4">
          {reason && (
            <p className="text-[12px] text-[#a0a0b8] leading-relaxed">{reason}</p>
          )}

          {/* Plan card */}
          <div
            className="rounded-lg p-4 border-2"
            style={{ borderColor: `${meta.accent}66`, background: '#0d0d1a' }}
          >
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-base font-bold" style={{ color: meta.accent }}>
                {meta.emoji} {meta.label}
              </span>
              <span className="text-sm font-mono" style={{ color: meta.accent }}>
                {meta.price}
              </span>
            </div>
            <ul className="text-[12px] text-[#c0c0d0] space-y-1 leading-relaxed">
              {meta.features.map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-1">
            {authed ? (
              <>
                <a
                  href={telegramHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center px-4 py-2.5 rounded-lg font-semibold text-[13px] transition"
                  style={{
                    background: `linear-gradient(90deg, ${meta.accent}33, ${meta.accent}22)`,
                    color: meta.accent,
                    border: `1px solid ${meta.accent}55`,
                  }}
                >
                  {meta.emoji} Telegram'da {meta.label}'a Yükselt
                </a>
                <p className="text-[10px] text-[#666] text-center">
                  Telegram bot'u açılır, planı seçip Stripe ile ödersin.
                  Yükseltme anında devreye girer.
                </p>
              </>
            ) : (
              <>
                <a
                  href={loginHref}
                  className="block w-full text-center px-4 py-2.5 rounded-lg font-semibold text-[13px] bg-[#1f1f3a] hover:bg-[#26264a] text-[#e0e0f0] border border-[#3a3a5a] transition"
                >
                  🔑 Zaten Aboneyim · Giriş Yap
                </a>
                <a
                  href={telegramHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center px-4 py-2.5 rounded-lg font-semibold text-[13px] transition"
                  style={{
                    background: `linear-gradient(90deg, ${meta.accent}33, ${meta.accent}22)`,
                    color: meta.accent,
                    border: `1px solid ${meta.accent}55`,
                  }}
                >
                  {meta.emoji} Yeni Abonelik · Telegram'da Devam Et
                </a>
                <p className="text-[10px] text-[#666] text-center">
                  Yeni aboneler Telegram bot üzerinden Stripe Checkout'a yönlendirilir.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

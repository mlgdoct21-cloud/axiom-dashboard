'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuotaSummary, QuotaCommandStatus } from '@/hooks/useQuotaSummary';
import { UserTier } from '@/lib/api';

const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME || 'axiom_finansal_bot';
const UPGRADE_URL = `https://t.me/${BOT_USERNAME}?start=upgrade_premium`;

const COMMAND_LABELS: Record<string, { emoji: string; tr: string }> = {
  crypto_overview: { emoji: '📄', tr: 'Whitepaper' },
  crypto_onchain:  { emoji: '🔗', tr: 'On-Chain' },
};

interface Props {
  /** Tier from useAuth().user.tier — drives chip color/label even before
   *  the summary fetch resolves, so the badge doesn't flicker. */
  tier: UserTier | undefined;
}

export function QuotaBadge({ tier }: Props) {
  const { summary, loading } = useQuotaSummary();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Click-outside to close.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Tier source priority: summary > prop. Backend can flip tier (admin)
  // even if the JWT-decoded user object is stale.
  const effectiveTier: UserTier = (summary?.tier as UserTier) || tier || 'free';

  const totalRemaining = summary
    ? Object.values(summary.quotas).reduce(
        (sum, q) => sum + (q.remaining ?? 0),
        0,
      )
    : null;
  const totalLimit = summary
    ? Object.values(summary.quotas).reduce(
        (sum, q) => sum + (q.limit ?? 0),
        0,
      )
    : null;

  const chipStyles = pickChipStyles(effectiveTier, totalRemaining);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Kullanım hakların"
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-medium transition cursor-pointer ${chipStyles.chip}`}
      >
        <span>{chipStyles.icon}</span>
        <span className="font-semibold">{chipStyles.label}</span>
        {effectiveTier === 'free' && totalLimit != null && totalRemaining != null && (
          <span className="font-mono opacity-90">
            {totalRemaining}/{totalLimit}
          </span>
        )}
        {loading && (
          <span className="w-1 h-1 rounded-full bg-current opacity-50 animate-pulse" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 z-50 rounded-lg border border-[#2a2a3e] bg-[#1a1a2e] shadow-xl shadow-black/40 p-3">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#2a2a3e]">
            <span className="text-xs uppercase tracking-wider text-[#888]">Üyelik</span>
            <span className={`text-xs font-bold ${chipStyles.text}`}>
              {chipStyles.icon} {tierFullName(effectiveTier)}
            </span>
          </div>

          {summary ? (
            <>
              <div className="space-y-1.5 text-[12px]">
                {Object.entries(summary.quotas).map(([cmd, q]) => (
                  <CommandRow key={cmd} cmd={cmd} q={q} tier={effectiveTier} />
                ))}
              </div>

              {effectiveTier === 'free' && (
                <ResetLine resetAt={summary.reset_at} />
              )}

              {effectiveTier === 'free' && totalRemaining === 0 && (
                <a
                  href={UPGRADE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 block w-full text-center px-3 py-2 rounded-md bg-gradient-to-r from-[#a78bfa] to-[#4fc3f7] text-white text-xs font-semibold hover:opacity-90 transition"
                >
                  💎 Yükselt — Telegram'da Devam Et
                </a>
              )}
            </>
          ) : (
            <p className="text-xs text-[#666] py-2">Yükleniyor…</p>
          )}
        </div>
      )}
    </div>
  );
}

function CommandRow({ cmd, q, tier }: { cmd: string; q: QuotaCommandStatus; tier: UserTier }) {
  const meta = COMMAND_LABELS[cmd] ?? { emoji: '•', tr: cmd };
  const unlimited = q.limit == null;
  return (
    <div className="flex items-center justify-between text-[#c0c0d0]">
      <span>
        {meta.emoji} {meta.tr}
      </span>
      {unlimited ? (
        <span className="font-mono text-[#26de81]">∞</span>
      ) : (
        <span
          className={`font-mono ${
            (q.remaining ?? 0) === 0
              ? 'text-[#ef4444]'
              : (q.remaining ?? 0) === 1
                ? 'text-[#fbbf24]'
                : 'text-[#c0c0d0]'
          }`}
        >
          {q.used}/{q.limit}
        </span>
      )}
    </div>
  );
}

function ResetLine({ resetAt }: { resetAt: string | null }) {
  if (!resetAt) return null;
  const reset = new Date(resetAt);
  const ms = reset.getTime() - Date.now();
  if (ms <= 0) return null;
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const hhmm = reset.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const rel = hours > 0 ? `${hours}sa ${minutes}dk sonra` : `${minutes}dk sonra`;
  return (
    <p className="mt-2 pt-2 border-t border-[#2a2a3e] text-[10px] text-[#666]">
      ⏱ Sıfırlanma: {hhmm} ({rel})
    </p>
  );
}

function tierFullName(t: UserTier): string {
  if (t === 'premium') return 'Premium';
  if (t === 'advance') return 'Advance';
  return 'Ücretsiz';
}

function pickChipStyles(tier: UserTier, remaining: number | null) {
  if (tier === 'premium') {
    return {
      icon: '💎',
      label: 'Premium',
      text: 'text-[#26de81]',
      chip: 'border-[#26de81]/40 bg-[#26de81]/10 text-[#26de81] hover:bg-[#26de81]/20',
    };
  }
  if (tier === 'advance') {
    return {
      icon: '🚀',
      label: 'Advance',
      text: 'text-[#a78bfa]',
      chip: 'border-[#a78bfa]/40 bg-[#a78bfa]/10 text-[#a78bfa] hover:bg-[#a78bfa]/20',
    };
  }
  // Free tier — color the chip by urgency.
  if (remaining === 0) {
    return {
      icon: '🔒',
      label: 'Hak',
      text: 'text-[#ef4444]',
      chip: 'border-[#ef4444]/50 bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/20',
    };
  }
  if (remaining === 1) {
    return {
      icon: '⚠️',
      label: 'Hak',
      text: 'text-[#fbbf24]',
      chip: 'border-[#fbbf24]/40 bg-[#fbbf24]/10 text-[#fbbf24] hover:bg-[#fbbf24]/20',
    };
  }
  return {
    icon: '🆓',
    label: 'Hak',
    text: 'text-[#8888a0]',
    chip: 'border-[#2a2a3e] bg-[#2a2a3e]/40 text-[#c0c0d0] hover:bg-[#2a2a3e]',
  };
}

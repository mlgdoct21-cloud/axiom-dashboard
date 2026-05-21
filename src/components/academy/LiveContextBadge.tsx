'use client';

import { useEffect, useState } from 'react';
import { apiClient, type AcademyLiveContext } from '@/lib/api';

/**
 * Faz 1.6 — Canlı bağlam rozeti. Deribit DVOL (BTC+ETH) + FMP VIX.
 *
 * Müfredat M2L3'te IV kavramı öğretilirken bu rozet "bugün canlı seviye şu —
 * dersteki rejim göstergesi şu an böyle" diyebilsin. Fail-soft: veri yoksa
 * komponent kendisini gizler. AI yok — sayılar API'den, anlatı statik (backend).
 */
export default function LiveContextBadge() {
  const [ctx, setCtx] = useState<AcademyLiveContext | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .getAcademyLiveContext()
      .then((data) => {
        if (!cancelled) setCtx(data);
      })
      .catch(() => {
        // Sessiz geç — rozet kritik değil.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ctx) return null;
  const hasAny = ctx.btc_dvol !== null || ctx.eth_dvol !== null || ctx.vix !== null;
  if (!hasAny) return null;

  return (
    <div className="rounded-xl border border-[#26314a] bg-gradient-to-r from-[#161629] to-transparent p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-[#4fc3f7] uppercase tracking-wider">
          📡 Bugünkü canlı bağlam
        </div>
        {ctx.stale && (
          <span className="text-[10px] uppercase tracking-wider text-yellow-400">
            bayat
          </span>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-3 text-sm">
        <Metric label="BTC DVOL" value={ctx.btc_dvol} note={ctx.btc_note} />
        <Metric label="ETH DVOL" value={ctx.eth_dvol} note={ctx.eth_note} />
        <Metric label="VIX" value={ctx.vix} note={ctx.vix_note} />
      </div>
      <p className="text-[10px] text-gray-500 italic mt-3">
        Veri: Deribit (DVOL) + FMP (VIX). Eğitim amaçlıdır.
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: number | null;
  note: string | null;
}) {
  if (value === null) {
    return (
      <div className="rounded-lg border border-[#26314a]/60 p-3 opacity-50">
        <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
        <div className="text-lg font-mono text-gray-600">—</div>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-[#26314a]/60 p-3">
      <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-mono font-bold text-white">{value.toFixed(2)}</div>
      {note && <div className="text-[11px] text-gray-400 mt-1 leading-snug">{note}</div>}
    </div>
  );
}

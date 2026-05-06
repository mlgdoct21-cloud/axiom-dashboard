'use client';

import { useEffect, useState } from 'react';

// ── Types matching backend payloads ──────────────────────────────────────

interface AltSeasonComponent {
  name: string;
  weight: number;
  contribution: number;
  label_tr: string;
}

interface AltSeasonData {
  altseason_score: number | null;
  zone: string;
  zone_tr: string;
  components: AltSeasonComponent[];
  fetched_at: string;
}

interface ErcToken {
  symbol: string;
  name: string;
  netflow_1d: number;
  netflow_7d: number;
  reserve: number | null;
  reserve_usd: number | null;
  netflow_to_reserve_pct: number;
  signal: string;
  label_tr: string;
}

interface ErcRadarData {
  tokens: ErcToken[];
  aggregate_score_pct: number | null;
  aggregate_label_tr: string;
  fetched_at: string;
}

interface StablePulseData {
  totals: {
    reserve_usd: number;
    netflow_1d: number;
    netflow_7d: number;
    inflow_1d: number;
  };
  ssr_proxy: number | null;
  ssr_label_tr: string;
  flow_signal: string;
  flow_label_tr: string;
  fetched_at: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function formatUsd(v: number, decimals = 1): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(decimals)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(decimals)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(decimals)}K`;
  return `$${v.toFixed(0)}`;
}

function signedUsd(v: number): string {
  const sign = v >= 0 ? '+' : '';
  return `${sign}${formatUsd(v)}`;
}

function zoneColor(zone: string): string {
  if (zone === 'STRONG_ALT_SEASON') return '#26de81';
  if (zone === 'ALT_FAVORED')       return '#26de81';
  if (zone === 'MIXED')              return '#fbbf24';
  if (zone === 'BTC_FAVORED')        return '#ff9800';
  if (zone === 'BTC_DOMINANT')       return '#ff4757';
  return '#888';
}

// ── Component ────────────────────────────────────────────────────────────

export default function MarketHealthCard() {
  const [altseason, setAltseason] = useState<AltSeasonData | null>(null);
  const [erc20, setErc20]         = useState<ErcRadarData | null>(null);
  const [stable, setStable]       = useState<StablePulseData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [tab, setTab]             = useState<'overview' | 'erc20' | 'stable'>('overview');

  useEffect(() => {
    async function load() {
      try {
        const [aRes, eRes, sRes] = await Promise.all([
          fetch('/api/market/altseason'),
          fetch('/api/market/erc20-radar'),
          fetch('/api/market/stablecoin-pulse'),
        ]);

        if (aRes.ok) setAltseason(await aRes.json());
        if (eRes.ok) setErc20(await eRes.json());
        if (sRes.ok) setStable(await sRes.json());
      } catch (e: any) {
        setError(e?.message ?? 'Veri yüklenemedi');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded-xl p-5 animate-pulse">
        <div className="h-5 bg-[#1a1a2e] rounded w-1/3 mb-4" />
        <div className="h-20 bg-[#1a1a2e] rounded mb-3" />
        <div className="h-3 bg-[#1a1a2e] rounded w-2/3" />
      </div>
    );
  }

  if (error || (!altseason && !erc20 && !stable)) {
    return (
      <div className="bg-[#0d0d1a] border border-[#ff9800]/30 rounded-xl p-4">
        <div className="text-xs text-[#ff9800]">Piyasa sağlık verisi yüklenemedi.</div>
      </div>
    );
  }

  const score = altseason?.altseason_score ?? null;
  const sZone = altseason?.zone ?? 'UNKNOWN';
  const sColor = zoneColor(sZone);

  return (
    <div className="bg-gradient-to-br from-[#0d0d1a] to-[#111125] border border-[#2a2a3e] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#2a2a3e]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xl">📋</span>
          <h2 className="text-base font-bold text-[#e0e0f0]">Piyasa Sağlık Karnesi</h2>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/30">
            CryptoQuant Pro
          </span>
        </div>
        <p className="text-[11px] text-[#888] mt-1.5 leading-snug">
          Alt sezon · Stablecoin akışı · ERC20 akıllı para — 5 sinyali tek karneye topluyoruz.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-5 pt-3 border-b border-[#2a2a3e]">
        {[
          { k: 'overview', label: '🧭 Pusula', avail: !!altseason },
          { k: 'erc20',    label: '🎯 ERC20',  avail: !!erc20 },
          { k: 'stable',   label: '💵 Stablecoin', avail: !!stable },
        ].map(t => (
          <button
            key={t.k}
            disabled={!t.avail}
            onClick={() => setTab(t.k as 'overview' | 'erc20' | 'stable')}
            className={`px-3 py-2 text-[11px] font-semibold transition-all ${
              tab === t.k
                ? 'text-[#4fc3f7] border-b-2 border-[#4fc3f7] -mb-px'
                : t.avail
                  ? 'text-[#888] hover:text-[#e0e0f0]'
                  : 'text-[#333] cursor-not-allowed'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {tab === 'overview' && altseason && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-[#888] mb-1">
                Alt Sezon Skoru
              </div>
              <div className="text-4xl font-bold tabular-nums" style={{ color: sColor }}>
                {score !== null ? `${score.toFixed(0)}` : '—'}<span className="text-[#444] text-2xl">/100</span>
              </div>
              <div className="text-sm font-semibold mt-1" style={{ color: sColor }}>
                {altseason.zone_tr}
              </div>
            </div>

            {/* Score bar */}
            {score !== null && score !== undefined && (
              <div className="relative">
                <div className="h-2 rounded-full bg-gradient-to-r from-[#ff4757] via-[#fbbf24] to-[#26de81]" />
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-4 bg-white shadow-lg rounded"
                  style={{ left: `${score}%` }}
                />
                <div className="flex justify-between text-[9px] text-[#666] mt-1.5 px-1">
                  <span>BTC Hakim</span>
                  <span>Karışık</span>
                  <span>Alt Sezon</span>
                </div>
              </div>
            )}

            {/* Components */}
            <div className="space-y-1.5 border-t border-[#1a1a2e] pt-3">
              {altseason.components.map((c, i) => {
                const sign = c.contribution > 0 ? '+' : '';
                const cColor =
                  c.contribution > 0 ? '#26de81' :
                  c.contribution < 0 ? '#ff4757' : '#888';
                return (
                  <div key={i} className="flex items-center justify-between gap-2 py-1 border-b border-[#1a1a2e] last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-[#c0c0d0]">{c.name}</div>
                      <div className="text-[10px] text-[#666]">{c.label_tr}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs font-bold tabular-nums" style={{ color: cColor }}>
                        {sign}{c.contribution.toFixed(1)}
                      </div>
                      <div className="text-[9px] text-[#555]">/{c.weight}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'erc20' && erc20 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-[#1a1a2e] rounded-lg">
              <div className="text-xs text-[#c0c0d0]">9 DeFi Token Toplam</div>
              <div className="text-sm font-bold" style={{
                color: (erc20.aggregate_score_pct ?? 0) > 20 ? '#26de81' :
                       (erc20.aggregate_score_pct ?? 0) < -20 ? '#ff4757' : '#fbbf24',
              }}>
                {erc20.aggregate_label_tr}
              </div>
            </div>

            <div className="space-y-1">
              {erc20.tokens.map(t => {
                const c =
                  t.signal.includes('BULLISH') ? '#26de81' :
                  t.signal.includes('BEARISH') ? '#ff4757' : '#fbbf24';
                return (
                  <div key={t.symbol} className="flex items-center justify-between gap-2 px-2 py-2 border-b border-[#1a1a2e] last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-xs text-[#e0e0f0] w-12">
                        {t.symbol}
                      </span>
                      <span className="text-[10px] text-[#666] truncate hidden sm:inline">
                        {t.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-right">
                      <span className="text-[10px] text-[#888] tabular-nums hidden sm:inline">
                        7G: <span style={{ color: t.netflow_7d < 0 ? '#26de81' : '#ff4757' }}>
                          {t.netflow_7d < 0 ? '↓' : '↑'} {Math.abs(t.netflow_7d) > 1e9
                            ? `${(Math.abs(t.netflow_7d) / 1e9).toFixed(1)}B`
                            : Math.abs(t.netflow_7d) > 1e6
                              ? `${(Math.abs(t.netflow_7d) / 1e6).toFixed(1)}M`
                              : `${(Math.abs(t.netflow_7d) / 1e3).toFixed(0)}K`}
                        </span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{ background: c + '15', color: c, border: `1px solid ${c}40` }}>
                        {t.label_tr}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-[10px] text-[#666] italic pt-2 border-t border-[#1a1a2e]">
              Borsadan çıkış (↓) genelde biriktirilme; borsaya giriş (↑) dağıtım sinyalidir.
            </div>
          </div>
        )}

        {tab === 'stable' && stable && (
          <div className="space-y-3">
            {/* Big number */}
            <div className="bg-[#1a1a2e] rounded-lg p-4 text-center">
              <div className="text-[10px] uppercase tracking-wider text-[#888] mb-1">
                💵 Borsada Bekleyen Stablecoin
              </div>
              <div className="text-3xl font-bold text-[#4fc3f7] tabular-nums">
                {formatUsd(stable.totals.reserve_usd, 2)}
              </div>
              <div className="text-[10px] text-[#666] mt-1">USDC + DAI</div>
            </div>

            {/* Flow signal */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#0a0a14] border border-[#2a2a3e] rounded-lg p-3">
                <div className="text-[9px] uppercase tracking-wider text-[#666] mb-1">
                  Son 24s Net
                </div>
                <div className="font-mono font-bold text-sm tabular-nums" style={{
                  color: stable.totals.netflow_1d > 0 ? '#26de81' : '#ff4757',
                }}>
                  {signedUsd(stable.totals.netflow_1d)}
                </div>
              </div>
              <div className="bg-[#0a0a14] border border-[#2a2a3e] rounded-lg p-3">
                <div className="text-[9px] uppercase tracking-wider text-[#666] mb-1">
                  Son 7G Net
                </div>
                <div className="font-mono font-bold text-sm tabular-nums" style={{
                  color: stable.totals.netflow_7d > 0 ? '#26de81' : '#ff4757',
                }}>
                  {signedUsd(stable.totals.netflow_7d)}
                </div>
              </div>
            </div>

            {/* Verdicts */}
            <div className="space-y-1.5 pt-2 border-t border-[#1a1a2e]">
              <div className="flex items-center justify-between gap-2 py-1">
                <span className="text-[11px] text-[#c0c0d0]">Akış Yönü</span>
                <span className="text-[11px] font-semibold" style={{
                  color: stable.flow_signal.includes('BULLISH') ? '#26de81' :
                         stable.flow_signal.includes('BEARISH') ? '#ff4757' : '#fbbf24',
                }}>{stable.flow_label_tr}</span>
              </div>
              <div className="flex items-center justify-between gap-2 py-1">
                <span className="text-[11px] text-[#c0c0d0]">SSR (BTC/Stablecoin)</span>
                <span className="text-[11px] font-semibold text-[#888]">
                  {stable.ssr_proxy !== null ? `${stable.ssr_proxy.toFixed(0)} · ${stable.ssr_label_tr}` : '—'}
                </span>
              </div>
            </div>

            <div className="text-[10px] text-[#666] italic pt-2 border-t border-[#1a1a2e]">
              Borsalara stablecoin akıyorsa birileri alım için &ldquo;kuru barut&rdquo; topluyor demektir.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

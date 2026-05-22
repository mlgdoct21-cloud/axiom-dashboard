'use client';

import { useEffect, useState } from 'react';
import { OnChainSnapshot, SignalEntry } from '@/lib/cryptoquant';
import MetricTooltip from './MetricTooltip';
import { METRIC_INFO } from '@/lib/onchain-glossary';

/**
 * CVD verisi — backend /api/cockpit/cvd endpoint'inden.
 * 24h Binance klines'tan hesaplanan delta + uyum analizi.
 */
interface CvdData {
  delta_24h_usd: number;
  total_buy_usd: number;
  total_sell_usd: number;
  price_change_pct_24h: number;
  divergence: 'uyumlu' | 'uyumsuz';
  meaning: string;
}

function useCvd(): CvdData | null {
  const [data, setData] = useState<CvdData | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/cockpit/cvd');
        if (!r.ok) return;
        const body = await r.json();
        if (cancelled || body.error) return;
        setData(body as CvdData);
      } catch { /* sessiz — placeholder kalır */ }
    })();
    return () => { cancelled = true; };
  }, []);
  return data;
}

const C = {
  green:  '#26de81',
  red:    '#ff4757',
  orange: '#ff9800',
  yellow: '#fbbf24',
  blue:   '#4fc3f7',
  purple: '#a78bfa',
  gray:   '#888',
};

const signalColor: Record<string, string> = {
  BULLISH: C.green,
  BEARISH: C.red,
  NEUTRAL: C.yellow,
};

// ── Shared sub-components ────────────────────────────────────────────────────

function PanelShell({ icon, title, statusLabel, statusColor, children }: {
  icon: string;
  title: string;
  statusLabel?: string;
  statusColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2a2a3e] flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-xs font-bold text-[#e0e0f0] tracking-wide">{title}</span>
        </div>
        {statusLabel && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{ background: (statusColor ?? C.gray) + '20', color: statusColor ?? C.gray, border: `1px solid ${(statusColor ?? C.gray)}40` }}>
            {statusLabel}
          </span>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function MetricRow({ metricKey, sig, valueOverride, big = false }: {
  metricKey: string;
  sig?: SignalEntry;
  valueOverride?: string;
  big?: boolean;
}) {
  if (!sig) return null;
  const color = signalColor[sig.signal] ?? C.gray;
  const valueClass = big ? 'text-base' : 'text-xs';
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-[#1a1a2e] last:border-b-0">
      <div className="flex items-center min-w-0">
        <MetricTooltip metricKey={metricKey} currentValue={sig.value_str} currentZone={sig.label_tr} />
        {/* 2026-05-22: Metric ismi her zaman görünür (eskiden boş span'dı; ⓘ tooltip
            hover gerektiriyordu, kullanıcı şikayet etti). METRIC_INFO[key].short
            kısa TR etiket (Kaldıraç, Funding, OI, Netflow...). */}
        <span className="text-[11px] text-[#c0c0d0] ml-1.5 truncate">
          {METRIC_INFO[metricKey]?.short || metricKey}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`font-mono font-bold ${valueClass} tabular-nums`} style={{ color }}>
          {valueOverride ?? sig.value_str}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap"
          style={{ background: color + '15', color, border: `1px solid ${color}40` }}>
          {sig.label_tr}
        </span>
      </div>
    </div>
  );
}

function statusFromSignal(sig?: SignalEntry): { label: string; color: string } {
  if (!sig) return { label: '—', color: C.gray };
  if (sig.signal === 'BULLISH') return { label: '🟢 SAĞLIKLI', color: C.green };
  if (sig.signal === 'BEARISH') return { label: '⚠️ DİKKAT',   color: C.red };
  return { label: '🟡 İZLE', color: C.yellow };
}

// ── A. Borsa Nabzı (Exchange Pulse) ──────────────────────────────────────────

export function ExchangePulsePanel({ data }: { data: OnChainSnapshot }) {
  const nf = data.signals.exchange_netflow;
  const wr = data.signals.whale_ratio;
  const stb = data.signals.stablecoin_inflow;
  const overall = nf ?? wr;
  const status = statusFromSignal(overall);

  return (
    <PanelShell icon="🏦" title="BORSA NABZI" statusLabel={status.label} statusColor={status.color}>
      <div>
        <MetricRow metricKey="exchange_netflow" sig={nf} big />
        <MetricRow metricKey="whale_ratio" sig={wr} />
        <MetricRow metricKey="stablecoin_inflow" sig={stb} />
      </div>
      {(nf || wr || stb) && (
        <div className="mt-3 text-[11px] text-[#888] italic leading-snug border-t border-[#1a1a2e] pt-3">
          {pulseNarrative(nf, wr, stb)}
        </div>
      )}
    </PanelShell>
  );
}

// SSoT-driven narrative: 3 sinyalin signal alanını birleştirip dengeli özet üret.
// Eski sürüm sadece netflow'a bakıyordu, stablecoin BULLISH olsa bile
// "akış dengeli, sinyal yok" yazıyordu (Day 28 #9 fix).
function pulseNarrative(
  nf?: SignalEntry,
  wr?: SignalEntry,
  stb?: SignalEntry,
): string {
  const sigs = [nf, wr, stb].filter((s): s is SignalEntry => !!s);
  if (sigs.length === 0) return '';
  const bull = sigs.filter((s) => s.signal === 'BULLISH').map((s) => s.label_tr ?? '');
  const bear = sigs.filter((s) => s.signal === 'BEARISH').map((s) => s.label_tr ?? '');
  if (bull.length && bear.length) {
    return `Karışık tablo — güç: ${bull[0]}; baskı: ${bear[0]}.`;
  }
  if (bull.length) {
    return `Alıcılı denge: ${bull.join(' · ')}.`;
  }
  if (bear.length) {
    return `Satıcılı baskı: ${bear.join(' · ')}.`;
  }
  return 'Akış dengeli, üç gösterge de nötr bölgede.';
}

// ── B. Balina Radarı (Whale Intelligence) ────────────────────────────────────

export function WhaleRadarPanel({ data }: { data: OnChainSnapshot }) {
  const wr = data.signals.whale_ratio;
  const mpi = data.signals.mpi;
  const status = statusFromSignal(wr);

  // Visual: simple sonar-like dots based on whale ratio intensity
  const ratio = data.whale_ratio?.whale_ratio ?? 0;
  const intensity = Math.min(1, ratio / 0.85);

  return (
    <PanelShell icon="🐋" title="BALİNA RADARI" statusLabel={status.label} statusColor={status.color}>
      {/* Sonar viz */}
      <div className="bg-[#111125] border border-[#2a2a3e] rounded-lg p-4 mb-3 flex items-center justify-center min-h-[80px] relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          {[0.4, 0.65, 0.9].map((r, i) => (
            <div key={i}
              className="absolute rounded-full border"
              style={{
                width:  `${r * 90}px`,
                height: `${r * 90}px`,
                borderColor: `${signalColor[wr?.signal ?? 'NEUTRAL']}${i === 2 ? '20' : '10'}`,
              }}
            />
          ))}
        </div>
        <div className="relative z-10 text-center">
          <div className="text-[10px] uppercase tracking-widest text-[#666]">Aktivite</div>
          <div className="text-2xl font-black tabular-nums"
            style={{ color: signalColor[wr?.signal ?? 'NEUTRAL'] }}>
            {ratio > 0 ? ratio.toFixed(2) : '—'}
          </div>
          <div className="text-[9px] text-[#888]">
            {intensity >= 1 ? 'YÜKSEK' : intensity >= 0.6 ? 'ORTA' : 'DÜŞÜK'}
          </div>
        </div>
      </div>

      <div>
        <MetricRow metricKey="whale_ratio" sig={wr} />
        <MetricRow metricKey="mpi" sig={mpi} />
      </div>

      {wr && (
        <div className="mt-3 text-[11px] text-[#888] italic leading-snug border-t border-[#1a1a2e] pt-3">
          {wr.signal === 'BEARISH'
            ? 'Büyük oyuncular borsalarda aktif — volatilite riski yüksek.'
            : wr.signal === 'BULLISH'
              ? 'Balina aktivitesi normal seviyede, ani hareket sinyali yok.'
              : 'Balina aktivitesi orta seviyede — izlemeye devam.'}
        </div>
      )}
    </PanelShell>
  );
}

// ── C. Risk Isı Haritası (Leverage Heat) ─────────────────────────────────────

/**
 * LeverageHeatPanel — 2026-05-22 genişletme: "Türev Piyasası" paneli.
 *
 * Mevcut Heat bar + Leverage/Funding/OI MetricRow'ları korundu. Altına
 * 2 yeni section eklendi:
 *   🔥 Likidasyon Havuzu — snapshot'taki btc_liquidations (long vs short)
 *   📈 CVD — backend endpoint geldiğinde dolacak (placeholder)
 *
 * Vadeli/Likidite yeni-tab planı yerine mevcut on-chain paneli zenginleştirme
 * yaklaşımı (bilişsel yük artmasın).
 */
export function LeverageHeatPanel({ data }: { data: OnChainSnapshot }) {
  const lev = data.signals.leverage_ratio;
  const fr  = data.signals.funding_rates;
  const oi  = data.signals.open_interest;
  const status = statusFromSignal(lev);
  const cvd = useCvd();

  const levVal = data.leverage_ratio?.leverage_ratio ?? 0;
  const heatPct = Math.min(100, (levVal / 0.4) * 100);

  // 🔥 Liquidation havuzu — snapshot'tan
  const liq = data.btc_liquidations;
  const longUsd = liq?.long_usd ?? 0;
  const shortUsd = liq?.short_usd ?? 0;
  const totalLiq = longUsd + shortUsd;
  const longPct = totalLiq > 0 ? (longUsd / totalLiq) * 100 : 50;
  const shortPct = totalLiq > 0 ? (shortUsd / totalLiq) * 100 : 50;
  const liqFmt = (n: number) => (n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(0)}M` : `$${n.toFixed(0)}`);

  return (
    <PanelShell icon="🌡️" title="TÜREV PİYASASI" statusLabel={status.label} statusColor={status.color}>
      {/* Heat bar */}
      <div className="mb-3">
        <div className="flex items-baseline justify-between text-[10px] text-[#666] mb-1.5">
          <span>Düşük</span>
          <span className="font-mono font-bold text-base"
            style={{ color: signalColor[lev?.signal ?? 'NEUTRAL'] }}>
            {Math.round(heatPct)}/100
          </span>
          <span>Kritik</span>
        </div>
        <div className="relative h-3 rounded-full overflow-hidden bg-[#1a1a2e]">
          <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-[#26de81]/30 to-[#fbbf24]/30" />
          <div className="absolute inset-y-0 left-1/2 w-[25%] bg-gradient-to-r from-[#fbbf24]/30 to-[#ff9800]/40" />
          <div className="absolute inset-y-0 left-[75%] w-[25%] bg-gradient-to-r from-[#ff9800]/40 to-[#ff4757]/50" />
          <div className="absolute top-1/2 w-3 h-3 rounded-full -translate-y-1/2 -translate-x-1/2 ring-2 ring-[#0d0d1a]"
            style={{ left: `${heatPct}%`, background: signalColor[lev?.signal ?? 'NEUTRAL'] }}
          />
        </div>
      </div>

      <div>
        <MetricRow metricKey="leverage_ratio" sig={lev} />
        <MetricRow metricKey="funding_rates" sig={fr} />
        <MetricRow metricKey="open_interest" sig={oi} />
      </div>

      {/* 🔥 Liquidation Havuzu (snapshot'tan) */}
      {liq && totalLiq > 0 && (
        <div className="mt-3 border-t border-[#1a1a2e] pt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-[#8888a0] uppercase tracking-wider">
              🔥 Likidasyon Havuzu (24s)
            </span>
            <span className="text-[10px] font-mono text-[#e0e0e0]">{liqFmt(totalLiq)} toplam</span>
          </div>
          <div className="relative h-2.5 rounded-full overflow-hidden bg-[#1a1a2e] flex">
            <div className="h-full bg-[#26a69a]" style={{ width: `${longPct}%` }} title={`Long: ${liqFmt(longUsd)}`} />
            <div className="h-full bg-[#ef5350]" style={{ width: `${shortPct}%` }} title={`Short: ${liqFmt(shortUsd)}`} />
          </div>
          <div className="flex justify-between text-[10px] font-mono mt-1">
            <span className="text-[#26a69a]">Long {liqFmt(longUsd)}</span>
            <span className="text-[#ef5350]">Short {liqFmt(shortUsd)}</span>
          </div>
          <div className="text-[10px] text-[#8888a0] italic mt-1">
            {longUsd > shortUsd * 2
              ? '⚠️ Long-side dominant likidasyon — düşüş baskısı tükenmiş olabilir'
              : shortUsd > longUsd * 2
              ? '⚠️ Short-side dominant — short squeeze potansiyeli'
              : 'Dengeli tasfiye dağılımı'}
          </div>
        </div>
      )}

      {/* 📈 CVD — backend canlı veri */}
      <div className="mt-3 border-t border-[#1a1a2e] pt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold text-[#8888a0] uppercase tracking-wider">
            📈 CVD (24s)
          </span>
          {cvd ? (
            <span className="text-[10px] font-mono"
              style={{ color: cvd.divergence === 'uyumlu' ? C.green : C.red }}>
              {cvd.delta_24h_usd >= 0 ? '+' : ''}
              {Math.abs(cvd.delta_24h_usd) >= 1e9
                ? `$${(cvd.delta_24h_usd / 1e9).toFixed(2)}B`
                : `$${(cvd.delta_24h_usd / 1e6).toFixed(0)}M`}
            </span>
          ) : (
            <span className="text-[9px] text-[#555570] italic">yükleniyor...</span>
          )}
        </div>
        {cvd && (
          <>
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-[#26a69a]">Alıcı ${Math.round(cvd.total_buy_usd / 1e9 * 10) / 10}B</span>
              <span className="text-[#ef5350]">Satıcı ${Math.round(cvd.total_sell_usd / 1e9 * 10) / 10}B</span>
              <span className="text-[#8888a0]">
                Fiyat: <span className={cvd.price_change_pct_24h >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}>
                  {cvd.price_change_pct_24h >= 0 ? '+' : ''}{cvd.price_change_pct_24h.toFixed(2)}%
                </span>
              </span>
            </div>
            <div className="text-[10px] text-[#8888a0] italic mt-1">
              {cvd.divergence === 'uyumlu' ? '✅ Uyumlu — ' : '⚠️ Uyumsuz — '}{cvd.meaning}
            </div>
          </>
        )}
      </div>

      <div className="mt-3 text-[11px] text-[#888] italic leading-snug border-t border-[#1a1a2e] pt-3">
        {lev?.signal === 'BEARISH'
          ? 'UYARI: Kaldıraç birikmesi var. Ani fiyat hareketi tasfiye dalgası tetikleyebilir — stop-loss şart.'
          : lev?.signal === 'BULLISH'
            ? 'Kaldıraç düşük, sağlıklı seviye — sürpriz tasfiye riski az.'
            : 'Normal kaldıraç aralığında.'}
      </div>
    </PanelShell>
  );
}

// ── D. Döngü Pusulası (Cycle Compass) ────────────────────────────────────────

export function CycleCompassPanel({ data }: { data: OnChainSnapshot }) {
  const mvrv = data.signals.mvrv;
  const nupl = data.signals.nupl;
  const sopr = data.signals.sopr;
  const rp   = data.signals.realized_price;

  // Position dot 0..100 based on NUPL (the most psychological)
  const nuplVal = data.nupl?.nupl ?? 0;
  // Map NUPL [-0.25, 1.0] → [0, 100]
  const compassPct = Math.max(0, Math.min(100, ((nuplVal + 0.25) / 1.25) * 100));

  const status = statusFromSignal(mvrv ?? nupl);

  return (
    <PanelShell icon="🧭" title="DEĞERLEME BÖLGESİ" statusLabel={status.label} statusColor={status.color}>
      {/* Compass bar: dip → tepe */}
      <div className="mb-3">
        <div className="flex items-baseline justify-between text-[9px] text-[#666] mb-1.5">
          <span>💎 Dip</span>
          <span>🟢 Adil</span>
          <span>🟡 Aşırı</span>
          <span>⚠️ Tepe</span>
        </div>
        <div className="relative h-2.5 rounded-full overflow-hidden bg-[#1a1a2e]">
          <div className="absolute inset-y-0 left-0 w-1/4 bg-[#a78bfa]/25" />
          <div className="absolute inset-y-0 left-1/4 w-1/4 bg-[#26de81]/25" />
          <div className="absolute inset-y-0 left-2/4 w-1/4 bg-[#fbbf24]/25" />
          <div className="absolute inset-y-0 left-3/4 w-1/4 bg-[#ff4757]/25" />
          <div className="absolute top-1/2 w-3 h-3 rounded-full -translate-y-1/2 -translate-x-1/2 ring-2 ring-[#0d0d1a]"
            style={{ left: `${compassPct}%`, background: signalColor[(nupl ?? mvrv)?.signal ?? 'NEUTRAL'] }}
          />
        </div>
      </div>

      <div>
        <MetricRow metricKey="mvrv" sig={mvrv} big />
        <MetricRow metricKey="nupl" sig={nupl} />
        <MetricRow metricKey="sopr" sig={sopr} />
        <MetricRow metricKey="realized_price" sig={rp} />
      </div>

      {/* Faz D.1 — STH/LTH realized price bantları (kısa/uzun-vade yatırımcı
          maliyet temeli). Backend snapshot'tan geliyorsa render; yoksa atla. */}
      {(data.sth_realized_price || data.lth_realized_price) && (
        <div className="mt-3 border-t border-[#1a1a2e] pt-3">
          <div className="text-[10px] font-semibold text-[#8888a0] uppercase tracking-wider mb-1.5">
            Maliyet Bantları (155g)
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {data.sth_realized_price && (
              <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded px-2 py-1.5">
                <div className="text-[9px] text-[#8888a0]">STH — Kısa-vade</div>
                <div className="font-mono text-[#e0e0e0]">
                  ${data.sth_realized_price.realized_price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[9px] text-[#555570] mt-0.5">
                  ≤ 155g hareketli coin maliyet temeli
                </div>
              </div>
            )}
            {data.lth_realized_price && (
              <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded px-2 py-1.5">
                <div className="text-[9px] text-[#8888a0]">LTH — Uzun-vade</div>
                <div className="font-mono text-[#e0e0e0]">
                  ${data.lth_realized_price.realized_price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[9px] text-[#555570] mt-0.5">
                  &gt; 155g HODL maliyet temeli (güçlü destek)
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-3 text-[11px] text-[#888] italic leading-snug border-t border-[#1a1a2e] pt-3">
        {mvrv?.signal === 'BEARISH'
          ? 'BTC tarihsel olarak pahalı bölgede — kar realizasyonu düşünülebilir.'
          : mvrv?.signal === 'BULLISH'
            ? 'BTC tarihsel ortalamanın altında — uzun vadeli alıcı için seçici giriş bölgesi.'
            : 'Adil değer civarında — ne ucuz ne pahalı.'}
      </div>
    </PanelShell>
  );
}

// ── E. Madenci Güven Mührü (Miner Conviction) ────────────────────────────────

export function MinerConvictionPanel({ data }: { data: OnChainSnapshot }) {
  const mpi = data.signals.mpi;
  const puell = data.signals.puell;
  const hr = data.signals.hash_rate;

  // "Sertifika" only when both miner signals BULLISH/NEUTRAL non-bearish
  const hasSeal = (mpi?.signal !== 'BEARISH') && (puell?.signal !== 'BEARISH') && mpi && puell;
  const status = statusFromSignal(mpi);

  return (
    <PanelShell icon="⛏️" title="MADENCİ DAVRANIŞI" statusLabel={status.label} statusColor={status.color}>
      {hasSeal ? (
        <div className="bg-[#26de81]/10 border-2 border-dashed border-[#26de81]/40 rounded-lg p-3 mb-3 text-center">
          <div className="text-2xl mb-1">✅</div>
          <div className="text-[11px] font-bold text-[#26de81]">MADENCİ GÜVEN SERTİFİKASI</div>
          <div className="text-[10px] text-[#888] mt-1">
            Madenciler maliyet üstünde fiyat bekliyor
          </div>
        </div>
      ) : mpi?.signal === 'BEARISH' || puell?.signal === 'BEARISH' ? (
        <div className="bg-[#ff4757]/10 border border-[#ff4757]/30 rounded-lg p-3 mb-3 text-center">
          <div className="text-xl mb-1">⚠️</div>
          <div className="text-[11px] font-bold text-[#ff4757]">MADENCİ SATIŞ BASKISI</div>
          <div className="text-[10px] text-[#888] mt-1">
            Madenciler normalin üstünde satış yapıyor
          </div>
        </div>
      ) : null}

      <div>
        <MetricRow metricKey="mpi" sig={mpi} />
        <MetricRow metricKey="puell" sig={puell} />
        <MetricRow metricKey="hash_rate" sig={hr} />
      </div>

      <div className="mt-3 text-[11px] text-[#888] italic leading-snug border-t border-[#1a1a2e] pt-3">
        {hasSeal
          ? 'Üreticiler satmıyor — onlar fiyatın yükseleceğine inanıyor demektir. Bullish onay.'
          : mpi?.signal === 'BEARISH'
            ? 'Madenci satışı yüksek — kısa vadeli baskı olabilir.'
            : 'Madenci ekonomisi izleniyor.'}
      </div>
    </PanelShell>
  );
}


// ── XRP-Specific Panels (BTC'de olmayan sinyaller) ─────────────────────────

export function XrpDerivativesPanel({ data }: { data: OnChainSnapshot }) {
  const funding = data.signals.funding_rates;
  const liq = data.signals.xrp_liquidations;
  const taker = data.signals.xrp_taker_buy_sell;
  const lev = data.signals.leverage_ratio;
  const oi = data.signals.open_interest;

  const dominantSig = [funding, liq, taker, lev]
    .filter(Boolean)
    .map(s => s!.signal)
    .reduce<Record<string, number>>((acc, s) => ({ ...acc, [s]: (acc[s] ?? 0) + 1 }), {});
  const dominant = Object.entries(dominantSig).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'NEUTRAL';
  const status = { label: dominant === 'BULLISH' ? '🟢 İyimser' : dominant === 'BEARISH' ? '🔴 Riskli' : '🟡 Karışık',
                   color: signalColor[dominant] ?? C.gray };

  return (
    <PanelShell icon="⚡" title="TÜREV PİYASA" statusLabel={status.label} statusColor={status.color}>
      <div>
        <MetricRow metricKey="funding_rates" sig={funding} />
        <MetricRow metricKey="leverage_ratio" sig={lev} />
        <MetricRow metricKey="open_interest" sig={oi} />
        <MetricRow metricKey="xrp_taker_buy_sell" sig={taker} />
        <MetricRow metricKey="xrp_liquidations" sig={liq} />
      </div>
      <div className="mt-3 text-[11px] text-[#888] italic leading-snug border-t border-[#1a1a2e] pt-3">
        XRP&apos;de türev piyasa hâkim — funding + tasfiye + taker oranı bir araya gelince tablo netleşir.
      </div>
    </PanelShell>
  );
}

export function XrpNetworkPanel({ data }: { data: OnChainSnapshot }) {
  const supply = data.signals.xrp_supply_ratio;
  const nvt = data.signals.xrp_nvt;
  const tx = data.signals.xrp_tx_count;

  const status = statusFromSignal(supply ?? nvt);

  return (
    <PanelShell icon="🌐" title="AĞ SAĞLIĞI" statusLabel={status.label} statusColor={status.color}>
      <div>
        <MetricRow metricKey="xrp_supply_ratio" sig={supply} />
        <MetricRow metricKey="xrp_nvt" sig={nvt} />
        <MetricRow metricKey="xrp_tx_count" sig={tx} />
      </div>
      <div className="mt-3 text-[11px] text-[#888] italic leading-snug border-t border-[#1a1a2e] pt-3">
        Ağ kullanımı + borsa stoğu + değerleme katsayısı (NVT) bir arada XRP&apos;nin sağlığını verir.
      </div>
    </PanelShell>
  );
}

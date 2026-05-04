'use client';

import { OnChainSnapshot, SignalEntry } from '@/lib/cryptoquant';
import MetricTooltip from './MetricTooltip';

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
        <span className="text-[11px] text-[#c0c0d0] ml-1 truncate"></span>
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
      {nf && (
        <div className="mt-3 text-[11px] text-[#888] italic leading-snug border-t border-[#1a1a2e] pt-3">
          {nf.signal === 'BULLISH'
            ? 'Coin\'ler borsalardan cüzdanlara çekiliyor — orta vadeli olumlu.'
            : nf.signal === 'BEARISH'
              ? 'Borsalara coin geliyor — satış baskısı oluşabilir.'
              : 'Akış dengeli, sinyal yok.'}
        </div>
      )}
    </PanelShell>
  );
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

export function LeverageHeatPanel({ data }: { data: OnChainSnapshot }) {
  const lev = data.signals.leverage_ratio;
  const fr  = data.signals.funding_rates;
  const oi  = data.signals.open_interest;
  const status = statusFromSignal(lev);

  const levVal = data.leverage_ratio?.leverage_ratio ?? 0;
  const heatPct = Math.min(100, (levVal / 0.4) * 100);

  return (
    <PanelShell icon="🌡️" title="KALDIRAÇ RİSKİ" statusLabel={status.label} statusColor={status.color}>
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

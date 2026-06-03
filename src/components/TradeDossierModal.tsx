'use client';

import { useEffect, useState } from 'react';

// Backend payload şeması (services/dossier_service.py _DOSSIER_PROMPT_TEMPLATE):
interface DossierPayload {
  verdict: 'AL' | 'TUT' | 'SAT' | string;
  conviction: number;
  thesis: string;
  key_drivers: string[];
  risks: string[];
  trigger: string;
  stop_level: string;
  target_levels: { level: string; rationale: string }[];
  horizon: 'intraday' | 'swing' | 'position' | 'long_term' | string;
  confidence_explainer: string;
  _data?: {
    ta: Record<string, unknown>;
    fundamental: Record<string, unknown>;
    news: Record<string, unknown>;
    macro: Record<string, unknown>;
  };
}

interface DossierResponse {
  symbol: string;
  symbol_type: 'BIST' | 'CRYPTO' | 'US' | string;
  payload: DossierPayload;
  model_used: string;
  from_cache: boolean;
  created_at: string;
  error?: string | null;
}

interface Props {
  symbol: string;
  open: boolean;
  onClose: () => void;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://vivacious-growth-production-4875.up.railway.app/api/v1';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('axiom_auth');
  if (!raw) return null;
  try {
    return JSON.parse(raw).access_token || null;
  } catch {
    return null;
  }
}

const VERDICT_STYLE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  AL: { bg: '#0a3d2a', text: '#4ade80', border: '#16a34a', label: 'AL' },
  TUT: { bg: '#3a3a0a', text: '#fde047', border: '#facc15', label: 'TUT' },
  SAT: { bg: '#3d0a0a', text: '#f87171', border: '#dc2626', label: 'SAT' },
};

const HORIZON_TR: Record<string, string> = {
  intraday: 'Gün içi',
  swing: 'Swing (gün-hafta)',
  position: 'Pozisyon (hafta-ay)',
  long_term: 'Uzun vadeli (ay-yıl)',
};

export default function TradeDossierModal({ symbol, open, onClose }: Props) {
  const [data, setData] = useState<DossierResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRawData, setShowRawData] = useState(false);

  const generate = async (forceRefresh: boolean) => {
    setLoading(true);
    setError(null);
    const token = getToken();
    if (!token) {
      setError('Oturum açık değil. Lütfen yeniden giriş yapın.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/dossier/${encodeURIComponent(symbol)}?refresh=${forceRefresh ? 1 : 0}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const txt = await res.text();
        setError(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
        setLoading(false);
        return;
      }
      const json: DossierResponse = await res.json();
      setData(json);
    } catch (e) {
      setError(`Bağlantı hatası: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && !data && !loading) {
      generate(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const payload = data?.payload;
  const vStyle = payload?.verdict ? VERDICT_STYLE[payload.verdict] || VERDICT_STYLE.TUT : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#1a1a2e] border-b border-[#2a2a3e] px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-[#e0e0e0]">🎯 Trade Dossier</h2>
            <p className="text-sm text-[#8888a0]">
              {symbol}
              {data?.symbol_type && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded bg-[#2a2a3e] text-[#a0a0b0]">{data.symbol_type}</span>
              )}
              {data?.from_cache && (
                <span className="ml-2 text-xs text-[#666680]">· cache</span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#8888a0] hover:text-[#e0e0e0] text-2xl leading-none px-2"
            aria-label="Kapat"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#4fc3f7]" />
              <p className="mt-4 text-[#8888a0] text-sm">
                Veriler toplanıyor (TA, temel, haber, makro) — Gemini sentezliyor...
                <br />
                <span className="text-xs text-[#666680]">~10-20 saniye</span>
              </p>
            </div>
          )}

          {error && (
            <div className="bg-[#3d0a0a] border border-[#dc2626] rounded-lg p-4 text-[#f87171]">
              <p className="font-semibold mb-1">Hata</p>
              <p className="text-sm">{error}</p>
              <button
                onClick={() => generate(true)}
                className="mt-3 px-3 py-1.5 bg-[#dc2626] hover:bg-[#b91c1c] rounded text-sm text-white"
              >
                Yeniden dene
              </button>
            </div>
          )}

          {payload && !loading && (
            <>
              {/* Verdict hero */}
              {vStyle && (
                <div
                  className="rounded-lg p-5 border-2"
                  style={{ background: vStyle.bg, borderColor: vStyle.border }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="text-xs uppercase tracking-wider text-[#8888a0] mb-1">Karar</div>
                      <div className="text-4xl font-bold mb-2" style={{ color: vStyle.text }}>
                        {vStyle.label}
                      </div>
                      <div className="text-xs text-[#a0a0b0]">
                        Güven:{' '}
                        <span style={{ color: vStyle.text }}>
                          {'★'.repeat(Math.max(0, Math.min(5, payload.conviction || 0)))}
                          {'☆'.repeat(Math.max(0, 5 - (payload.conviction || 0)))}
                        </span>
                        <span className="ml-2 text-[#666680]">({payload.conviction}/5)</span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-[#a0a0b0]">
                      <div className="mb-1">
                        <span className="text-[#666680]">Vade:</span>{' '}
                        {HORIZON_TR[payload.horizon] || payload.horizon}
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-[#e0e0e0]">{payload.thesis}</p>
                </div>
              )}

              {/* Key Drivers */}
              {payload.key_drivers?.length > 0 && (
                <div className="bg-[#0a2a1a] border border-[#16a34a]/40 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-[#4ade80] mb-2">
                    💡 Ana Sürücüler
                  </h3>
                  <ul className="space-y-1.5">
                    {payload.key_drivers.map((d, i) => (
                      <li key={i} className="text-sm text-[#c0c0d0] pl-4 relative">
                        <span className="absolute left-0 text-[#4ade80]">▸</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Risks */}
              {payload.risks?.length > 0 && (
                <div className="bg-[#2a0a0a] border border-[#dc2626]/40 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-[#f87171] mb-2">⚠️ Riskler</h3>
                  <ul className="space-y-1.5">
                    {payload.risks.map((r, i) => (
                      <li key={i} className="text-sm text-[#c0c0d0] pl-4 relative">
                        <span className="absolute left-0 text-[#f87171]">▸</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Trigger */}
              {payload.trigger && (
                <div className="bg-[#1a1a2e] border border-[#4fc3f7]/40 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-[#4fc3f7] mb-2">🎯 Tetik (Teyit/Bozma)</h3>
                  <p className="text-sm text-[#c0c0d0]">{payload.trigger}</p>
                </div>
              )}

              {/* Levels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {payload.stop_level && (
                  <div className="bg-[#1a1a2e] border border-[#dc2626]/30 rounded-lg p-3">
                    <div className="text-xs text-[#8888a0] uppercase mb-1">Stop Seviyesi</div>
                    <div className="text-lg font-semibold text-[#f87171]">{payload.stop_level}</div>
                  </div>
                )}
                {payload.target_levels?.length > 0 && (
                  <div className="bg-[#1a1a2e] border border-[#16a34a]/30 rounded-lg p-3">
                    <div className="text-xs text-[#8888a0] uppercase mb-1">Hedef Seviyeler</div>
                    {payload.target_levels.map((t, i) => (
                      <div key={i} className="text-sm">
                        <span className="font-semibold text-[#4ade80]">{t.level}</span>
                        {t.rationale && <span className="text-[#a0a0b0] ml-2">— {t.rationale}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confidence explainer */}
              {payload.confidence_explainer && (
                <div className="bg-[#0a0a1e] border border-[#2a2a3e] rounded-lg p-3 text-xs text-[#8888a0]">
                  <span className="font-semibold text-[#a0a0b0]">Güven gerekçesi:</span>{' '}
                  {payload.confidence_explainer}
                </div>
              )}

              {/* Raw data expand */}
              {payload._data && (
                <div className="border-t border-[#2a2a3e] pt-3">
                  <button
                    onClick={() => setShowRawData((s) => !s)}
                    className="text-xs text-[#4fc3f7] hover:text-[#7dd3fc]"
                  >
                    {showRawData ? '▾' : '▸'} Bu yorumun dayandığı veriler
                  </button>
                  {showRawData && (
                    <pre className="mt-2 bg-[#0a0a1e] border border-[#2a2a3e] rounded p-3 text-[10px] text-[#a0a0b0] overflow-x-auto max-h-80 overflow-y-auto">
                      {JSON.stringify(payload._data, null, 2)}
                    </pre>
                  )}
                </div>
              )}

              {/* Footer actions */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#2a2a3e]">
                <div className="text-xs text-[#666680]">
                  {data && (
                    <>
                      Model: {data.model_used} · {new Date(data.created_at).toLocaleString('tr-TR')}
                    </>
                  )}
                  {data?.error && (
                    <div className="text-[#f87171] mt-1">Hata: {data.error}</div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setData(null);
                    generate(true);
                  }}
                  className="px-3 py-1.5 bg-[#4fc3f7]/10 hover:bg-[#4fc3f7]/20 border border-[#4fc3f7]/40 rounded text-sm text-[#4fc3f7]"
                >
                  🔄 Yeniden üret
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';

interface AlertItem {
  alert_key: string;
  severity: string | null;
  title: string | null;
  sent_at: string;
  sent_date: string;
  fanout_count: number;
}

interface AlertHistoryResponse {
  days: number;
  count: number;
  items: AlertItem[];
}

const SEVERITY_META: Record<string, { color: string; bg: string; emoji: string }> = {
  urgent:    { color: '#ff4757', bg: '#ff4757', emoji: '🚨' },
  attention: { color: '#ff9800', bg: '#ff9800', emoji: '⚠️' },
  info:      { color: '#26de81', bg: '#26de81', emoji: '🟢' },
};

function relativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'şimdi';
    if (mins < 60) return `${mins}dk önce`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}sa önce`;
    const days = Math.floor(hours / 24);
    return `${days}g önce`;
  } catch {
    return iso;
  }
}

export default function AlertHistoryCard() {
  const [data, setData] = useState<AlertHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch('/api/crypto/alerts/history?days=7', { cache: 'no-store' })
      .then(r => r.json())
      .then((d: AlertHistoryResponse | { error: string }) => {
        if (cancelled) return;
        if ('error' in d) setError(d.error);
        else setData(d);
        setLoading(false);
      })
      .catch(e => {
        if (!cancelled) {
          setError(e?.message ?? 'fetch_failed');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-[#1a1a2e] rounded w-1/3 mb-3" />
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-8 bg-[#1a1a2e] rounded" />)}
        </div>
      </div>
    );
  }

  if (error) return null;
  if (!data) return null;

  return (
    <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2a2a3e] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">📜</span>
          <span className="text-xs font-bold text-[#e0e0f0] tracking-wide">SON 7 GÜN ALARMLAR</span>
        </div>
        <span className="text-[10px] text-[#666]">{data.count} olay</span>
      </div>

      {data.items.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <div className="text-2xl mb-1">😌</div>
          <div className="text-[11px] text-[#888]">
            Son 7 günde piyasa sakindi — kritik eşik aşılmadı
          </div>
        </div>
      ) : (
        <div className="divide-y divide-[#1a1a2e]">
          {data.items.slice(0, 10).map((item, i) => {
            const meta = SEVERITY_META[item.severity || 'info'] ?? SEVERITY_META.info;
            return (
              <div key={i} className="px-4 py-2.5 flex items-start gap-3 hover:bg-white/[0.02] transition">
                <span className="text-lg shrink-0 mt-0.5">{meta.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-[#e0e0f0] truncate">
                    {item.title || item.alert_key}
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
                    <span className="text-[9px] text-[#666] font-mono">{item.alert_key}</span>
                    {item.fanout_count > 1 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#a78bfa]/15 text-[#a78bfa]">
                        {item.fanout_count}× kullanıcı
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-[10px] text-[#666] whitespace-nowrap shrink-0">
                  {relativeTime(item.sent_at)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="px-4 py-2 border-t border-[#1a1a2e] text-[9px] text-[#444] text-center">
        Threshold sweep her 30dk · 6 saat per-alert cooldown
      </div>
    </div>
  );
}

'use client';

import { useAuth } from '@/hooks/useAuth';
import { apiClient, type QuotaHistoryItem } from '@/lib/api';
import { useState, useEffect } from 'react';

const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME || 'axiom_finansal_bot';
const UPGRADE_DEEP_LINK = `https://t.me/${BOT_USERNAME}?start=upgrade_premium`;

const TIER_LABEL: Record<string, string> = {
  free: '🆓 Ücretsiz',
  premium: '💎 Premium',
  advance: '🚀 Advance',
};

const TIER_COLOR: Record<string, string> = {
  free: 'text-gray-300 border-gray-500/40 bg-gray-800/40',
  premium: 'text-[#26de81] border-[#26de81]/40 bg-[#26de81]/10',
  advance: 'text-[#a78bfa] border-[#a78bfa]/40 bg-[#a78bfa]/10',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Aktif',
  trialing: 'Deneme süresi',
  past_due: 'Ödeme gecikmiş',
  canceled: 'İptal edildi',
  unpaid: 'Ödenmemiş',
  incomplete: 'Tamamlanmamış',
  incomplete_expired: 'Süresi geçmiş',
};

const COMMAND_LABEL: Record<string, string> = {
  crypto_overview: 'Whitepaper analizi',
  crypto_onchain: 'On-Chain analiz',
};

function formatPeriodEnd(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

function formatHistoryTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }) + ' UTC';
  } catch {
    return iso;
  }
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [settings, setSettings] = useState({
    tags: user?.tags || '',
    report_mode: user?.report_mode || 'digest',
    report_hours: user?.report_hours || '09:00',
    custom_follows: user?.custom_follows || '',
  });

  // Subscription / billing state
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  // Usage history
  const [history, setHistory] = useState<QuotaHistoryItem[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setSettings({
        tags: user.tags || '',
        report_mode: user.report_mode || 'digest',
        report_hours: user.report_hours || '09:00',
        custom_follows: user.custom_follows || '',
      });
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await apiClient.getQuotaHistory(7);
        if (!cancelled) setHistory(res.items);
      } catch {
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await apiClient.updateSettings(settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const res = await apiClient.createCustomerPortalSession();
      if (res.url) {
        window.location.href = res.url;
        return;
      }
      setPortalError('Portal URL alınamadı');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Portal oturumu açılamadı';
      setPortalError(msg);
    } finally {
      setPortalLoading(false);
    }
  };

  const tier = (user?.tier || 'free') as keyof typeof TIER_LABEL;
  const tierLabel = TIER_LABEL[tier] || TIER_LABEL.free;
  const tierColor = TIER_COLOR[tier] || TIER_COLOR.free;
  const isPaid = tier === 'premium' || tier === 'advance';
  const periodEndPretty = formatPeriodEnd(user?.current_period_end || null);
  const statusLabel = user?.subscription_status
    ? STATUS_LABEL[user.subscription_status] || user.subscription_status
    : null;

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your preferences and notification settings
        </p>
      </div>

      {/* Üyelik / Plan Card */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Üyelik
        </h2>

        <div className="flex items-center gap-3 mb-4">
          <span
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${tierColor}`}
          >
            {tierLabel}
          </span>
          {isPaid && statusLabel && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {statusLabel}
            </span>
          )}
        </div>

        {isPaid && periodEndPretty && (
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            {tier === 'premium' ? '💎 Premium' : '🚀 Advance'}{' '}
            <span className="font-medium">{periodEndPretty}</span> tarihine kadar aktif
          </p>
        )}

        {isPaid && !periodEndPretty && (
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
            Yenileme tarihi henüz Stripe&apos;dan senkron edilmedi
          </p>
        )}

        {!isPaid && (
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            Premium ile günlük limitler kalkıyor: sınırsız Whitepaper + On-Chain analiz, anlık makro broadcast, daha fazlası.
          </p>
        )}

        {portalError && (
          <div className="p-3 mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{portalError}</p>
          </div>
        )}

        {isPaid ? (
          <button
            type="button"
            onClick={handleManageSubscription}
            disabled={portalLoading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50"
          >
            {portalLoading ? 'Açılıyor...' : 'Aboneliği Yönet'}
          </button>
        ) : (
          <a
            href={UPGRADE_DEEP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#a78bfa] to-[#26de81] hover:opacity-90 text-white font-medium rounded-lg transition"
          >
            💎 Yükselt
          </a>
        )}
      </div>

      {/* Kullanım Geçmişi Card */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Kullanım Geçmişi
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Son 7 gündeki ücretli özellik tüketimleriniz
        </p>

        {historyLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-500">Yükleniyor...</p>
        ) : !history || history.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Son 7 günde kayıtlı kullanım yok.
          </p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {history.map((item, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between py-3 text-sm"
              >
                <span className="text-gray-900 dark:text-gray-100">
                  {COMMAND_LABEL[item.command] || item.command}
                </span>
                <span className="text-gray-500 dark:text-gray-400 font-mono text-xs">
                  {formatHistoryTimestamp(item.used_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Account Info Card */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Account Information
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Display Name
            </label>
            <p className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg">
              {user?.username || 'Not set'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Telegram ID
            </label>
            <p className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg">
              {user?.telegram_id}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Member Since
            </label>
            <p className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
            </p>
          </div>
        </div>
      </div>

      {/* Preferences Form */}
      <form
        onSubmit={handleSave}
        className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Preferences</h2>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-600 dark:text-green-400">Settings saved successfully!</p>
          </div>
        )}

        {/* Interest Tags */}
        <div>
          <label
            htmlFor="tags"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Interest Tags
          </label>
          <input
            id="tags"
            type="text"
            name="tags"
            value={settings.tags}
            onChange={handleChange}
            placeholder="e.g., BTC,ETH,AAPL,Tesla"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Comma-separated list of assets and companies you want to follow
          </p>
        </div>

        {/* Report Mode */}
        <div>
          <label
            htmlFor="report_mode"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Report Mode
          </label>
          <select
            id="report_mode"
            name="report_mode"
            value={settings.report_mode}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="digest">Digest (Daily summary)</option>
            <option value="realtime">Real-time (As it happens)</option>
            <option value="hourly">Hourly</option>
          </select>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            How often you want to receive news updates
          </p>
        </div>

        {/* Report Hours */}
        <div>
          <label
            htmlFor="report_hours"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Report Hours
          </label>
          <input
            id="report_hours"
            type="text"
            name="report_hours"
            value={settings.report_hours}
            onChange={handleChange}
            placeholder="e.g., 09:00,18:00"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Comma-separated list of times when you want to receive reports (24-hour format)
          </p>
        </div>

        {/* Custom Follows */}
        <div>
          <label
            htmlFor="custom_follows"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Custom Follows
          </label>
          <textarea
            id="custom_follows"
            name="custom_follows"
            value={settings.custom_follows}
            onChange={handleChange}
            placeholder="e.g., Tesla,Microsoft,Apple"
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Additional companies or topics you want to follow closely
          </p>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}

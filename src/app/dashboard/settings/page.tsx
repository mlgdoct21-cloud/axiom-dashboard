'use client';

import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [settings, setSettings] = useState({
    tags: user?.tags || '',
    report_mode: user?.report_mode || 'digest',
    report_hours: user?.report_hours || '09:00',
    custom_follows: user?.custom_follows || '',
  });

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
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
      const message = err instanceof Error ? err.message : 'Failed to save settings';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your preferences and notification settings</p>
      </div>

      {/* Account Info Card */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Account Information</h2>
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
      <form onSubmit={handleSave} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
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
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
          <label htmlFor="report_mode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
          <label htmlFor="report_hours" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
          <label htmlFor="custom_follows" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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

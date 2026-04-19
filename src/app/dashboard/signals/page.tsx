'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, SignalHistoryList, SignalStats } from '@/lib/api';
import SignalHistoryTable from '@/components/SignalHistoryTable';

export default function SignalsPage() {
  const router = useRouter();
  const [signals, setSignals] = useState<any[]>([]);
  const [stats, setStats] = useState<SignalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    if (!apiClient.isAuthenticated()) {
      router.push('/');
      return;
    }
    loadSignals();
  }, [router]);

  const loadSignals = async () => {
    try {
      setLoading(true);
      const [signalsData, statsData] = await Promise.all([
        apiClient.getSignalHistory(undefined, 100, 0),
        apiClient.getSignalStats(),
      ]);

      setSignals(signalsData.signals);
      setStats(statsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load signals');
    } finally {
      setLoading(false);
    }
  };

  const filteredSignals = filter ? signals.filter((s) => s.symbol.includes(filter.toUpperCase())) : signals;

  const getSignalTypeStats = () => {
    if (!stats) return { buyPercentage: 0, sellPercentage: 0, holdPercentage: 0 };

    const total = stats.total_signals || 1;
    return {
      buyPercentage: ((stats.buy_signals / total) * 100).toFixed(1),
      sellPercentage: ((stats.sell_signals / total) * 100).toFixed(1),
      holdPercentage: ((stats.hold_signals / total) * 100).toFixed(1),
    };
  };

  const signalStats = getSignalTypeStats();

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold">Signal History</h1>
          <p className="text-gray-400 mt-2">View all trading signals and their performance</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-6 py-4 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-80">
            <p className="text-gray-400">Loading signals...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Signals */}
                <div className="bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border border-blue-500/30 rounded-xl p-6">
                  <p className="text-gray-400 text-sm mb-2">Total Signals</p>
                  <p className="text-3xl font-bold text-white">{stats.total_signals}</p>
                  <p className="text-gray-500 text-xs mt-2">All-time signals generated</p>
                </div>

                {/* Buy Signals */}
                <div className="bg-gradient-to-br from-green-600/10 to-emerald-600/10 border border-green-500/30 rounded-xl p-6">
                  <p className="text-gray-400 text-sm mb-2">Buy Signals</p>
                  <p className="text-3xl font-bold text-green-400">{stats.buy_signals}</p>
                  <p className="text-gray-500 text-xs mt-2">{signalStats.buyPercentage}% of total</p>
                </div>

                {/* Sell Signals */}
                <div className="bg-gradient-to-br from-red-600/10 to-pink-600/10 border border-red-500/30 rounded-xl p-6">
                  <p className="text-gray-400 text-sm mb-2">Sell Signals</p>
                  <p className="text-3xl font-bold text-red-400">{stats.sell_signals}</p>
                  <p className="text-gray-500 text-xs mt-2">{signalStats.sellPercentage}% of total</p>
                </div>

                {/* Win Rate */}
                <div className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-500/30 rounded-xl p-6">
                  <p className="text-gray-400 text-sm mb-2">Accuracy</p>
                  <p className="text-3xl font-bold text-purple-400">{stats.win_rate.toFixed(1)}%</p>
                  <p className="text-gray-500 text-xs mt-2">
                    {stats.acted_upon} of {stats.total_signals} executed
                  </p>
                </div>
              </div>
            )}

            {/* Additional Stats */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Average Confidence */}
                <div className="bg-gradient-to-br from-yellow-600/10 to-orange-600/10 border border-yellow-500/30 rounded-xl p-6">
                  <p className="text-gray-400 text-sm mb-2">Avg Confidence</p>
                  <p className="text-2xl font-bold text-yellow-400">{(stats.avg_confidence * 100).toFixed(1)}%</p>
                </div>

                {/* Most Traded Symbol */}
                <div className="bg-gradient-to-br from-cyan-600/10 to-blue-600/10 border border-cyan-500/30 rounded-xl p-6">
                  <p className="text-gray-400 text-sm mb-2">Most Traded</p>
                  <p className="text-2xl font-bold text-cyan-400">{stats.most_traded_symbol || '—'}</p>
                </div>

                {/* Hold Signals */}
                <div className="bg-gradient-to-br from-gray-600/10 to-slate-600/10 border border-gray-500/30 rounded-xl p-6">
                  <p className="text-gray-400 text-sm mb-2">Hold Signals</p>
                  <p className="text-2xl font-bold text-gray-300">{stats.hold_signals}</p>
                  <p className="text-gray-500 text-xs mt-2">{signalStats.holdPercentage}% of total</p>
                </div>
              </div>
            )}

            {/* Filter */}
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter by symbol (e.g., AAPL)"
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
              {filter && (
                <button
                  onClick={() => setFilter('')}
                  className="text-gray-400 hover:text-white text-sm transition"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Signals Table */}
            <SignalHistoryTable signals={filteredSignals} />

            {filteredSignals.length === 0 && !loading && (
              <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-8 text-center">
                <p className="text-gray-400">
                  {signals.length === 0 ? 'No signals recorded yet' : 'No signals match your filter'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

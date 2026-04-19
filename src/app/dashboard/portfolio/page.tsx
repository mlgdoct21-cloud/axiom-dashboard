'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, PortfolioList, PortfolioResponse } from '@/lib/api';
import PortfolioSummary from '@/components/PortfolioSummary';

interface PortfolioWithStats extends PortfolioResponse {
  open_positions_count: number;
  closed_positions_count: number;
}

export default function PortfolioPage() {
  const router = useRouter();
  const [portfolios, setPortfolios] = useState<PortfolioWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    currency: 'USD',
    initial_balance: 10000,
  });

  useEffect(() => {
    if (!apiClient.isAuthenticated()) {
      router.push('/');
      return;
    }
    loadPortfolios();
  }, [router]);

  const loadPortfolios = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getPortfolios();
      setPortfolios(data.portfolios as PortfolioWithStats[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolios');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);

    try {
      await apiClient.createPortfolio({
        name: formData.name,
        currency: formData.currency,
        initial_balance: formData.initial_balance,
      });
      setFormData({ name: '', currency: 'USD', initial_balance: 10000 });
      setShowCreateForm(false);
      await loadPortfolios();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create portfolio');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeletePortfolio = async (portfolioId: number) => {
    if (!confirm('Are you sure you want to delete this portfolio?')) return;

    try {
      await apiClient.deletePortfolio(portfolioId);
      await loadPortfolios();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete portfolio');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Portfolios</h1>
            <p className="text-gray-400 mt-2">Manage your trading portfolios and positions</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition"
          >
            {showCreateForm ? 'Cancel' : '+ New Portfolio'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-6 py-4 rounded-lg">
            {error}
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <form
            onSubmit={handleCreatePortfolio}
            className="bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border border-blue-500/30 rounded-xl p-6 space-y-4"
          >
            <h2 className="text-xl font-bold">Create New Portfolio</h2>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Portfolio Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Main Portfolio"
                required
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option>USD</option>
                  <option>EUR</option>
                  <option>GBP</option>
                  <option>TRY</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Initial Balance</label>
                <input
                  type="number"
                  value={formData.initial_balance}
                  onChange={(e) => setFormData({ ...formData, initial_balance: parseFloat(e.target.value) })}
                  placeholder="10000"
                  step="100"
                  required
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={createLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 rounded-lg transition"
            >
              {createLoading ? 'Creating...' : 'Create Portfolio'}
            </button>
          </form>
        )}

        {/* Portfolios List */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-gray-400">Loading portfolios...</p>
          </div>
        ) : portfolios.length === 0 ? (
          <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-8 text-center">
            <p className="text-gray-400">No portfolios yet</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition"
            >
              Create Your First Portfolio
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolios.map((portfolio) => (
              <div
                key={portfolio.id}
                onClick={() => router.push(`/dashboard/portfolio/${portfolio.id}`)}
                className="cursor-pointer bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border border-blue-500/30 rounded-xl p-6 space-y-4 hover:border-blue-500/60 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white">{portfolio.name}</h3>
                    <p className="text-gray-400 text-sm">{portfolio.currency}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePortfolio(portfolio.id);
                    }}
                    className="text-red-400 hover:text-red-300 transition text-sm"
                  >
                    Delete
                  </button>
                </div>

                <div className="space-y-2 border-t border-gray-700 pt-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Initial Balance</span>
                    <span className="text-white font-semibold">
                      {portfolio.currency} {portfolio.initial_balance?.toLocaleString('en-US', { maximumFractionDigits: 2 }) || '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Current Balance</span>
                    <span className="text-white font-semibold">
                      {portfolio.currency} {portfolio.current_balance?.toLocaleString('en-US', { maximumFractionDigits: 2 }) || '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Open Positions</span>
                    <span className="text-green-400 font-semibold">{portfolio.open_positions_count || 0}</span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/portfolio/${portfolio.id}`);
                  }}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

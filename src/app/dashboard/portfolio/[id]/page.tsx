'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient, PositionWithPnL, PortfolioWithStats } from '@/lib/api';
import PortfolioSummary from '@/components/PortfolioSummary';
import PositionCard from '@/components/PositionCard';
import OpenPositionForm from '@/components/OpenPositionForm';
import ClosePositionForm from '@/components/ClosePositionForm';

interface PortfolioStats {
  portfolio_id: number;
  name: string;
  currency: string;
  initial_balance: number;
  current_value: number;
  total_pnl_amount: number;
  total_pnl_percent: number;
  open_positions_count: number;
  closed_positions_count: number;
  total_positions: number;
}

export default function PortfolioDetailPage() {
  const router = useRouter();
  const params = useParams();
  const portfolioId = parseInt(params.id as string);

  const [portfolio, setPortfolio] = useState<PortfolioStats | null>(null);
  const [positions, setPositions] = useState<PositionWithPnL[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'positions' | 'closed'>('positions');
  const [selectedPositionId, setSelectedPositionId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (!apiClient.isAuthenticated()) {
      router.push('/');
      return;
    }
    loadPortfolioData();
  }, [router, portfolioId]);

  const loadPortfolioData = async () => {
    try {
      setLoading(true);
      const [portfolioData, positionsData] = await Promise.all([
        apiClient.getPortfolio(portfolioId),
        apiClient.getPositions(portfolioId),
      ]);

      const stats: PortfolioStats = {
        portfolio_id: portfolioId,
        name: portfolioData.name,
        currency: portfolioData.currency,
        initial_balance: portfolioData.initial_balance,
        current_value: portfolioData.current_balance || portfolioData.initial_balance,
        total_pnl_amount: (portfolioData.current_balance || portfolioData.initial_balance) - portfolioData.initial_balance,
        total_pnl_percent:
          ((portfolioData.current_balance || portfolioData.initial_balance) - portfolioData.initial_balance) /
          portfolioData.initial_balance *
          100,
        open_positions_count: positionsData.positions.filter((p) => p.status === 'open').length,
        closed_positions_count: positionsData.positions.filter((p) => p.status === 'closed').length,
        total_positions: positionsData.total,
      };

      setPortfolio(stats);
      setPositions(positionsData.positions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  const handlePositionClosed = () => {
    setSelectedPositionId(null);
    loadPortfolioData();
  };

  const handlePositionOpened = () => {
    setShowAddForm(false);
    loadPortfolioData();
  };

  const filteredPositions = activeTab === 'positions' ? positions.filter((p) => p.status === 'open') : positions.filter((p) => p.status === 'closed');

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <button
          onClick={() => router.push('/dashboard/portfolio')}
          className="text-blue-400 hover:text-blue-300 text-sm font-medium transition flex items-center gap-2"
        >
          ← Back to Portfolios
        </button>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-6 py-4 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-80">
            <p className="text-gray-400">Loading portfolio...</p>
          </div>
        ) : portfolio ? (
          <div className="space-y-8">
            {/* Portfolio Summary */}
            <PortfolioSummary stats={portfolio} />

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Positions */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Positions</h2>
                    <button
                      onClick={() => setShowAddForm(!showAddForm)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition"
                    >
                      {showAddForm ? 'Cancel' : '+ Open Position'}
                    </button>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-4 mb-6 border-b border-gray-700">
                    <button
                      onClick={() => setActiveTab('positions')}
                      className={`pb-2 px-4 font-medium transition ${
                        activeTab === 'positions'
                          ? 'text-white border-b-2 border-blue-500'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Open ({portfolio.open_positions_count})
                    </button>
                    <button
                      onClick={() => setActiveTab('closed')}
                      className={`pb-2 px-4 font-medium transition ${
                        activeTab === 'closed'
                          ? 'text-white border-b-2 border-blue-500'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Closed ({portfolio.closed_positions_count})
                    </button>
                  </div>

                  {/* Add Form */}
                  {showAddForm && (
                    <div className="mb-6">
                      <OpenPositionForm portfolioId={portfolioId} onSuccess={handlePositionOpened} />
                    </div>
                  )}

                  {/* Positions List */}
                  {filteredPositions.length === 0 ? (
                    <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-8 text-center">
                      <p className="text-gray-400">
                        {activeTab === 'positions' ? 'No open positions' : 'No closed positions'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredPositions.map((position) => (
                        <div key={position.id}>
                          <PositionCard position={position} />
                          {activeTab === 'positions' && !selectedPositionId && (
                            <button
                              onClick={() => setSelectedPositionId(position.id)}
                              className="mt-2 text-red-400 hover:text-red-300 text-sm font-medium transition"
                            >
                              Close Position
                            </button>
                          )}
                          {selectedPositionId === position.id && (
                            <div className="mt-4">
                              <ClosePositionForm
                                portfolioId={portfolioId}
                                positionId={position.id}
                                symbol={position.symbol}
                                entryPrice={position.average_entry_price}
                                currentPrice={position.current_price}
                                onSuccess={handlePositionClosed}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-500/30 rounded-xl p-6 space-y-4">
                  <h3 className="text-lg font-bold text-white">Portfolio Stats</h3>

                  <div>
                    <p className="text-gray-400 text-sm mb-1">Total Positions</p>
                    <p className="text-2xl font-bold text-white">{portfolio.total_positions}</p>
                  </div>

                  <div>
                    <p className="text-gray-400 text-sm mb-1">Average Entry Price</p>
                    <p className="text-white">
                      {positions.length > 0
                        ? (positions.reduce((sum, p) => sum + p.average_entry_price, 0) / positions.length).toFixed(2)
                        : '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-400 text-sm mb-1">Total Cost Basis</p>
                    <p className="text-white">
                      {positions.length > 0
                        ? `${portfolio.currency} ${positions
                            .reduce((sum, p) => sum + p.average_entry_price * p.quantity, 0)
                            .toLocaleString('en-US', { maximumFractionDigits: 2 })}`
                        : '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-400 text-sm mb-1">Total Market Value</p>
                    <p className="text-white">
                      {positions.length > 0
                        ? `${portfolio.currency} ${positions
                            .reduce((sum, p) => sum + p.current_price * p.quantity, 0)
                            .toLocaleString('en-US', { maximumFractionDigits: 2 })}`
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

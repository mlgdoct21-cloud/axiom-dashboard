'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';

interface ClosePositionFormProps {
  portfolioId: number;
  positionId: number;
  symbol: string;
  entryPrice: number;
  currentPrice: number;
  onSuccess?: () => void;
}

export default function ClosePositionForm({
  portfolioId,
  positionId,
  symbol,
  entryPrice,
  currentPrice,
  onSuccess,
}: ClosePositionFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exitPrice, setExitPrice] = useState(currentPrice);

  const pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (exitPrice <= 0) {
        setError('Exit price must be greater than 0');
        setLoading(false);
        return;
      }

      await apiClient.closePosition(portfolioId, positionId, {
        exit_price: exitPrice,
      });

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close position');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gradient-to-br from-red-600/10 to-pink-600/10 border border-red-500/30 rounded-xl p-6 space-y-4">
      <h3 className="text-lg font-bold text-white">Close Position</h3>

      {error && <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-2 rounded">{error}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-xs mb-1">Symbol</p>
          <p className="text-xl font-bold text-white">{symbol}</p>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-xs mb-1">Entry Price</p>
          <p className="text-xl font-bold text-white">${entryPrice.toFixed(2)}</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Exit Price</label>
        <input
          type="number"
          value={exitPrice}
          onChange={(e) => setExitPrice(parseFloat(e.target.value))}
          placeholder="0.00"
          step="0.01"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
          <p className="text-gray-400 text-xs mb-1">P&L Amount</p>
          <p className={`font-bold ${pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${((exitPrice - entryPrice) * 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
          <p className="text-gray-400 text-xs mb-1">Return %</p>
          <p className={`font-bold ${pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-medium py-2 rounded-lg transition"
      >
        {loading ? 'Closing...' : 'Close Position'}
      </button>
    </form>
  );
}

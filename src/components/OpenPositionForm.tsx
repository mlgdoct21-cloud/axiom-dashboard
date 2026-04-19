'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';

interface OpenPositionFormProps {
  portfolioId: number;
  onSuccess?: () => void;
}

export default function OpenPositionForm({ portfolioId, onSuccess }: OpenPositionFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    symbol: '',
    quantity: 0,
    average_entry_price: 0,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'symbol' ? value : parseFloat(value),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.symbol || formData.quantity <= 0 || formData.average_entry_price <= 0) {
        setError('Please fill in all fields with valid values');
        setLoading(false);
        return;
      }

      await apiClient.openPosition(portfolioId, {
        symbol: formData.symbol.toUpperCase(),
        quantity: formData.quantity,
        average_entry_price: formData.average_entry_price,
      });

      setFormData({ symbol: '', quantity: 0, average_entry_price: 0 });
      setError(null);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open position');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gradient-to-br from-green-600/10 to-emerald-600/10 border border-green-500/30 rounded-xl p-6 space-y-4">
      <h3 className="text-lg font-bold text-white">Open New Position</h3>

      {error && <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-2 rounded">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Symbol (e.g., AAPL)</label>
        <input
          type="text"
          name="symbol"
          value={formData.symbol}
          onChange={handleChange}
          placeholder="AAPL"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Quantity</label>
          <input
            type="number"
            name="quantity"
            value={formData.quantity || ''}
            onChange={handleChange}
            placeholder="10"
            step="0.01"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Entry Price</label>
          <input
            type="number"
            name="average_entry_price"
            value={formData.average_entry_price || ''}
            onChange={handleChange}
            placeholder="150.50"
            step="0.01"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium py-2 rounded-lg transition"
      >
        {loading ? 'Opening...' : 'Open Position'}
      </button>
    </form>
  );
}

'use client';

interface Position {
  id: number;
  symbol: string;
  quantity: number;
  average_entry_price: number;
  current_price: number;
  status: string;
  pnl_amount?: number;
  pnl_percent?: number;
}

export default function PositionCard({ position }: { position: Position }) {
  const pnlAmount = position.pnl_amount || (position.current_price - position.average_entry_price) * position.quantity;
  const pnlPercent = position.pnl_percent || ((position.current_price - position.average_entry_price) / position.average_entry_price) * 100;

  const pnlColor = pnlAmount >= 0 ? 'text-green-400' : 'text-red-400';
  const bgColor = pnlAmount >= 0 ? 'from-green-500/10' : 'from-red-500/10';
  const badgeColor = position.status === 'open' ? 'bg-green-500/20 border-green-500/50 text-green-300' : 'bg-gray-500/20 border-gray-500/50 text-gray-300';

  return (
    <div className={`bg-gradient-to-br ${bgColor} to-transparent border border-gray-700 rounded-lg p-6 space-y-4`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-white">{position.symbol}</h3>
          <p className="text-sm text-gray-400">Position #{position.id}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${badgeColor}`}>
          {position.status.toUpperCase()}
        </span>
      </div>

      {/* Position Details */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-400 mb-1">Quantity</p>
          <p className="text-white font-semibold">{position.quantity.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-gray-400 mb-1">Current Price</p>
          <p className="text-white font-semibold">${position.current_price.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-gray-400 mb-1">Entry Price</p>
          <p className="text-white font-semibold">${position.average_entry_price.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-gray-400 mb-1">Entry Value</p>
          <p className="text-white font-semibold">${(position.average_entry_price * position.quantity).toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* P&L */}
      <div className="border-t border-gray-700 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm mb-1">Total P&L</p>
            <p className={`text-2xl font-bold ${pnlColor}`}>
              {pnlAmount >= 0 ? '+' : ''}${pnlAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-sm mb-1">Return %</p>
            <p className={`text-2xl font-bold ${pnlColor}`}>
              {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      {/* Current Value */}
      <div className="bg-gray-900/50 rounded p-3 border border-gray-600">
        <p className="text-xs text-gray-400 mb-1">Current Position Value</p>
        <p className="text-lg font-bold text-white">${(position.current_price * position.quantity).toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
      </div>
    </div>
  );
}

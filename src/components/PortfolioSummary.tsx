'use client';

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

export default function PortfolioSummary({ stats }: { stats: PortfolioStats }) {
  const pnlColor = stats.total_pnl_amount >= 0 ? 'text-green-400' : 'text-red-400';
  const bgColor = stats.total_pnl_amount >= 0 ? 'from-green-500/10' : 'from-red-500/10';

  return (
    <div className="bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border border-blue-500/30 rounded-xl p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">{stats.name}</h2>
        <p className="text-gray-400 text-sm">{stats.currency}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Starting Balance */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-xs mb-1">Starting Balance</p>
          <p className="text-xl font-bold text-white">
            {stats.currency} {stats.initial_balance.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Current Value */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-xs mb-1">Current Value</p>
          <p className="text-xl font-bold text-white">
            {stats.currency} {stats.current_value.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* P&L Amount */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-xs mb-1">Total P&L</p>
          <p className={`text-xl font-bold ${pnlColor}`}>
            {stats.total_pnl_amount >= 0 ? '+' : ''}
            {stats.currency} {stats.total_pnl_amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* P&L % */}
        <div className={`bg-gradient-to-br ${bgColor} to-transparent rounded-lg p-4 border border-${pnlColor.split('-')[2]}-500/30`}>
          <p className="text-gray-400 text-xs mb-1">Return %</p>
          <p className={`text-xl font-bold ${pnlColor}`}>
            {stats.total_pnl_percent >= 0 ? '+' : ''}
            {stats.total_pnl_percent.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Position Counts */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
        <div>
          <p className="text-gray-400 text-sm">Open Positions</p>
          <p className="text-2xl font-bold text-green-400">{stats.open_positions_count}</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Closed Positions</p>
          <p className="text-2xl font-bold text-gray-300">{stats.closed_positions_count}</p>
        </div>
      </div>
    </div>
  );
}

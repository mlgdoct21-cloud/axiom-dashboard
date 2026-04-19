'use client';

interface Signal {
  id: number;
  symbol: string;
  signal_type: string;
  confidence: number;
  reasoning: string;
  price_at_signal: number;
  timestamp: string;
  action_taken: boolean;
  position_id: number | null;
}

export default function SignalHistoryTable({ signals }: { signals: Signal[] }) {
  const getSignalColor = (type: string) => {
    switch (type) {
      case 'BUY':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'SELL':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'HOLD':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border border-blue-500/30 rounded-xl p-6">
      <h3 className="text-xl font-bold text-white mb-6">Signal History</h3>

      {signals && signals.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-semibold">Symbol</th>
                <th className="text-left py-3 px-4 text-gray-400 font-semibold">Signal</th>
                <th className="text-left py-3 px-4 text-gray-400 font-semibold">Confidence</th>
                <th className="text-left py-3 px-4 text-gray-400 font-semibold">Price</th>
                <th className="text-left py-3 px-4 text-gray-400 font-semibold">Action</th>
                <th className="text-left py-3 px-4 text-gray-400 font-semibold">Time</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((signal) => (
                <tr key={signal.id} className="border-b border-gray-800 hover:bg-gray-900/30 transition">
                  <td className="py-4 px-4">
                    <span className="text-white font-semibold">{signal.symbol}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${getSignalColor(signal.signal_type)}`}
                    >
                      {signal.signal_type}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${Math.min(signal.confidence * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-gray-300 text-sm">{(signal.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-gray-300">${signal.price_at_signal.toFixed(2)}</td>
                  <td className="py-4 px-4">
                    {signal.action_taken ? (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                        ✓ Executed
                      </span>
                    ) : signal.position_id ? (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Linked
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-300 border border-gray-500/30">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-gray-400 text-sm">{formatDate(signal.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex items-center justify-center h-40 text-gray-400">
          <p>No signals recorded yet</p>
        </div>
      )}
    </div>
  );
}

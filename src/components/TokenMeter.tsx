import { TokenMetrics } from '@/types';

export function TokenMeter({ metrics }: { metrics: TokenMetrics | null }) {
  if (!metrics) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 bg-opacity-80 text-white p-4 rounded-lg shadow-lg backdrop-blur-sm border border-gray-700">
      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-400">Turn:</span>
          <span className="font-mono text-lg font-bold text-blue-400">
            {metrics.currentTurn}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-400">Tokens Used:</span>
          <span className="font-mono text-lg font-bold text-purple-400">
            {metrics.totalTokensUsed.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-400">Est. Cost:</span>
          <span className="font-mono text-lg font-bold text-green-400">
            ${metrics.estimatedCost.toFixed(4)}
          </span>
        </div>
        {metrics.compressionSavings > 0 && (
          <div className="flex justify-between items-center pt-2 border-t border-gray-700 mt-2">
            <span className="font-semibold text-gray-400">Compression Savings:</span>
            <span className="font-mono text-lg font-bold text-teal-400">
              {metrics.compressionSavings.toLocaleString()} tokens
            </span>
          </div>
        )}
      </div>
    </div>
  );
} 
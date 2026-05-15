import { TrendingUp, TrendingDown } from 'lucide-react';

interface CurrencyPairProps {
  base: string;
  quote: string;
  rate: number;
  change: number;
  changePercent: number;
}

export function CurrencyPair({ base, quote, rate, change, changePercent }: CurrencyPairProps) {
  const isPositive = change > 0;

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-5 border border-yellow-600/20 hover:border-yellow-500/50 transition-all cursor-pointer group hover:shadow-lg hover:shadow-yellow-500/10">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-bold text-xl text-yellow-500">{base}/{quote}</div>
          <div className="text-xs text-gray-400 mt-1">{base} to {quote}</div>
        </div>
        <div className={`p-2 rounded-lg ${isPositive ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
          {isPositive ? (
            <TrendingUp className="w-5 h-5 text-green-400" />
          ) : (
            <TrendingDown className="w-5 h-5 text-red-400" />
          )}
        </div>
      </div>
      <div className="mt-4">
        <div className="text-3xl font-bold text-white">{rate.toFixed(4)}</div>
        <div className={`flex items-center gap-2 mt-2 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          <span className="text-sm font-semibold">
            {isPositive ? '+' : ''}{change.toFixed(4)}
          </span>
          <span className="text-xs px-2 py-1 rounded-md bg-gray-800/50">
            {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
}
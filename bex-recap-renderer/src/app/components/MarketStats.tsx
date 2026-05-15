import { Activity, DollarSign, TrendingUp, Globe } from 'lucide-react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  change?: string;
  isPositive?: boolean;
}

function StatCard({ icon, label, value, change, isPositive }: StatCardProps) {
  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-5 border border-yellow-600/20 hover:border-yellow-500/50 transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20 group-hover:bg-yellow-500/20 transition-colors">
          {icon}
        </div>
        {change && (
          <span className={`text-sm font-bold px-3 py-1 rounded-lg ${isPositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            {change}
          </span>
        )}
      </div>
      <div className="text-3xl font-bold mb-2 text-white">{value}</div>
      <div className="text-sm text-gray-400 uppercase tracking-wider">{label}</div>
    </div>
  );
}

export function MarketStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={<DollarSign className="w-6 h-6 text-yellow-500" />}
        label="Total Volume (24h)"
        value="$6.8T"
        change="+2.4%"
        isPositive={true}
      />
      <StatCard
        icon={<Activity className="w-6 h-6 text-yellow-500" />}
        label="Active Pairs"
        value="180"
        change="+5"
        isPositive={true}
      />
      <StatCard
        icon={<TrendingUp className="w-6 h-6 text-yellow-500" />}
        label="Market Cap"
        value="$2.4T"
        change="+1.8%"
        isPositive={true}
      />
      <StatCard
        icon={<Globe className="w-6 h-6 text-yellow-500" />}
        label="Trading Markets"
        value="165"
      />
    </div>
  );
}